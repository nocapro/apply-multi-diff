import { ERROR_CODES } from "../constants";
import type { ApplyDiffResult } from "../types";
import { createErrorResult } from "../utils/error";
import { levenshtein } from "../utils/string";

type Hunk = {
  originalStartLine: number;
  originalLineCount: number;
  lines: string[];
};

export const getToolDescription = (cwd: string): string => {
  return `apply_diff Tool: Standard Diff Format

Applies changes to a single file using the standard unified diff format (the same format used by \`git diff\`). This tool is highly resilient and can apply partial changes even if some parts of the diff do not match perfectly, by intelligently splitting changes into smaller parts.

Parameters:
  :file_path: (required) The path to the file to modify, relative to the current working directory ${cwd}.
  :diff_content: (required) A string containing the changes in the unified diff format.

Format Requirements:
The \`diff_content\` must start with \`---\` and \`+++\` headers, followed by one or more \`@@ ... @@\` hunk headers.

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
  const pattern = hunk.lines
    .filter((l) => l.startsWith(" ") || l.startsWith("-"))
    .map((l) => l.substring(1));

  if (pattern.length === 0) {
    // This is a pure insertion, rely on the hunk's line number
    const result = [...sourceLines];
    const additions = hunk.lines
      .filter((l) => l.startsWith("+"))
      .map((l) => l.substring(1));
    const insertionPoint = Math.max(0, hunk.originalStartLine - 1);
    result.splice(insertionPoint, 0, ...additions);
    return { success: true, newLines: result };
  }

  const performApply = (startIndex: number): string[] => {
    const result: string[] = [...sourceLines.slice(0, startIndex)];
    let sourceIdx = startIndex;

    for (const hunkLine of hunk.lines) {
      const lineContent = hunkLine.substring(1);
      if (hunkLine.startsWith("+")) {
        result.push(lineContent);
      } else if (hunkLine.startsWith(" ")) {
        // For context lines, use the content from the source file to preserve it
        // perfectly, especially after a fuzzy match.
        if (sourceIdx < sourceLines.length) {
          result.push(sourceLines[sourceIdx]);
        }
        sourceIdx++;
      } else if (hunkLine.startsWith("-")) {
        // For removed lines, just advance the source pointer.
        sourceIdx++;
      }
    }
    result.push(...sourceLines.slice(sourceIdx));
    return result;
  };

  // --- Multi-stage search for best match ---

  // Stage 1: Exact match at the expected line number (fast path)
  const expectedStartIndex = hunk.originalStartLine - 1;
  if (
    expectedStartIndex >= 0 &&
    expectedStartIndex + pattern.length <= sourceLines.length
  ) {
    const slice = sourceLines.slice(
      expectedStartIndex,
      expectedStartIndex + pattern.length
    );
    if (slice.join("\n") === pattern.join("\n")) {
      return { success: true, newLines: performApply(expectedStartIndex) };
    }
  }

  // Stage 2: Fuzzy match using Levenshtein distance
  let bestMatchIndex = -1;
  let minDistance = Infinity;
  const patternText = pattern.join("\n");
  const maxDistanceThreshold = Math.floor(patternText.length * 0.4); // 40% difference tolerance

  for (let i = 0; i <= sourceLines.length - pattern.length; i++) {
    const slice = sourceLines.slice(i, i + pattern.length);
    const sliceText = slice.join("\n");

    if (sliceText === patternText) {
      minDistance = 0;
      bestMatchIndex = i;
      break; // Perfect match found, no need to search further.
    }

    const distance = levenshtein(patternText, sliceText);

    if (distance < minDistance) {
      minDistance = distance;
      bestMatchIndex = i;
    }
  }

  if (bestMatchIndex === -1 || minDistance > maxDistanceThreshold) {
    return { success: false };
  }

  return { success: true, newLines: performApply(bestMatchIndex) };
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
  if (!hunks) {
    return createErrorResult(
      ERROR_CODES.INVALID_DIFF_FORMAT,
      "Invalid diff format. Could not parse any hunks from the diff content."
    );
  }

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
        return createErrorResult(
          ERROR_CODES.OVERLAPPING_HUNKS,
          "Hunks overlap. The provided diff contains multiple change hunks that target the same or overlapping line ranges, creating an ambiguity that cannot be resolved."
        );
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
        return createErrorResult(
          ERROR_CODES.CONTEXT_MISMATCH,
          "Could not apply modification. The context provided in the diff does not match the content of the file. Hunk splitting fallback was also unsuccessful."
        );
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
        return createErrorResult(
          ERROR_CODES.CONTEXT_MISMATCH,
          "Could not apply modification. The context provided in the diff does not match the content of the file. Hunk splitting fallback was also unsuccessful."
        );
      }
    }
  }

  return { success: true, content: lines.join("\n") };
};
