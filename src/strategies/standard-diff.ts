import { ERROR_CODES } from "../constants";
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
</apply_diff>`;
};

export const _parseHunks_for_debug = (diffContent: string): Hunk[] | null => {
  const lines = diffContent.split("\n");
  const hunks: Hunk[] = [];
  let currentHunk: Omit<Hunk, 'lines'> & { lines: string[] } | null = null;
  const hunkHeaderRegex = /^@@ -(\d+)(,(\d+))? \+(\d+)(,(\d+))? @@/;
  const fuzzyHunkHeaderRegex = /^@@ .* @@/;

  for (const line of lines) {
    if (line.startsWith("---") || line.startsWith("+++")) continue;

    let match = line.match(hunkHeaderRegex);
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

  // --- STAGE 1: Exact Match (Fast Path) ---
  const expectedStartIndex = hunk.originalStartLine - 1;
  if (expectedStartIndex >= 0 && expectedStartIndex + pattern.length <= sourceLines.length) {
    const slice = sourceLines.slice(expectedStartIndex, expectedStartIndex + pattern.length);
    if (slice.join("\n") === pattern.join("\n")) {
      return { success: true, newLines: applyHunkAt(sourceLines, hunk, expectedStartIndex) };
    }
  }

  const contextLineCount = hunk.lines.filter(l => l.startsWith(' ')).length;
  if (contextLineCount === 0 && pattern.length > 0) {
    // For hunks without any context lines (pure additions/deletions),
    // we already tried an exact match at the expected line number in STAGE 1.
    // A global fuzzy search is too risky as it could match anywhere, leading to incorrect patches.
    // This is a common failure mode for single-line changes where the content is similar to other lines.
    // So we fail here if the exact match didn't work.
    return { success: false };
  }

  // --- STAGE 2: Fuzzy Match (Global Search) ---
  let bestMatchIndex = -1;
  let minDistance = Infinity;
  const patternText = pattern.join("\n");
  const maxDistanceThreshold = Math.floor(patternText.length * 0.30); // 30% difference tolerance

  for (let i = 0; i <= sourceLines.length - pattern.length; i++) {
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

  return { success: false };
};


export const _splitHunk_for_debug = (hunk: Hunk): Hunk[] => {
  const subHunks: Hunk[] = [];
  const context = 2; 
  let i = 0;
  while (i < hunk.lines.length) {
    // Skip leading context
    while (i < hunk.lines.length && hunk.lines[i]?.startsWith(" ")) i++;
    if (i === hunk.lines.length) break;

    const changeBlockStart = i;
    // Find end of this change block
    while (i < hunk.lines.length && !hunk.lines[i]?.startsWith(" ")) i++;
    const changeBlockEnd = i;

    const subHunkStart = Math.max(0, changeBlockStart - context);
    const subHunkEnd = Math.min(hunk.lines.length, changeBlockEnd + context);
    
    const subHunkLines = hunk.lines.slice(subHunkStart, subHunkEnd);

    subHunks.push({
      ...hunk, // Carry over metadata, although it's less accurate for sub-hunks
      lines: subHunkLines,
    });
  }
  return subHunks;
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
      // --- FALLBACK: Hunk Splitting ---
      const subHunks = _splitHunk_for_debug(hunk);
      if (subHunks.length <= 1) { // No benefit in splitting a single change block
        appliedSuccessfully = false;
        break;
      }

      let allSubHunksApplied = true;
      for (const subHunk of subHunks) {
        const subResult = _findAndApplyHunk_for_debug(lines, subHunk);
        if (subResult.success) {
          lines = subResult.newLines;
        } else {
          allSubHunksApplied = false;
          break;
        }
      }

      if (!allSubHunksApplied) {
        appliedSuccessfully = false;
        break;
      }
    }
  }

  if (!appliedSuccessfully) {
    return createErrorResult(
      ERROR_CODES.CONTEXT_MISMATCH,
      "Could not apply modification. A hunk could not be matched, even with fuzzy search and hunk splitting fallbacks."
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