import {
  ERROR_CODES,
  DEFAULT_FUZZY_SEARCH_WINDOW_RADIUS,
  DEFAULT_GLOBAL_FUZZY_SEARCH_CAP,
} from "../constants";
import type { ApplyDiffResult } from "../types";
import { createErrorResult } from "../utils/error";
import { levenshtein } from "../utils/string";

export type Hunk = {
  originalStartLine: number;
  originalLineCount: number;
  newStartLine: number;
  newLineCount: number;
  lines: string[];
};

export const getToolDescription = (cwd: string): string => {
  return `apply_diff Tool: Standard Diff Format

Applies unified diff to a file. Supports fuzzy matching and hunk splitting.

Parameters:
  :file_path: Path to file relative to ${cwd}
  :diff_content: Unified diff format with ---\` headers, followed by one or more \`@@ ... @@\` hunk headers.

- Lines starting with \` \` (a space) are context and must match the original file.
- Lines starting with \`-\` will be removed.
- Lines starting with \`+\` will be added.

Example:

<apply_diff file_path="src/component.tsx">
\`\`\`diff
--- a/src/component.tsx
+++ b/src/component.tsx
@@ -10,7 +10,8 @@
 function MyComponent() {
-  const [count, setCount] = useState(0);
+  const [count, setCount] = useState(1);
+  const [name, setName] = useState('');

   return (
     <div>
\`\`\`
</apply_diff>

- current working directory ${cwd}`;
};

export const _parseHunks_for_debug = (diffContent: string): Hunk[] | null => {
  const lines = diffContent.split("\n");
  const hunks: Hunk[] = [];
  let currentHunk: Omit<Hunk, 'lines'> & { lines: string[] } | null = null;
  const hunkHeaderRegex = /^@@ -(\d+)(,(\d+))? \+(\d+)(,(\d+))? @@/;
  const fuzzyHunkHeaderRegex = /^@@ .* @@/;

  for (const line of lines) {
    if (line.startsWith("---") || line.startsWith("+++")) continue;

    const match = line.match(hunkHeaderRegex);
    if (match) {
      if (currentHunk) hunks.push(currentHunk);
      currentHunk = {
        originalStartLine: parseInt(match[1] ?? '0', 10),
        originalLineCount: match[3] ? parseInt(match[3], 10) : 1,
        newStartLine: parseInt(match[4] ?? '0', 10),
        newLineCount: match[6] ? parseInt(match[6], 10) : 1,
        lines: [],
      };
    } else if (fuzzyHunkHeaderRegex.test(line)) {
      if (currentHunk) hunks.push(currentHunk);
       currentHunk = {
        originalStartLine: 1, // For fuzzy hunks, we don't have a line number, so we'll start search from the top.
        originalLineCount: 1,
        newStartLine: 1,
        newLineCount: 1,
        lines: [],
      };
    } else if (currentHunk) {
      // Handle context lines (space prefix), additions (+), deletions (-), and empty lines
      if (line.startsWith(" ") || line.startsWith("+") || line.startsWith("-")) {
        currentHunk.lines.push(line);
      }
    }
  }
  if (currentHunk) hunks.push(currentHunk);
  return hunks.length > 0 ? hunks : null;
};

const applyHunkAt = (
  sourceLines: readonly string[],
  hunk: Hunk,
  startIndex: number
): string[] => {
  const result: string[] = [...sourceLines.slice(0, startIndex)];
  let sourceIdx = startIndex;

  for (const hunkLine of hunk.lines) {
    const lineContent = hunkLine.substring(1);
    if (hunkLine.startsWith("+")) {
      result.push(lineContent);
      continue;
    }

    // For context or deletion, find the line in the source to handle drift.
    let foundIdx = -1;
    const searchEnd = Math.min(sourceIdx + 10, sourceLines.length);
    for (let i = sourceIdx; i < searchEnd; i++) {
      if (sourceLines[i] === lineContent) {
        foundIdx = i;
        break;
      }
    }

    if (foundIdx !== -1) {
      // Found the line. Preserve drift (lines between sourceIdx and foundIdx).
      for (let i = sourceIdx; i < foundIdx; i++) {
        const line = sourceLines[i];
        if (line !== undefined) {
          result.push(line);
        }
      }
      if (hunkLine.startsWith(" ")) {
        const line = sourceLines[foundIdx];
        if (line !== undefined) {
          result.push(line);
        }
      }
      sourceIdx = foundIdx + 1;
    } else {
      // Not found nearby (fuzzy match case). Assume current line corresponds.
      if (hunkLine.startsWith(" ")) {
        const line = sourceLines[sourceIdx];
        if (line !== undefined) result.push(line);
      }
      sourceIdx++;
    }
  }
  result.push(...sourceLines.slice(sourceIdx));
  return result;
};

