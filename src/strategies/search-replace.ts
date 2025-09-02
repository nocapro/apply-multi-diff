import { ERROR_CODES } from "../constants";
import type { ApplyDiffResult } from "../types";
import { createErrorResult } from "../utils/error";

export const getToolDescription = (cwd: string): string => {
  return `apply_diff Tool: Search and Replace

Applies a targeted code change to a single file using a search-and-replace format. This is ideal for precise modifications, insertions, or deletions of specific code blocks.

Parameters:
  :file_path: (required) The path to the file to modify, relative to the current working directory ${cwd}.
  :diff_content: (required) A string containing the search and replace blocks.
  :start_line: (optional) The line number in the original file where the search block is expected to start. Use this to resolve ambiguity when the same code appears multiple times. Required for insertions.
  :end_line: (optional) The line number in the original file where the search block is expected to end.

Format Requirements:
The \`diff_content\` must follow this structure:

<file_path_ignored_but_useful_for_context>
<<<<<<< SEARCH
[content to replace with]
=======
[content to replace with]
>>>>>>> REPLACE

Special Cases:
- To INSERT code, leave the SEARCH block empty and provide a \`start_line\`. The new code will be inserted before that line.
- To DELETE code, leave the REPLACE block empty.

Examples:

1. Basic Replace:
<apply_diff file_path="src/utils.ts">
  src/utils.ts
  <<<<<<< SEARCH
  function oldFunction() {
    return 1;
  }
  =======
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
  // Only strip if all non-empty lines have line numbers
  const allLinesNumbered = lines
    .filter((line) => line.trim() !== "")
    .every((line) => /^\s*\d+\s*\|/.test(line));

  if (!allLinesNumbered) {
    return text;
  }

  return lines.map((line) => line.replace(/^\s*\d+\s*\|\s?/, "")).join("\n");
};

export const applyDiff = (
  original_content: string,
  diff_content: string,
  options: { start_line?: number; end_line?: number } = {}
): ApplyDiffResult => {
  let diff = diff_content;
  const firstLineEnd = diff.indexOf("\n");
  if (
    firstLineEnd !== -1 &&
    !diff.substring(0, firstLineEnd).includes("<<<<<<<")
  ) {
    diff = diff.substring(firstLineEnd + 1);
  }

  const parts = diff.split(
    /^\s*<<<<<<< SEARCH\s*$|^\s*=======*\s*$|^\s*>>>>>>> REPLACE\s*$/m
  );

  if (parts.length < 4) {
    return createErrorResult(
      ERROR_CODES.INVALID_DIFF_FORMAT,
      "Invalid diff format. The diff must contain '<<<<<<< SEARCH', '=======', and '>>>>>>> REPLACE' markers."
    );
  }
// Log the entry point of a function for debugging
console.log('Entering critical function...');

  // Using .trim() is too aggressive and removes indentation.
  // We want to remove the leading/trailing newlines that result from the split,
  // but preserve the indentation of the code itself.
  // Remove leading and trailing newlines, but preserve internal structure
  const cleanBlock = (block: string) => block.replace(/^\r?\n/, "").replace(/\r?\n$/, "").replace(/([ \t]+)$/, "");
  const searchBlock = stripLineNumbers(cleanBlock(parts[1]));
  const replaceBlock = stripLineNumbers(cleanBlock(parts[2]));

  if (searchBlock === "") {
    if (typeof options.start_line !== "number") {
      return createErrorResult(
        ERROR_CODES.INSERTION_REQUIRES_LINE_NUMBER,
        "Insertion requires a start_line. The SEARCH block was empty, but no start_line was provided to specify the insertion point."
      );
    }
    const lines = original_content.split("\n");
    const insertionIndex = Math.max(0, options.start_line - 1);
    // Split the replaceBlock into lines and insert each line
    const replaceLines = replaceBlock.split("\n");
    lines.splice(insertionIndex, 0, ...replaceLines);
    return { success: true, content: lines.join("\n") };
  }

  const sourceLines = original_content.split("\n");
  const searchLines = searchBlock.split("\n").filter(l => l.trim() !== '' || l.length > 0);
  if (searchLines.length === 0) {
      return createErrorResult(ERROR_CODES.SEARCH_BLOCK_NOT_FOUND, "Search block is empty or contains only whitespace.");
  }

  let matchStartIndex = -1;
  const searchStart = (options.start_line ?? 1) - 1;
  const searchEnd = options.end_line ? options.end_line : sourceLines.length;

  for (let i = searchStart; i <= searchEnd - searchLines.length; i++) {
    let isMatch = true;
    for (let j = 0; j < searchLines.length; j++) {
      if (sourceLines[i + j].trim() !== searchLines[j].trim()) {
        isMatch = false;
        break;
      }
    }
    if (isMatch) {
      matchStartIndex = i;
      break;
    }
  }

  if (matchStartIndex === -1) {
    return createErrorResult(
      ERROR_CODES.SEARCH_BLOCK_NOT_FOUND,
      "Search block not found in the original content. The content to be replaced could not be located in the file."
    );
  }

  const matchEndIndex = matchStartIndex + searchLines.length;

  const getIndent = (line: string) => line.match(/^[ \t]*/)?.[0] || "";

  let originalMatchIndent = "";
  for (let i = matchStartIndex; i < matchEndIndex; i++) {
      if (sourceLines[i].trim() !== "") {
          originalMatchIndent = getIndent(sourceLines[i]);
          break;
      }
  }

  const replaceLines = replaceBlock === "" ? [] : replaceBlock.split('\n');
  let replaceBaseIndent = "";
   for (const line of replaceLines) {
    if (line.trim() !== "") {
        replaceBaseIndent = getIndent(line);
        break;
    }
  }

  const reindentedReplaceLines = replaceLines.map(line => {
      if (line.trim() === "") return "";
      const dedentedLine = line.startsWith(replaceBaseIndent)
        ? line.substring(replaceBaseIndent.length)
        : line;
      return originalMatchIndent + dedentedLine;
  });

  const newLines = [
    ...sourceLines.slice(0, matchStartIndex),
    ...reindentedReplaceLines,
    ...sourceLines.slice(matchEndIndex)
  ];

  // If we are deleting and the line before the deletion is empty, remove it to avoid weird spacing
  if(replaceBlock.trim() === '' && matchStartIndex > 0 && sourceLines[matchStartIndex - 1].trim() === '') {
    newLines.splice(matchStartIndex - 1, 1);
  }

  return { success: true, content: newLines.join("\n") };
};
