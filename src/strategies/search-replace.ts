type ApplyDiffResult =
  | { success: true; content: string }
  | { success: false; error: Error };

export const getToolDescription = (cwd: string): string => {
  return `Modify a file using a search/replace diff format.
The current working directory is ${cwd}.
The diff format is:
\`\`\`
<<<<<<< SEARCH
[content to find]
=======
[content to replace with]
>>>>>>> REPLACE
\`\`\`

- To add code, leave the SEARCH block empty. You must specify 'start_line'.
- To delete code, leave the REPLACE block empty.
- To modify a specific instance of duplicated code, provide 'start_line' and 'end_line' to constrain the search.
- Leading line numbers in diffs (e.g., "27 | console.log...") are automatically ignored.
`;
};

const stripLineNumbers = (text: string): string => {
  return text
    .split("\n")
    .map((line) => line.replace(/^\s*\d+\s*\|\s*/, ""))
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
    return { success: false, error: new Error("Invalid diff format") };
  }

  let [, searchBlock, replaceBlock] = parts;
  searchBlock = stripLineNumbers(searchBlock.trim());
  replaceBlock = stripLineNumbers(replaceBlock.trim());

  if (searchBlock === "") {
    if (typeof options.start_line !== "number") {
      return {
        success: false,
        error: new Error("Insertion requires a start_line"),
      };
    }
    const lines = original_content.split("\n");
    const insertionIndex = Math.max(0, options.start_line - 1);
    lines.splice(insertionIndex, 0, replaceBlock);
    return { success: true, content: lines.join("\n") };
  }

  if (options.start_line && options.end_line) {
    const lines = original_content.split("\n");
    const { start_line, end_line } = options;

    if (start_line < 1 || end_line > lines.length || start_line > end_line) {
      return {
        success: false,
        error: new Error("Invalid line range for constrained search."),
      };
    }

    const preSlice = lines.slice(0, start_line - 1);
    const targetSlice = lines.slice(start_line - 1, end_line);
    const postSlice = lines.slice(end_line);

    const targetText = targetSlice.join("\n");
    if (!targetText.includes(searchBlock)) {
      return {
        success: false,
        error: new Error(
          "Search block not found in the specified line range."
        ),
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
    return { success: false, error: new Error("Search block not found") };
  }

  const newContent = original_content.replace(searchBlock, replaceBlock);
  return { success: true, content: newContent };
};
