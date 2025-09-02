# Directory Structure
```
src/
  strategies/
    search-replace.ts
    standard-diff.ts
test/
  fixtures/
    search-replace.yml
    standard-diff.yml
  strategies/
    search-replace.test.ts
    standard-diff.test.ts
package.json
relay.config.json
tsconfig.json
```

# Files

## File: package.json
```json
{
  "name": "diff-apply",
  "module": "index.ts",
  "type": "module",
  "devDependencies": {
    "bun-types": "latest",
    "js-yaml": "^4.1.0",
    "@types/js-yaml": "^4.0.9"
  },
  "peerDependencies": {
    "typescript": "^5.0.0"
  }
}
```

## File: relay.config.json
```json
{
  "$schema": "https://relay-code.dev/schema.json",
  "projectId": "diff-apply",
  "core": {
    "logLevel": "info",
    "enableNotifications": false,
    "watchConfig": true
  },
  "watcher": {
    "clipboardPollInterval": 2000,
    "preferredStrategy": "auto"
  },
  "patch": {
    "approvalMode": "auto",
    "approvalOnErrorCount": 0,
    "linter": "",
    "preCommand": "",
    "postCommand": "",
    "minFileChanges": 0
  },
  "git": {
    "autoGitBranch": false,
    "gitBranchPrefix": "relay/",
    "gitBranchTemplate": "gitCommitMsg"
  }
}
```

## File: src/strategies/search-replace.ts
```typescript
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
  const cleanBlock = (block: string) => block.replace(/^\r?\n/, "").replace(/\r?\n\s*$/, "");
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
    lines.splice(insertionIndex, 0, replaceBlock);
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

  const newContent = original_content.replace(searchBlock, replaceBlock);
  return { success: true, content: newContent };
};
```

## File: src/strategies/standard-diff.ts
```typescript
type DiffError = {
  code: string;
  message: string;
};

type ApplyDiffResult =
  | { success: true; content: string }
  | { success: false; error: DiffError };

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

const levenshtein = (s1: string, s2: string): number => {
  if (s1.length < s2.length) {
    return levenshtein(s2, s1);
  }
  if (s2.length === 0) {
    return s1.length;
  }
  let previousRow = Array.from({ length: s2.length + 1 }, (_, i) => i);
  for (let i = 0; i < s1.length; i++) {
    let currentRow = [i + 1];
    for (let j = 0; j < s2.length; j++) {
      const insertions = previousRow[j + 1] + 1;
      const deletions = currentRow[j] + 1;
      const substitutions = previousRow[j] + (s1[i] === s2[j] ? 0 : 1);
      currentRow.push(Math.min(insertions, deletions, substitutions));
    }
    previousRow = currentRow;
  }
  return previousRow[previousRow.length - 1];
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

  let bestMatchIndex = -1;
  let minDistance = Infinity;
  const patternText = pattern.join("\n");
  // Don't allow fuzzy matching for very small patterns to avoid incorrect matches.
  const useFuzzy = patternText.length > 20;
  const maxDistanceThreshold = Math.max(
    5,
    Math.floor(patternText.length * 0.4)
  );

  for (let i = 0; i <= sourceLines.length - pattern.length; i++) {
    const slice = sourceLines.slice(i, i + pattern.length);
    const sliceText = slice.join("\n");
    const distance = useFuzzy
      ? levenshtein(patternText, sliceText)
      : sliceText === patternText
        ? 0
        : Infinity;

    if (distance < minDistance) {
      minDistance = distance;
      bestMatchIndex = i;
    }
    if (distance === 0) break; // Perfect match found
  }

  if (bestMatchIndex === -1 || (useFuzzy && minDistance > maxDistanceThreshold)) {
    return { success: false };
  }

  const result: string[] = [...sourceLines.slice(0, bestMatchIndex)];
  let sourceIdx = bestMatchIndex;

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
  if (!hunks) {
    return {
      success: false,
      error: {
        code: "INVALID_DIFF_FORMAT",
        message:
          "Invalid diff format. Could not parse any hunks from the diff content.",
      },
    };
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
        return {
          success: false,
          error: {
            code: "OVERLAPPING_HUNKS",
            message:
              "Hunks overlap. The provided diff contains multiple change hunks that target the same or overlapping line ranges, creating an ambiguity that cannot be resolved.",
          },
        };
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
          error: {
            code: "CONTEXT_MISMATCH",
            message:
              "Could not apply modification. The context provided in the diff does not match the content of the file. Hunk splitting fallback was also unsuccessful.",
          },
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
          error: {
            code: "CONTEXT_MISMATCH",
            message:
              "Could not apply modification. The context provided in the diff does not match the content of the file. Hunk splitting fallback was also unsuccessful.",
          },
        };
      }
    }
  }

  return { success: true, content: lines.join("\n") };
};
```