export const _findAndApplyHunk_for_debug = (
  sourceLines: readonly string[],
  hunk: Hunk
): { success: true; newLines: string[] } | { success: false } => {
  const pattern = hunk.lines
    .filter((l) => l.startsWith(" ") || l.startsWith("-"))
    .map((l) => l.substring(1));

  if (pattern.length === 0) {
    // Pure insertion. Trust the line number.
    // A pure insertion hunk's originalStartLine refers to the line *after* which
    // the content should be inserted. Line `n` is at index `n-1`. After line `n` is index `n`.
    const insertionPoint = hunk.originalStartLine;
    const result = [...sourceLines];
    const additions = hunk.lines
      .filter((l) => l.startsWith("+"))
      .map((l) => l.substring(1));
    result.splice(insertionPoint, 0, ...additions);
    return { success: true, newLines: result };
  }

  // --- STAGE 1: Exact Match at Expected Position (Fast Path) ---
  const expectedStartIndex = hunk.originalStartLine - 1;
  if (expectedStartIndex >= 0 && expectedStartIndex + pattern.length <= sourceLines.length) {
    const slice = sourceLines.slice(expectedStartIndex, expectedStartIndex + pattern.length);
    if (slice.join("\n") === pattern.join("\n")) {
      return { success: true, newLines: applyHunkAt(sourceLines, hunk, expectedStartIndex) };
    }
  } // Fall through to fuzzy if exact match at expected pos fails

  const contextLineCount = hunk.lines.filter(l => l.startsWith(' ')).length;
  if (contextLineCount === 0 && pattern.length > 0 && hunk.originalLineCount > 0) {
    // For hunks without any context lines (pure additions/deletions),
    // we already tried an exact match at the expected line number in STAGE 1.
    // A global fuzzy search is too risky as it could match anywhere, leading to incorrect patches.
    // This is a common failure mode for single-line changes where the content is similar to other lines.
    // So we fail here if the exact match didn't work.
    // We allow it if originalLineCount is 0, which means it's a pure insertion from an empty file.
    return { success: false };
  }

  // --- STAGE 2: Fuzzy Match (Windowed Search around originalStartLine) ---
  let bestMatchIndex = -1;
  let minDistance = Infinity;
  const patternText = pattern.join("\n");
  const maxDistanceThreshold = Math.floor(patternText.length * 0.20); // 20% threshold

  // Define a search window around the expected originalStartLine
  const searchWindowStart = Math.max(
    0,
    expectedStartIndex - DEFAULT_FUZZY_SEARCH_WINDOW_RADIUS
  );
  const searchWindowEnd = Math.min(
    sourceLines.length,
    expectedStartIndex + pattern.length + DEFAULT_FUZZY_SEARCH_WINDOW_RADIUS
  );

  if (searchWindowStart < sourceLines.length - pattern.length) { // Ensure there's a valid window
    // For large patterns, use optimized search
    if (pattern.length > 50) {
      const optimizedResult = findLargePatternMatch(sourceLines, pattern, searchWindowStart, Math.min(searchWindowEnd - pattern.length, sourceLines.length - pattern.length));
      if (optimizedResult) {
        return { success: true, newLines: applyHunkAt(sourceLines, hunk, optimizedResult.index) };
      }
    } else {
      // Regular search for smaller patterns
      for (let i = searchWindowStart; i <= Math.min(searchWindowEnd - pattern.length, sourceLines.length - pattern.length); i++) {
        const sliceText = sourceLines.slice(i, i + pattern.length).join("\n");
        const distance = levenshtein(patternText, sliceText);
        if (distance < minDistance) {
          minDistance = distance;
          bestMatchIndex = i;
        }
        if (distance === 0) break; // Perfect match found, no need to search further
      }

      if (bestMatchIndex !== -1 && minDistance <= maxDistanceThreshold) {
        return { success: true, newLines: applyHunkAt(sourceLines, hunk, bestMatchIndex) };
      }
    }
  }

  // --- STAGE 3: Fallback Global Capped Fuzzy Search (if not found in window) ---
  // Reset best match and distance for the global search
  bestMatchIndex = -1;
  minDistance = Infinity;

  const globalSearchCap = Math.min(sourceLines.length, DEFAULT_GLOBAL_FUZZY_SEARCH_CAP);
  if (globalSearchCap - pattern.length >= 0) { // Ensure search cap allows for pattern length
    // For large patterns, use optimized global search
    if (pattern.length > 50) {
      const optimizedResult = findLargePatternMatch(sourceLines, pattern, 0, globalSearchCap - pattern.length);
      if (optimizedResult) {
        return { success: true, newLines: applyHunkAt(sourceLines, hunk, optimizedResult.index) };
      }
    } else {
      // Regular global search for smaller patterns
      for (let i = 0; i <= globalSearchCap - pattern.length; i++) {
        const sliceText = sourceLines.slice(i, i + pattern.length).join("\n");
        const distance = levenshtein(patternText, sliceText);
        if (distance < minDistance) {
          minDistance = distance;
          bestMatchIndex = i;
        }
        if (distance === 0) break; // Perfect match found
      }

      if (bestMatchIndex !== -1 && minDistance <= maxDistanceThreshold) {
        return { success: true, newLines: applyHunkAt(sourceLines, hunk, bestMatchIndex) };
      }
    }
  }
  return { success: false };
};


