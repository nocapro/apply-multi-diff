type ApplyDiffResult =
  | { success: true; content: string }
  | { success: false; error: Error };

type Hunk = {
  originalStartLine: number;
  originalLineCount: number;
  lines: string[];
};

export const getToolDescription = (cwd: string): string => {
  return `Modify a file using the standard unified diff format.
The current working directory is ${cwd}.
The diff format is:
\`\`\`diff
--- a/path/to/original_file.ext
+++ b/path/to/modified_file.ext
@@ -l,c +l',c' @@
 unchanged line
-deleted line
+added line
\`\`\`
- The file paths (---, +++) and line numbers (@@ @@) are required.
- Provide context lines (unchanged lines) around your changes.
`;
};

const parseHunks = (diffContent: string): Hunk[] | null => {
  const lines = diffContent.split("\n");
  const hunks: Hunk[] = [];
  let currentHunk: Hunk | null = null;
  const hunkHeaderRegex = /^@@ -(\d+)(,(\d+))? \+(\d+)(,(\d+))? @@/;

  for (const line of lines) {
    if (line.startsWith("---") || line.startsWith("+++")) continue;

    const match = line.match(hunkHeaderRegex);
    if (match) {
      if (currentHunk) hunks.push(currentHunk);
      currentHunk = {
        originalStartLine: parseInt(match[1], 10),
        originalLineCount: match[3] ? parseInt(match[3], 10) : 1,
        lines: [],
      };
    } else if (
      currentHunk &&
      (line.startsWith(" ") || line.startsWith("+") || line.startsWith("-"))
    ) {
      currentHunk.lines.push(line);
    }
  }
  if (currentHunk) hunks.push(currentHunk);
  return hunks.length > 0 ? hunks : null;
};

const applyHunk = (
  sourceLines: readonly string[],
  hunk: Hunk
): { success: true; newLines: string[] } | { success: false } => {
  if (hunk.lines.every((l) => l.startsWith("+"))) {
    const result = [...sourceLines];
    const additions = hunk.lines.map((l) => l.substring(1));
    const insertionPoint =
      hunk.originalStartLine > 0 ? hunk.originalStartLine - 1 : 0;
    result.splice(insertionPoint, 0, ...additions);
    return { success: true, newLines: result };
  }

  const pattern = hunk.lines
    .filter((l) => l.startsWith(" ") || l.startsWith("-"))
    .map((l) => l.substring(1));

  if (pattern.length === 0) {
    const result = [...sourceLines];
    const additions = hunk.lines
      .filter((l) => l.startsWith("+"))
      .map((l) => l.substring(1));
    result.splice(hunk.originalStartLine - 1, 0, ...additions);
    return { success: true, newLines: result };
  }

  let matchIndex = -1;
  for (let i = 0; i <= sourceLines.length - pattern.length; i++) {
    const slice = sourceLines.slice(i, i + pattern.length);
    if (slice.every((line, j) => line === pattern[j])) {
      matchIndex = i;
      break;
    }
  }

  if (matchIndex === -1) return { success: false };

  const result = [...sourceLines.slice(0, matchIndex)];
  for (const hunkLine of hunk.lines) {
    if (hunkLine.startsWith(" ") || hunkLine.startsWith("+")) {
      result.push(hunkLine.substring(1));
    }
  }
  result.push(...sourceLines.slice(matchIndex + pattern.length));

  return { success: true, newLines: result };
};

const splitHunk = (hunk: Hunk): Hunk[] => {
  const subHunks: Hunk[] = [];
  const context = 2;
  let i = 0;
  while (i < hunk.lines.length) {
    while (i < hunk.lines.length && hunk.lines[i].startsWith(" ")) i++;
    if (i === hunk.lines.length) break;

    const changeStart = i;
    while (i < hunk.lines.length && !hunk.lines[i].startsWith(" ")) i++;
    const changeEnd = i;

    const start = Math.max(0, changeStart - context);
    const end = Math.min(hunk.lines.length, changeEnd + context);

    subHunks.push({
      ...hunk,
      lines: hunk.lines.slice(start, end),
    });
  }
  return subHunks;
};

export const applyDiff = (
  originalContent: string,
  diffContent: string
): ApplyDiffResult => {
  const hunks = parseHunks(diffContent);
  if (!hunks) return { success: false, error: new Error("Invalid diff format") };

  for (let i = 0; i < hunks.length; i++) {
    for (let j = i + 1; j < hunks.length; j++) {
      const h1 = hunks[i];
      const h1End = h1.originalStartLine + h1.originalLineCount - 1;
      const h2 = hunks[j];
      const h2End = h2.originalStartLine + h2.originalLineCount - 1;
      if (
        Math.max(h1.originalStartLine, h2.originalStartLine) <=
        Math.min(h1End, h2End)
      ) {
        return { success: false, error: new Error("Hunks overlap") };
      }
    }
  }

  let lines: readonly string[] = originalContent.split("\n");

  for (const hunk of hunks) {
    const result = applyHunk(lines, hunk);
    if (result.success) {
      lines = result.newLines;
    } else {
      const subHunks = splitHunk(hunk);
      if (subHunks.length <= 1) {
        return {
          success: false,
          error: new Error("Could not apply modification"),
        };
      }

      let allApplied = true;
      for (const subHunk of subHunks) {
        const subResult = applyHunk(lines, subHunk);
        if (subResult.success) {
          lines = subResult.newLines;
        } else {
          allApplied = false;
          break;
        }
      }
      if (!allApplied) {
        return {
          success: false,
          error: new Error("Could not apply modification"),
        };
      }
    }
  }

  return { success: true, content: lines.join("\n") };
};