## File: test/fixtures/search-replace.yml
```yaml
# Tests for the `getToolDescription` function
tool_description_tests:
  - name: description-contains-key-elements
    description: Should generate a description that includes the CWD and format requirements
    input:
      cwd: "/mock/workspace"
    expected_to_contain:
      - "current working directory /mock/workspace"
      - "<<<<<<< SEARCH"
      - "======="
      - ">>>>>>> REPLACE"
      - "start_line"
      - "end_line"

# Tests for the `applyDiff` function
apply_diff_tests:
  - name: replace-exact-match
    description: Should replace content that is an exact match
    input:
      original_content: |
        function hello() {
            console.log("hello")
        }
      diff_content: |
        test.ts
        <<<<<<< SEARCH
        function hello() {
            console.log("hello")
        }
        =======
        function hello() {
            console.log("hello world")
        }
        >>>>>>> REPLACE
    expected:
      success: true
      content: |
        function hello() {
            console.log("hello world")
        }

  - name: preserve-indentation-on-addition
    description: Should preserve original indentation when adding new lines
    input:
      original_content: |
        class Example {
            getValue() {
                return this.value
            }
        }
      diff_content: |
        test.ts
        <<<<<<< SEARCH
            getValue() {
                return this.value
            }
        =======
            getValue() {
                // Add logging
                console.log("Getting value")
                return this.value
            }
        >>>>>>> REPLACE
    expected:
      success: true
      content: |
        class Example {
            getValue() {
                // Add logging
                console.log("Getting value")
                return this.value
            }
        }

  - name: fail-on-no-match
    description: Should fail gracefully if the search content does not match
    input:
      original_content: |
        function hello() {
            console.log("hello")
        }
      diff_content: |
        test.ts
        <<<<<<< SEARCH
        function hello() {
            console.log("wrong")
        }
        =======
        function hello() {
            console.log("hello world")
        }
        >>>>>>> REPLACE
    expected:
      success: false
      reason: "Search block not found"

  - name: fail-on-invalid-format
    description: Should fail gracefully if the diff format is invalid
    input:
      original_content: "function hello() {}"
      diff_content: "This is not a valid format"
    expected:
      success: false
      reason: "Invalid diff format"

  - name: strip-line-numbers
    description: Should strip leading line numbers from search and replace blocks
    input:
      original_content: "    return true;"
      diff_content: |
        test.ts
        <<<<<<< SEARCH
        2 |     return true;
        =======
        2 |     return false;
        >>>>>>> REPLACE
    expected:
      success: true
      content: "    return false;"

  - name: insertion-with-start-line
    description: Should insert code at a specific line when the search block is empty
    input:
      original_content: |
        function test() {
            const x = 1;
            return x;
        }
      diff_content: |
        test.ts
        <<<<<<< SEARCH
        =======
            console.log("Adding log");
        >>>>>>> REPLACE
      start_line: 2
      end_line: 2
    expected:
      success: true
      content: |
        function test() {
            console.log("Adding log");
            const x = 1;
            return x;
        }

  - name: insertion-fail-without-line-number
    description: Should fail an insertion if no start_line is provided
    input:
      original_content: "function test() {}"
      diff_content: |
        test.ts
        <<<<<<< SEARCH
        =======
        console.log("test");
        >>>>>>> REPLACE
    expected:
      success: false
      reason: "Insertion requires a start_line"

  - name: deletion
    description: Should delete code when the replace block is empty
    input:
      original_content: |
        function test() {
            // Comment to remove
        }
      diff_content: |
        test.ts
        <<<<<<< SEARCH
            // Comment to remove

        =======
        >>>>>>> REPLACE
    expected:
      success: true
      content: |
        function test() {
        }

  - name: constrained-search-target-specific-duplicate
    description: Should use line numbers to target a specific instance of duplicate code
    input:
      original_content: |
        // Instance 1
        processData();

        // Instance 2
        processData();
      diff_content: |
        test.ts
        <<<<<<< SEARCH
        processData();
        =======
        processData(config);
        >>>>>>> REPLACE
      start_line: 5
      end_line: 5
    expected:
      success: true
      content: |
        // Instance 1
        processData();

        // Instance 2
        processData(config);
```

