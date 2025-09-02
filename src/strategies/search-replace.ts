import { ERROR_CODES } from "../constants";
import type { ApplyDiffResult } from "../types";
import { createErrorResult } from "../utils/error";
import { getCommonIndent, levenshtein, dedent } from "../utils/string";

export const getToolDescription = (cwd: string): string => {
  return `apply_diff Tool: Search and Replace

Applies a targeted code change to a single file using a search-and-replace format. This is ideal for precise modifications, insertions, or deletions of specific code blocks. It supports fuzzy matching and multiple replacements in a single call.

Parameters:
  :file_path: (required) The path to the file to modify, relative to the current working directory ${cwd}.
  :diff_content: (required) A string containing one or more search and replace blocks.
  :start_line: (optional) The line number in the original file where the search block is expected to start. Use this to resolve ambiguity when the same code appears multiple times. Required for insertions.
  :end_line: (optional) The line number in the original file where the search block is expected to end.

Format Requirements:
The \`diff_content\` must follow this structure. You can include multiple blocks.

<file_path_ignored_but_useful_for_context>
<<<<<<< SEARCH
[content to find and replace]
=======
[new content to insert]
>>>>>>> REPLACE

Special Cases:
- To INSERT code, leave the SEARCH block empty and provide a \`start_line\`. The new code will be inserted before that line.
- To DELETE code, leave the REPLACE block empty.

Examples:

1. Fuzzy Replace (will match even if comments are slightly different):
<apply_diff file_path="src/utils.ts">
  src/utils.ts
  <<<<<<< SEARCH
  // old function
  function oldFunction() {
    return 1;
  }
  =======
  // new, improved function
  function newFunction() {
    return 2;
  }
  >>>>>>> REPLACE
</apply_diff>

2. Insertion (note the empty SEARCH block and \`start_line\`):
<apply_diff file_path="src/app.ts" start_line="5">
  src/app.ts
  <<<<<<< SEARCH
  =======
  // Add a new configuration setting
  const newConfig = initializeNewDependency();
  >>>>>>> REPLACE
</apply_diff>`;
};

const stripLineNumbers = (text: string): string => {
  const lines = text.split("\n");
  const allLinesNumbered = lines
    .filter((line) => line.trim() !== "")
    .every((line) => /^\s*\d+\s*\|/.test(line));
  if (!allLinesNumbered) return text;
  return lines.map((line) => line.replace(/^\s*\d+\s*\|\s?/, "")).join("\n");
};

const cleanBlock = (block: string) =>
  block.replace(/^\r?\n/, "").replace(/\r?\n?$/, "");

type SearchReplaceBlock = { search: string; replace: string };

const parseDiff = (diffContent: string): SearchReplaceBlock[] | null => {
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
        search: stripLineNumbers(cleanBlock(parts[1])),
        replace: stripLineNumbers(cleanBlock(parts[2])),
      });
    }
    content = content.substring(replaceEnd);
  }

  return blocks.length > 0 ? blocks : null;
};

const findBestMatch = (
  sourceLines: readonly string[],
  searchLines: readonly string[],
  startLine: number,
  endLine: number
): { index: number; distance: number } | null => {
  if (searchLines.length === 0) return null;

  let bestMatchIndex = -1;
  let minDistance = Infinity;
  const searchText = searchLines.join("\n");
  const dedentedSearchText = dedent(searchText);
  const maxDistanceThreshold = Math.max(
    5, // a minimum for short blocks
    Math.floor(dedentedSearchText.length * 0.3) // 30% tolerance for fuzzy matching
  );

  const searchStart = startLine - 1;
  const searchEnd = endLine ?? sourceLines.length;

  for (let i = searchStart; i <= searchEnd - searchLines.length; i++) {
    const slice = sourceLines.slice(i, i + searchLines.length);
    const sliceText = slice.join("\n");
    const dedentedSliceText = dedent(sliceText);
    const distance = levenshtein(dedentedSearchText, dedentedSliceText);
    if (distance < minDistance) {
      minDistance = distance;
      bestMatchIndex = i;
    }
    if (distance === 0) break;
  }
  if (bestMatchIndex === -1 || minDistance > maxDistanceThreshold) {
    return null;
  }
  
  // Additional check: if a change was detected, reject if it looks like a semantic change inside a string literal
  if (minDistance > 0) {
    const slice = sourceLines.slice(bestMatchIndex, bestMatchIndex + searchLines.length);
    const sliceText = slice.join("\n");
    const dedentedSliceText = dedent(sliceText);
    
    // Check if both contain string literals and they're different
    const searchHasString = /["'].*["']/.test(dedentedSearchText);
    const sliceHasString = /["'].*["']/.test(dedentedSliceText);
    
    if (searchHasString && sliceHasString) {
      // Extract the string content to see if it's a semantic change
      const searchStringMatch = dedentedSearchText.match(/["'](.*?)["']/);
      const sliceStringMatch = dedentedSliceText.match(/["'](.*?)["']/);
      
      if (searchStringMatch && sliceStringMatch) {
        const searchString = searchStringMatch[1];
        const sliceString = sliceStringMatch[1];
        
        // If the strings are completely different (not just comment changes), reject
        if (searchString !== sliceString && !searchString.includes(sliceString) && !sliceString.includes(searchString)) {
          return null;
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
  const blocks = parseDiff(diff_content);
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
      const replaceLines = block.replace.split("\n");
      lines.splice(insertionIndex, 0, ...replaceLines);
      currentContent = lines.join("\n");
      continue;
    }

    const sourceLines = currentContent.split("\n");
    const searchLines = block.search.split("\n");
    const match = findBestMatch(sourceLines, searchLines, options.start_line ?? 1, options.end_line ?? sourceLines.length);

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
    
    const reindentedReplaceLines = replaceLines.map(line => {
        if (line.trim() === "") return "";
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