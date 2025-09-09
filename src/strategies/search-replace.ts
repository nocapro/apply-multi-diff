import { ERROR_CODES } from "../constants";
import type { ApplyDiffResult } from "../types";
import { createErrorResult } from "../utils/error";
import { getCommonIndent, levenshtein, dedent } from "../utils/string";

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
  startLine: number,
  endLine: number
): { index: number; distance: number } | null => {
  if (searchLines.length === 0) return null; // Should not happen if called from applyDiff
  
  const searchStart = startLine - 1;
  const searchEnd = endLine ?? sourceLines.length;

  // Special case: searching for a single newline (whitespace removal)
  if (searchLines.length === 1 && searchLines[0] === '') {
    // Look for a blank line in the source within the search range
    for (let i = searchStart; i < Math.min(searchEnd, sourceLines.length); i++) {
      if (sourceLines[i] === '') {
        return { index: i, distance: 0 };
      }
    }
    return null;
  }

  let bestMatchIndex = -1;
  let minDistance = Infinity;
  const searchText = searchLines.join("\n");
  const trimmedSearchText = searchLines.map(l => l.trim()).join('\n');

  // Only search within the specified range
  const actualSearchEnd = Math.min(searchEnd, sourceLines.length);
  const maxSearchIndex = actualSearchEnd - searchLines.length;
  
  // If the search range is invalid, return null
  if (searchStart > maxSearchIndex || searchStart < 0) {
    return null;
  }

  for (let i = searchStart; i <= maxSearchIndex; i++) {
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
    const replaceBaseIndent = getCommonIndent(block.replace);
    
    // Standard replacement with indentation. The complex single-line logic was buggy.
    // This is simpler and more reliable.
    const reindentedReplaceLines = replaceLines.map(line => {
        if (line.trim() === "") return line; // Preserve empty lines in replacement
          const dedentedLine = line.startsWith(replaceBaseIndent)
            ? line.substring(replaceBaseIndent.length)
            : line;
          return sourceMatchIndent + dedentedLine;
        });

    const newSourceLines = [
      ...sourceLines.slice(0, matchStartIndex),
      ...reindentedReplaceLines,
      ...sourceLines.slice(matchEndIndex)
    ];

    currentContent = newSourceLines.join("\n");
  }

  return { success: true, content: currentContent };
};