## File: test/fixtures/standard-diff.yml
```yaml
# Tests for the `getToolDescription` function
tool_description_tests:
  - name: description-contains-key-elements
    description: Should generate a description that includes CWD and standard diff format markers
    input:
      cwd: "/mock/workspace"
    expected_to_contain:
      - "current working directory /mock/workspace"
      - "--- a/src/component.tsx"
      - "+++ b/src/component.tsx"
      - "@@ ... @@"

# Tests for the `applyDiff` function
apply_diff_tests:
  - name: simple-modification
    description: Should apply a simple modification, addition, and deletion correctly
    input:
      original_content: |
        line1
        line2
        line3
      diff_content: |
        --- a/file.txt
        +++ b/file.txt
        @@ -1,3 +1,4 @@
         line1
        +new line
         line2
        -line3
        +modified line3
    expected:
      success: true
      content: |
        line1
        new line
        line2
        modified line3

  - name: multiple-hunks
    description: Should correctly apply a diff with multiple, non-contiguous hunks
    input:
      original_content: |
        line1
        line2
        line3
        line4
        line5
      diff_content: |
        --- a/file.txt
        +++ b/file.txt
        @@ -1,2 +1,2 @@
         line1
        -line2
        +modified line2
        @@ -4,2 +4,2 @@
         line4
        -line5
        +modified line5
    expected:
      success: true
      content: |
        line1
        modified line2
        line3
        line4
        modified line5

  - name: correct-modification-with-similar-code
    description: Should correctly modify the right section when similar code exists elsewhere
    input:
      original_content: |
        function add(a, b) {
          return a + b;
        }

        function multiply(a, b) {
          return a + b;  // Bug here
        }
      diff_content: |
        --- a/math.js
        +++ b/math.js
        @@ -5,3 +5,3 @@
         function multiply(a, b) {
        -  return a + b;  // Bug here
        +  return a * b;
         }
    expected:
      success: true
      content: |
        function add(a, b) {
          return a + b;
        }

        function multiply(a, b) {
          return a * b;
        }
  
  - name: fallback-hunk-splitting-on-failure
    description: Should split a failing hunk into smaller parts and apply them individually
    input:
      original_content: |
        import { readFile } from 'fs';
        import { Logger } from './logger';

        const logger = new Logger();

        async function processFile(filePath: string) {
          try {
            const data = await readFile(filePath, 'utf8');
            logger.info('File read successfully');
            return data;
          } catch (error) {
            logger.error('Failed to read file:', error);
            throw error;
          }
        }
      diff_content: |
        --- a/file.ts
        +++ b/file.ts
        @@ -1,13 +1,13 @@
         import { readFile } from 'fs';
        -import { Logger } from './logger';
        +import { Logger } from './utils/logger';
         
         const logger = new Logger(); // This context line is correct
         
         async function processFile(filePath: string) { // This context line is also correct
           try {
             const data = await readFile(filePath, 'utf8');
        -    logger.info('File read successfully'); // This change is correct
        +    logger.info(`File ${filePath} read successfully`); // This change is correct
             return data;
           } catch (error) {
             logger.error('Failed to read file:', error);
             throw error;
           }
         }
    expected:
      success: true
      content: |
        import { readFile } from 'fs';
        import { Logger } from './utils/logger';

        const logger = new Logger(); // This context line is correct

        async function processFile(filePath: string) { // This context line is also correct
          try {
            const data = await readFile(filePath, 'utf8');
            logger.info(`File ${filePath} read successfully`);
            return data;
          } catch (error) {
            logger.error('Failed to read file:', error);
            throw error;
          }
        }

  - name: fail-on-non-existent-content
    description: Should fail when the diff context does not match the original content
    input:
      original_content: |
        line1
        line2
        line3
      diff_content: |
        --- a/file.txt
        +++ b/file.txt
        @@ -1,3 +1,3 @@
         line1
        -nonexistent line
        +new line
         line3
    expected:
      success: false
      reason: "Could not apply modification"

  - name: fail-on-overlapping-hunks
    description: Should fail to apply diffs that contain overlapping hunks
    input:
      original_content: |
        line1
        line2
        line3
        line4
        line5
      diff_content: |
        --- a/file.txt
        +++ b/file.txt
        @@ -1,3 +1,3 @@
         line1
         line2
        -line3
        +modified3
        @@ -2,3 +2,2 @@
         line2
        -line3
        -line4
        +modified3and4
    expected:
      success: false
      reason: "Hunks overlap"
```

