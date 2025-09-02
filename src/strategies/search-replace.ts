type DiffError = {
  code: string;
  message: string;
};

type ApplyDiffResult =
  | { success: true; content: string }
  | { success: false; error: DiffError };

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
[content to find]
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
  import { NewDependency } from './new-dependency';
  >>>>>>> REPLACE
</apply_diff>`;
};

const stripLineNumbers = (text: string): string => {
  return text
    .split("\n")
    .map((line) => {
      // Remove line numbers in format "N |" or "N|" where N is a number
      // This preserves the original indentation after the pipe
      const match = line.match(/^\s*\d+\s*\|\s*(.*)/);
      return match ? match[1] : line;
    })
    .join("\n");
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
    return {
      success: false,
      error: {
        code: "INVALID_DIFF_FORMAT",
        message:
          "Invalid diff format. The diff must contain '<<<<<<< SEARCH', '=======', and '>>>>>>> REPLACE' markers.",
      },
    };
  }

  // Using .trim() is too aggressive and removes indentation.
  // We want to remove the leading/trailing newlines that result from the split,
  // but preserve the indentation of the code itself.
  // Remove leading and trailing newlines, but preserve internal structure
  const cleanBlock = (block: string) => block.replace(/^\r?\n/, "").replace(/\r?\n$/, "").replace(/([ \t]+)$/, "");
  let [, searchBlock, replaceBlock] = parts;
  searchBlock = stripLineNumbers(cleanBlock(searchBlock));
  replaceBlock = stripLineNumbers(cleanBlock(replaceBlock));

  if (searchBlock === "") {
    if (typeof options.start_line !== "number") {
      return {
        success: false,
        error: {
          code: "INSERTION_REQUIRES_LINE_NUMBER",
          message:
            "Insertion requires a start_line. The SEARCH block was empty, but no start_line was provided to specify the insertion point.",
        },
      };
    }
    const lines = original_content.split("\n");
    const insertionIndex = Math.max(0, options.start_line - 1);
    // Split the replaceBlock into lines and insert each line
    const replaceLines = replaceBlock.split("\n");
    lines.splice(insertionIndex, 0, ...replaceLines);
    return { success: true, content: lines.join("\n") };
  }

  if (options.start_line && options.end_line) {
    const lines = original_content.split("\n");
    const { start_line, end_line } = options;

    if (start_line < 1 || end_line > lines.length || start_line > end_line) {
      return {
        success: false,
        error: {
          code: "INVALID_LINE_RANGE",
          message: "Invalid line range for constrained search.",
        },
      };
    }

    const preSlice = lines.slice(0, start_line - 1);
    const targetSlice = lines.slice(start_line - 1, end_line);
    const postSlice = lines.slice(end_line);

    const targetText = targetSlice.join("\n");
    if (!targetText.includes(searchBlock)) {
      return {
        success: false,
        error: {
          code: "SEARCH_BLOCK_NOT_FOUND_IN_RANGE",
          message: "Search block not found in the specified line range.",
        },
      };
    }
    const newTargetText = targetText.replace(searchBlock, replaceBlock);

    const newContent = [
      ...preSlice,
      ...newTargetText.split("\n"),
      ...postSlice,
    ].join("\n");
    return { success: true, content: newContent };
  }

  if (!original_content.includes(searchBlock)) {
    return {
      success: false,
      error: {
        code: "SEARCH_BLOCK_NOT_FOUND",
        message:
          "Search block not found in the original content. The content to be replaced could not be located in the file.",
      },
    };
  }

  let newContent = original_content.replace(searchBlock, replaceBlock);
  
  // If we're deleting content (replaceBlock is empty), clean up extra newlines
  if (replaceBlock === "") {
    // Remove double newlines that might result from deletion
    newContent = newContent.replace(/\n\n+/g, "\n");
  }
  
  return { success: true, content: newContent };
};
