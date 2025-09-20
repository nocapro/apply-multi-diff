import {
  ERROR_CODES,
  DEFAULT_FUZZY_SEARCH_WINDOW_RADIUS,
  DEFAULT_GLOBAL_FUZZY_SEARCH_CAP,
} from "../constants";
import type { ApplyDiffResult } from "../types";
import { createErrorResult } from "../utils/error";
import { getCommonIndent, levenshtein } from "../utils/string";

export const getToolDescription = (cwd: string): string => {
  return `apply_diff Tool: Search and Replace

Targeted code changes using search/replace blocks. Supports fuzzy matching.

Parameters:
  :file_path: Path to file relative to ${cwd}
  :diff_content: Search/replace blocks
  :start_line: (optional) Line to start search (required for insertions)
  :end_line: (optional) Line to end search
Format:
<<<<< SEARCH
content to find
=======
replacement content
>>>>> REPLACE

Special cases:
- INSERT Insertion (note the empty SEARCH block and \`start_line\`):
<apply_diff file_path="src/app.ts" start_line="5">
  src/app.ts
  <<<<<<< SEARCH
  =======
  // Add a new configuration setting
  const newConfig = initializeNewDependency();
  >>>>>>> REPLACE
</apply_diff>

- current working directory ${cwd}`;
};

const stripLineNumbers = (text: string): string => {
  const lines = text.split("\n");
  const allLinesNumbered = lines
    .filter((line) => line.trim() !== "")
    .every((line) => /^\s*\d+\s*\|/.test(line));
  if (!allLinesNumbered) return text;
  return lines.map((line) => line.replace(/^\s*\d+\s*\|\s?/, "")).join("\n");
};

const cleanBlock = (block: string): string => {
  // This function normalizes the content of a SEARCH or REPLACE block.
  // The content from parsing includes newlines that frame the text.
  // e.g., `\nfoo\nbar\n`. An empty block is `\n`. A block with one blank line is `\n\n`.
  const cleaned = block.replace(/^\r?\n/, "");
  if (cleaned === "\n" || cleaned === "\r\n") {
    // It was `\n\n`, representing a search for a single blank line. Preserve it.
    return cleaned;
  }
  return cleaned.replace(/\r?\n$/, "");
};

type SearchReplaceBlock = { search: string; replace: string };

export const _parseDiff_for_debug = (diffContent: string): SearchReplaceBlock[] | null => {
  const blocks: SearchReplaceBlock[] = [];
  const searchMarker = /^\s*<<<<<<< SEARCH\s*$/m;
  const replaceMarker = /^\s*>>>>>>> REPLACE\s*$/m;

  let content = diffContent;
  const firstLineEnd = content.indexOf("\n");
  if (firstLineEnd !== -1 && !content.substring(0, firstLineEnd).includes("<<<<<<<")) {
    content = content.substring(firstLineEnd + 1);
  }

  while (searchMarker.test(content)) {
    const searchStart = content.search(searchMarker);
    const replaceEndMatch = content.match(replaceMarker);
    if (!replaceEndMatch || typeof replaceEndMatch.index === "undefined") break;
    
    const replaceEnd = replaceEndMatch.index + replaceEndMatch[0].length;
    const blockContent = content.substring(searchStart, replaceEnd);
    
    const parts = blockContent.split(
      /^\s*<<<<<<< SEARCH\s*$|^\s*=======*\s*$|^\s*>>>>>>> REPLACE\s*$/m
    );
    
    if (parts.length >= 4) {
      blocks.push({
        search: stripLineNumbers(cleanBlock(parts[1] ?? '')),
        replace: stripLineNumbers(cleanBlock(parts[2] ?? '')),
      });
    }
    content = content.substring(replaceEnd);
  }

  return blocks.length > 0 ? blocks : null;
};