## File: test/strategies/search-replace.test.ts
```typescript
import { describe, it, expect } from "bun:test";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";

// --- Mocked/Assumed Imports ---
// These functions would be imported from your actual source code.
// We are assuming their existence and signatures for this test file.
import {
  applyDiff,
  getToolDescription,
} from "../../src/strategies/search-replace";
// -----------------------------

// Define the structure of the test fixture files
interface TestFixtures {
  tool_description_tests: {
    name: string;
    description: string;
    input: { cwd: string };
    expected_to_contain: string[];
  }[];
  apply_diff_tests: {
    name: string;
    description: string;
    input: {
      original_content: string;
      diff_content: string;
      start_line?: number;
      end_line?: number;
    };
    expected: {
      success: boolean;
      content?: string;
      reason?: string;
    };
  }[];
}

// Load and parse the YAML fixture
const fixturePath = path.join(__dirname, "../fixtures/search-replace.yml");
const fixtures = yaml.load(
  fs.readFileSync(fixturePath, "utf-8")
) as TestFixtures;

// --- Test Suite ---

describe("Search/Replace Strategy", () => {
  describe("getToolDescription()", () => {
    fixtures.tool_description_tests.forEach((testCase) => {
      it(testCase.description, () => {
        const description = getToolDescription(testCase.input.cwd);
        for (const expected of testCase.expected_to_contain) {
          expect(description).toInclude(expected);
        }
      });
    });
  });

  describe("applyDiff()", () => {
    fixtures.apply_diff_tests.forEach((testCase) => {
      it(testCase.description, () => {
        const result = applyDiff(
          testCase.input.original_content,
          testCase.input.diff_content,
          {
            start_line: testCase.input.start_line,
            end_line: testCase.input.end_line,
          }
        );

        expect(result.success).toBe(testCase.expected.success);

        if (testCase.expected.success) {
          if (result.success) {
            expect(result.content).toBe(testCase.expected.content ?? "");
          } else {
            throw new Error("Expected success but got failure");
          }
        } else {
          if (!result.success) {
            if (testCase.expected.reason) {
              expect(result.error.message).toInclude(testCase.expected.reason);
            }
          } else {
            throw new Error("Expected failure but got success");
          }
        }
      });
    });
  });
});
```

## File: test/strategies/standard-diff.test.ts
```typescript
import { describe, it, expect } from "bun:test";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";

// --- Mocked/Assumed Imports ---
// These functions would be imported from your actual source code.
// We are assuming their existence and signatures for this test file.
import {
  applyDiff,
  getToolDescription,
} from "../../src/strategies/standard-diff";
// -----------------------------

// Define the structure of the test fixture files
interface TestFixtures {
  tool_description_tests: {
    name: string;
    description: string;
    input: { cwd: string };
    expected_to_contain: string[];
  }[];
  apply_diff_tests: {
    name: string;
    description: string;
    input: {
      original_content: string;
      diff_content: string;
    };
    expected: {
      success: boolean;
      content?: string;
      reason?: string;
    };
  }[];
}

// Load and parse the YAML fixture
const fixturePath = path.join(__dirname, "../fixtures/standard-diff.yml");
const fixtures = yaml.load(
  fs.readFileSync(fixturePath, "utf-8")
) as TestFixtures;

// --- Test Suite ---

describe("Standard Diff Strategy", () => {
  describe("getToolDescription()", () => {
    fixtures.tool_description_tests.forEach((testCase) => {
      it(testCase.description, () => {
        const description = getToolDescription(testCase.input.cwd);
        for (const expected of testCase.expected_to_contain) {
          expect(description).toInclude(expected);
        }
      });
    });
  });

  describe("applyDiff()", () => {
    fixtures.apply_diff_tests.forEach((testCase) => {
      it(testCase.description, () => {
        const result = applyDiff(
          testCase.input.original_content,
          testCase.input.diff_content
        );

        expect(result.success).toBe(testCase.expected.success);

        if (testCase.expected.success) {
          if (result.success) {
            expect(result.content).toBe(testCase.expected.content ?? "");
          } else {
            throw new Error("Expected success but got failure");
          }
        } else {
          if (!result.success) {
            if (testCase.expected.reason) {
              expect(result.error.message).toInclude(testCase.expected.reason);
            }
          } else {
            throw new Error("Expected failure but got success");
          }
        }
      });
    });
  });
});
```

## File: tsconfig.json
```json
{
  "include": [
    "test",
    "src"
  ],
  "compilerOptions": {
    "lib": ["ESNext"],
    "module": "esnext",
    "target": "esnext",
    "moduleResolution": "bundler",
    "moduleDetection": "force",
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "composite": true,
    "strict": true,
    "downlevelIteration": true,
    "skipLibCheck": true,
    "jsx": "preserve",
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "allowJs": true,
    "types": [
      "bun-types" // add Bun global
    ]
  }
}
```