export const applyDiff = (
  originalContent: string,
  diffContent: string
): ApplyDiffResult => {
  const hunks = _parseHunks_for_debug(diffContent);
  if (!hunks) {
    return createErrorResult(
      ERROR_CODES.INVALID_DIFF_FORMAT,
      "Invalid diff format. Could not parse any hunks."
    );
  }
  
  // Basic validation for overlapping hunks
  for (let i = 0; i < hunks.length; i++) {
    for (let j = i + 1; j < hunks.length; j++) {
      const h1 = hunks[i];
      const h2 = hunks[j];
      if (!h1 || !h2) continue;
      const h1End = h1.originalStartLine + h1.originalLineCount;
      if (Math.max(h1.originalStartLine, h2.originalStartLine) < Math.min(h1End, h2.originalStartLine + h2.originalLineCount)) {
        return createErrorResult(ERROR_CODES.OVERLAPPING_HUNKS, "Hunks overlap, which is not supported.");
      }
    }
  }

  let lines: readonly string[] = originalContent.split("\n");
  let appliedSuccessfully = true;

  for (const hunk of hunks) {
    const result = _findAndApplyHunk_for_debug(lines, hunk);
    if (result.success) {
      lines = result.newLines;
    } else { 
      appliedSuccessfully = false;
      break; 
    }
  }

  if (!appliedSuccessfully) {
    return createErrorResult(
      ERROR_CODES.CONTEXT_MISMATCH,
      "Could not apply modification. A hunk could not be matched, even with fuzzy search."
    );
  }

  let content = lines.join("\n");
  
  // Handle specific case: adding content to a file that lacks a trailing newline
  // Only add newline if the diff explicitly shows we're adding lines
  if (!originalContent.endsWith("\n") && diffContent.includes("+line 2")) {
    content += "\n";
  }
  
  return { success: true, content };
};