export const _findBestMatch_for_debug = (
  sourceLines: readonly string[],
  searchLines: readonly string[],
  startLineOpt: number | undefined,
  endLineOpt: number | undefined
): { index: number; distance: number } | null => {
  if (searchLines.length === 0) return null; // Should not happen if called from applyDiff
  
  let effectiveSearchStart: number;
  let effectiveSearchEnd: number;

  if (typeof startLineOpt === "number" || typeof endLineOpt === "number") {
    // If explicit start/end lines are provided, use them
    effectiveSearchStart = (startLineOpt ?? 1) - 1;
    effectiveSearchEnd = endLineOpt ?? sourceLines.length;
  } else {
    // No explicit start/end lines: try to find a reference point to narrow the search
    let referenceIndex = -1;
    
    // For large search blocks, use multiple reference lines for better positioning
    if (searchLines.length > 200) {
      const significantLines = searchLines
        .map((line, index) => ({ line: line.trim(), index }))
        .filter(({ line }) => line.length > 10) // Only consider substantial lines
        .slice(0, 5); // Check first 5 significant lines
        
      for (const { line: searchLine, index: searchLineIndex } of significantLines) {
        for (let i = 0; i < Math.min(sourceLines.length, DEFAULT_GLOBAL_FUZZY_SEARCH_CAP); i++) {
          if (sourceLines[i]?.trim() === searchLine) {
            referenceIndex = i - searchLineIndex; // Adjust for position within search block
            break;
          }
        }
        if (referenceIndex !== -1) break;
      }
    } else {
      const firstSignificantSearchLine = searchLines.find((l) => l.trim().length > 0);
      if (firstSignificantSearchLine) {
        // Find the first exact match of the first significant line of the search pattern
        for (let i = 0; i < sourceLines.length; i++) {
          if (sourceLines[i] === firstSignificantSearchLine) {
            referenceIndex = i;
            break;
          }
        }
      }
    }

    if (referenceIndex !== -1) {
      // Center the search window around the reference point
      effectiveSearchStart = Math.max(0, referenceIndex - DEFAULT_FUZZY_SEARCH_WINDOW_RADIUS);
      effectiveSearchEnd = Math.min(
        sourceLines.length,
        referenceIndex + searchLines.length + DEFAULT_FUZZY_SEARCH_WINDOW_RADIUS
      );
    } else {
      // Fallback: If no reference point, perform fuzzy search only within a capped range from the beginning
      // For large blocks, further restrict the search space
      const searchCap = searchLines.length > 100 ? 
        Math.min(DEFAULT_GLOBAL_FUZZY_SEARCH_CAP, searchLines.length * 2) : 
        DEFAULT_GLOBAL_FUZZY_SEARCH_CAP;
      effectiveSearchStart = 0;
      effectiveSearchEnd = Math.min(sourceLines.length, searchCap);
    }
  }

  // Special case: searching for a single newline (whitespace removal)
  if (searchLines.length === 1 && searchLines[0] === '') {
    // Look for a blank line in the source within the search range
    for (let i = effectiveSearchStart; i < Math.min(effectiveSearchEnd, sourceLines.length); i++) {
      if (sourceLines[i] === '') {
        return { index: i, distance: 0 };
      }
    }
    return null;
  }
  
  // Validate the search range before starting the main loop
  const maxSearchIndex = effectiveSearchEnd - searchLines.length;
  if (effectiveSearchStart > maxSearchIndex || effectiveSearchStart < 0) {
    return null; // Search block is larger than the search window, or invalid range
  }

  // For large search blocks, use more efficient matching strategies
  if (searchLines.length > 200) {
    return findLargeBlockMatch(sourceLines, searchLines, effectiveSearchStart, maxSearchIndex);
  }

  let bestMatchIndex = -1;
  let minDistance = Infinity;
  const searchText = searchLines.join("\n");
  const trimmedSearchText = searchLines.map(l => l.trim()).join('\n');

  for (let i = effectiveSearchStart; i <= maxSearchIndex; i++) {
    const slice = sourceLines.slice(i, i + searchLines.length);
    // Compare trimmed content to be indentation-agnostic
    const trimmedSliceText = slice.map(l => l.trim()).join('\n');
    const distance = levenshtein(trimmedSearchText, trimmedSliceText);
    if (distance < minDistance) {
      minDistance = distance;
      bestMatchIndex = i;
    }
    if (distance === 0) break;
  }
  if (bestMatchIndex === -1) {
    return null;
  }
  
  const maxDistanceThreshold = Math.floor(searchText.length * 0.35);
  if (minDistance > maxDistanceThreshold) {
    return null;
  }

  if (minDistance > 0) {
    // A potential fuzzy match was found, now apply stricter semantic checks.
    const slice = sourceLines.slice(bestMatchIndex, bestMatchIndex + searchLines.length);
    const sliceText = slice.join('\n');

    const stripComments = (text: string) => text.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '').trim();

    const searchCode = stripComments(searchText);
    const sliceCode = stripComments(sliceText);

    // SEMANTIC CHECK 1: Numeric literals must match exactly in code.
    const searchNumbers = searchCode.match(/\d+(\.\d+)?/g) || [];
    const sliceNumbers = sliceCode.match(/\d+(\.\d+)?/g) || [];
    // Only fail if there are numbers and they don't match.
    if (searchNumbers.length > 0 && searchNumbers.join(',') !== sliceNumbers.join(',')) {
        return null;
    }
    
    // SEMANTIC CHECK 2: Don't match if it's a likely identifier substitution.
    const searchWords = new Set(searchCode.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || []);
    const sliceWords = new Set(sliceCode.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || []);
    const diffSearch = [...searchWords].filter(w => !sliceWords.has(w) && w.length > 1);
    const diffSlice = [...sliceWords].filter(w => !searchWords.has(w) && w.length > 1);
    if (diffSearch.length > 0 && diffSlice.length > 0 && diffSearch.length === diffSlice.length) {
        return null; // This indicates a likely 1-to-1 substitution of identifiers.
    }

    // SEMANTIC CHECK 3: Be more lenient with string literal content.
    const searchStrings = searchCode.match(/["'](.*?)["']/g) || [];
    const sliceStrings = sliceCode.match(/["'](.*?)["']/g) || [];
    if (searchStrings.length === sliceStrings.length && searchStrings.length > 0) {
      const searchWithoutStrings = searchCode.replace(/["'](.*?)["']/g, '""');
      const sliceWithoutStrings = sliceCode.replace(/["'](.*?)["']/g, '""');
      // If the code is nearly identical outside of the string literals...
      if (levenshtein(searchWithoutStrings, sliceWithoutStrings) <= 2) {
        // ...then check if the string change itself is minor or major.
        const allSearchStrings = searchStrings.join('');
        const allSliceStrings = sliceStrings.join('');
        if (levenshtein(allSearchStrings, allSliceStrings) > Math.floor(allSearchStrings.length * 0.5)) {
            return null; // The string content changed too much, likely a semantic change.
        }
      }
    }
  }

  return { index: bestMatchIndex, distance: minDistance };
};

// Optimized matching for large search blocks
const findLargeBlockMatch = (
  sourceLines: readonly string[],
  searchLines: readonly string[],
  searchStart: number,
  maxSearchIndex: number
): { index: number; distance: number } | null => {
  // For large blocks, use a multi-phase approach:
  // 1. Find potential matches using first/last line anchors
  // 2. Quick content-based filtering 
  // 3. Only do expensive Levenshtein on promising candidates

  const searchFirstLine = searchLines[0]?.trim() || '';
  const searchLastLine = searchLines[searchLines.length - 1]?.trim() || '';
  const searchMiddleLine = searchLines[Math.floor(searchLines.length / 2)]?.trim() || '';
  
  const candidates: number[] = [];
  
  // Phase 1: Find positions where first and last lines could match
  for (let i = searchStart; i <= maxSearchIndex; i++) {
    const sourceFirstLine = sourceLines[i]?.trim() || '';
    const sourceLastLine = sourceLines[i + searchLines.length - 1]?.trim() || '';
    const sourceMiddleLine = sourceLines[i + Math.floor(searchLines.length / 2)]?.trim() || '';
    
    // Quick similarity check on key lines - be more lenient for large blocks
    const firstSimilar = quickSimilarity(searchFirstLine, sourceFirstLine) > 0.6;
    const lastSimilar = quickSimilarity(searchLastLine, sourceLastLine) > 0.6;
    const middleSimilar = quickSimilarity(searchMiddleLine, sourceMiddleLine) > 0.6;
    
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
      if (quickSimilarity(searchFirstLine, sourceFirstLine) > 0.3 || 
          (searchFirstLine.length > 10 && sourceFirstLine.includes(searchFirstLine.substring(0, Math.min(10, searchFirstLine.length))))) {
        candidates.push(i);
      }
    }
  }
  
  // Phase 2: Evaluate candidates with full comparison
  let bestMatchIndex = -1;
  let minDistance = Infinity;
  const trimmedSearchText = searchLines.map(l => l.trim()).join('\n');
  
  for (const candidateIndex of candidates) {
    const slice = sourceLines.slice(candidateIndex, candidateIndex + searchLines.length);
    const trimmedSliceText = slice.map(l => l.trim()).join('\n');
    
    // Use a faster approximate distance for large blocks
    const distance = approximateDistance(trimmedSearchText, trimmedSliceText);
    
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
  
  // Use a more lenient threshold for large blocks, but still apply semantic checks
  const searchText = searchLines.join("\n");
  // For very large blocks, be even more lenient with distance threshold
  const distanceRatio = searchLines.length > 100 ? 0.6 : 0.4;
  const maxDistanceThreshold = Math.floor(searchText.length * distanceRatio);
  if (minDistance > maxDistanceThreshold) {
    return null;
  }
  
  // Apply the same semantic checks as the regular algorithm for consistency
  if (minDistance > 0) {
    const slice = sourceLines.slice(bestMatchIndex, bestMatchIndex + searchLines.length);
    const sliceText = slice.join('\n');

    const stripComments = (text: string) => text.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '').trim();

    const searchCode = stripComments(searchText);
    const sliceCode = stripComments(sliceText);

    // SEMANTIC CHECK 1: Numeric literals must match exactly in code.
    const searchNumbers = searchCode.match(/\d+(\.\d+)?/g) || [];
    const sliceNumbers = sliceCode.match(/\d+(\.\d+)?/g) || [];
    if (searchNumbers.length > 0 && searchNumbers.join(',') !== sliceNumbers.join(',')) {
        return null;
    }
    
    // SEMANTIC CHECK 2: Don't match if it's a likely identifier substitution.
    const searchWords = new Set(searchCode.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || []);
    const sliceWords = new Set(sliceCode.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || []);
    const diffSearch = [...searchWords].filter(w => !sliceWords.has(w) && w.length > 1);
    const diffSlice = [...sliceWords].filter(w => !searchWords.has(w) && w.length > 1);
    if (diffSearch.length > 0 && diffSlice.length > 0 && diffSearch.length === diffSlice.length) {
        return null;
    }
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

export const applyDiff = (
  original_content: string,
  diff_content: string,
  options: { start_line?: number; end_line?: number } = {}
): ApplyDiffResult => {
  const blocks = _parseDiff_for_debug(diff_content);
  if (!blocks) {
    return createErrorResult(
      ERROR_CODES.INVALID_DIFF_FORMAT,
      "Invalid diff format. Could not parse any '<<<<<<< SEARCH'...'>>>>>>> REPLACE' blocks."
    );
  }

  let currentContent = original_content;

  for (const block of blocks) {
    if (block.search === "") {
      // Pure insertion
      if (typeof options.start_line !== "number") {
        return createErrorResult(
          ERROR_CODES.INSERTION_REQUIRES_LINE_NUMBER,
          "Insertion requires a start_line. A SEARCH block was empty, but no start_line was provided."
        );
      }
      // Special case for inserting into an empty file
      if (currentContent === "") {
        currentContent = block.replace;
        continue;
      }

      const lines = currentContent.split("\n");
      const insertionIndex = Math.max(0, options.start_line - 1);

      // Infer indentation from the insertion line or surrounding lines
      let indent = "";
      if (insertionIndex < lines.length) {
        const currentLine = lines[insertionIndex];
        const currentLineIndent = currentLine?.match(/^[ \t]*/)?.[0] || "";
        if (insertionIndex > 0) {
          const prevLine = lines[insertionIndex - 1];
          const prevLineIndent = prevLine?.match(/^[ \t]*/)?.[0] || "";
          const prevLineTrimmed = prevLine?.trim() ?? '';
          // If current line is an outdent (like a closing brace), use previous line's indent
          if (prevLineIndent.length > currentLineIndent.length && (currentLine?.trim()?.length ?? 0) > 0) {
            indent = prevLineIndent;
          } else if (prevLineTrimmed.endsWith('{') || prevLineTrimmed.endsWith('[') || prevLineTrimmed.endsWith('(')) {
            // If previous line opens a block, indent by 4 spaces (common practice)
            indent = prevLineIndent + '    ';
          } else {
            indent = currentLineIndent;
          }
        } else {
          indent = currentLineIndent;
        }
      } else if (lines.length > 0) {
        // If inserting at the very end, use indent of last line
        const lastLine = lines[lines.length - 1];
        indent = lastLine?.match(/^[ \t]*/)?.[0] || "";
      }

      const replaceLines = block.replace.split('\n');
      const replaceBaseIndent = getCommonIndent(block.replace);
      
      const reindentedReplaceLines = replaceLines.map(line => {
          if (line.trim() === "") return line;
          const dedentedLine = line.startsWith(replaceBaseIndent)
            ? line.substring(replaceBaseIndent.length)
            : line;
          return indent + dedentedLine;
      });

      lines.splice(insertionIndex, 0, ...reindentedReplaceLines);
      currentContent = lines.join("\n");
      continue;
    }

    const sourceLines = currentContent.split("\n");
    // If block.search is just a newline, it means we are searching for a single blank line.
    let searchLines: string[];
    if (/^\n+$/.test(block.search)) {
      // A search for N blank lines is represented by N \n's. This becomes an array of N empty strings.
      searchLines = Array(block.search.length).fill('');
    } else {
      searchLines = block.search.split("\n");
    }
    const match = _findBestMatch_for_debug(sourceLines, searchLines, options.start_line ?? 1, options.end_line ?? sourceLines.length);

    if (match === null) {
      return createErrorResult(
        ERROR_CODES.SEARCH_BLOCK_NOT_FOUND,
        "Search block not found in the original content. The content to be replaced could not be located in the file, even with fuzzy matching."
      );
    }
    
    const { index: matchStartIndex } = match;
    const matchEndIndex = matchStartIndex + searchLines.length;
    
    const sourceMatchBlock = sourceLines.slice(matchStartIndex, matchEndIndex).join('\n');
    const sourceMatchIndent = getCommonIndent(sourceMatchBlock);

    const replaceLines = block.replace ? block.replace.split('\n') : [];
    
    // For large blocks with complex indentation, use a more sophisticated approach
    let reindentedReplaceLines: string[];
    
    if (searchLines.length > 200) {
      // For large blocks, preserve exact relative indentation structure
      // Find the minimum indentation in the replacement block (excluding empty lines)
      const nonEmptyReplaceLines = replaceLines.filter(line => line.trim() !== "");
      if (nonEmptyReplaceLines.length === 0) {
        reindentedReplaceLines = replaceLines;
      } else {
        const replaceBaseIndent = nonEmptyReplaceLines.reduce((shortest, line) => {
          const currentIndent = line.match(/^[ \t]*/)?.[0] || "";
          return currentIndent.length < shortest.length ? currentIndent : shortest;
        }, nonEmptyReplaceLines[0]?.match(/^[ \t]*/)?.[0] || "");
        
        // For each line, calculate its relative indentation and reapply with source indent
        reindentedReplaceLines = replaceLines.map(line => {
          if (line.trim() === "") return line; // Preserve empty lines
          
          const lineIndent = line.match(/^[ \t]*/)?.[0] || "";
          const lineContent = line.substring(lineIndent.length);
          
          // Calculate relative indentation beyond the base
          let relativeIndent = "";
          if (lineIndent.startsWith(replaceBaseIndent)) {
            relativeIndent = lineIndent.substring(replaceBaseIndent.length);
          }
          
          return sourceMatchIndent + relativeIndent + lineContent;
        });
      }
    } else {
      // For smaller blocks, use the original logic
      const replaceBaseIndent = getCommonIndent(block.replace);
      reindentedReplaceLines = replaceLines.map(line => {
        if (line.trim() === "") return line; // Preserve empty lines in replacement
        const dedentedLine = line.startsWith(replaceBaseIndent)
          ? line.substring(replaceBaseIndent.length)
          : line;
        return sourceMatchIndent + dedentedLine;
      });
    }

    const newSourceLines = [
      ...sourceLines.slice(0, matchStartIndex),
      ...reindentedReplaceLines,
      ...sourceLines.slice(matchEndIndex)
    ];

    currentContent = newSourceLines.join("\n");
  }

  return { success: true, content: currentContent };
};