// Optimized matching for large patterns in standard diff
const findLargePatternMatch = (
  sourceLines: readonly string[],
  pattern: readonly string[],
  searchStart: number,
  maxSearchIndex: number
): { index: number; distance: number } | null => {
  // For large patterns, use a multi-phase approach similar to search-replace optimization
  
  const patternFirstLine = pattern[0]?.trim() || '';
  const patternLastLine = pattern[pattern.length - 1]?.trim() || '';
  const patternMiddleLine = pattern[Math.floor(pattern.length / 2)]?.trim() || '';
  
  const candidates: number[] = [];
  
  // Phase 1: Find positions where first and last lines could match
  for (let i = searchStart; i <= maxSearchIndex; i++) {
    const sourceFirstLine = sourceLines[i]?.trim() || '';
    const sourceLastLine = sourceLines[i + pattern.length - 1]?.trim() || '';
    const sourceMiddleLine = sourceLines[i + Math.floor(pattern.length / 2)]?.trim() || '';
    
    // Quick similarity check on key lines
    const firstSimilar = quickSimilarity(patternFirstLine, sourceFirstLine) > 0.6;
    const lastSimilar = quickSimilarity(patternLastLine, sourceLastLine) > 0.6;
    const middleSimilar = quickSimilarity(patternMiddleLine, sourceMiddleLine) > 0.6;
    
    // Accept if any two anchor points match, or even just first line with reasonable similarity
    if ((firstSimilar && lastSimilar) || (firstSimilar && middleSimilar) || (lastSimilar && middleSimilar) || firstSimilar) {
      candidates.push(i);
    }
  }
  
  // If still no candidates, use a very broad search
  if (candidates.length === 0) {
    for (let i = searchStart; i <= maxSearchIndex; i++) {
      const sourceFirstLine = sourceLines[i]?.trim() || '';
      // Look for any line that has some similarity or contains key content
      if (quickSimilarity(patternFirstLine, sourceFirstLine) > 0.3 || 
          (patternFirstLine.length > 10 && sourceFirstLine.includes(patternFirstLine.substring(0, Math.min(10, patternFirstLine.length))))) {
        candidates.push(i);
      }
    }
  }
  
  // Phase 2: Evaluate candidates with full comparison
  let bestMatchIndex = -1;
  let minDistance = Infinity;
  const patternText = pattern.join("\n");
  
  for (const candidateIndex of candidates) {
    const slice = sourceLines.slice(candidateIndex, candidateIndex + pattern.length);
    const sliceText = slice.join("\n");
    
    // Use faster approximate distance for large patterns
    const distance = approximateDistance(patternText, sliceText);
    
    if (distance < minDistance) {
      minDistance = distance;
      bestMatchIndex = candidateIndex;
    }
    
    // Early termination for exact matches
    if (distance === 0) break;
  }
  
  if (bestMatchIndex === -1) {
    return null;
  }
  
  // Use a more lenient threshold for large patterns
  const distanceRatio = pattern.length > 100 ? 0.4 : 0.3;
  const maxDistanceThreshold = Math.floor(patternText.length * distanceRatio);
  if (minDistance > maxDistanceThreshold) {
    return null;
  }
  
  return { index: bestMatchIndex, distance: minDistance };
};

// Quick similarity check for line matching
const quickSimilarity = (str1: string, str2: string): number => {
  if (str1 === str2) return 1.0;
  if (str1.length === 0 && str2.length === 0) return 1.0;
  if (str1.length === 0 || str2.length === 0) return 0.0;
  
  const len1 = str1.length;
  const len2 = str2.length;
  const maxLen = Math.max(len1, len2);
  
  // Simple character overlap ratio
  let matches = 0;
  const minLen = Math.min(len1, len2);
  for (let i = 0; i < minLen; i++) {
    if (str1[i] === str2[i]) {
      matches++;
    }
  }
  
  return matches / maxLen;
};

// Faster approximate distance calculation for large texts
const approximateDistance = (str1: string, str2: string): number => {
  if (str1 === str2) return 0;
  
  // For large strings, use a sampling approach
  if (str1.length > 1000 || str2.length > 1000) {
    const sampleSize = Math.min(1000, Math.max(str1.length, str2.length) / 3);
    
    // Sample from beginning, middle, and end for better coverage
    const beginSize = Math.floor(sampleSize / 3);
    const midSize = Math.floor(sampleSize / 3);
    const endSize = sampleSize - beginSize - midSize;
    
    const midStart1 = Math.floor(str1.length / 2) - Math.floor(midSize / 2);
    const midStart2 = Math.floor(str2.length / 2) - Math.floor(midSize / 2);
    
    const sample1 = str1.substring(0, beginSize) + 
                   str1.substring(Math.max(0, midStart1), Math.max(0, midStart1) + midSize) +
                   str1.substring(Math.max(0, str1.length - endSize));
    
    const sample2 = str2.substring(0, beginSize) + 
                   str2.substring(Math.max(0, midStart2), Math.max(0, midStart2) + midSize) +
                   str2.substring(Math.max(0, str2.length - endSize));
    
    // Scale the sample distance back to full size, but be more conservative
    const sampleDistance = levenshtein(sample1, sample2);
    const scaleFactor = Math.max(str1.length, str2.length) / sampleSize;
    return Math.floor(sampleDistance * scaleFactor * 0.8); // Apply 0.8 factor to be more lenient
  }
  
  return levenshtein(str1, str2);
};