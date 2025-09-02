# Directory Structure
```
src/
  strategies/
    search-replace.ts
    standard-diff.ts
  utils/
    error.ts
    logger.ts
    string.ts
  constants.ts
  index.ts
  types.ts
test/
  fixtures/
    search-replace.yml
    standard-diff.yml
  strategies/
    search-replace.test.ts
    standard-diff.test.ts
package.json
tsconfig.json
```

# Files

## File: src/utils/error.ts
```typescript
import type { ApplyDiffResult } from "../types";

export const createErrorResult = (
  code: string,
  message: string
): Extract<ApplyDiffResult, { success: false }> => {
  return {
    success: false,
    error: { code, message },
  };
};
```

## File: src/utils/logger.ts
```typescript
// Placeholder for a more robust logger
export const logger = {
  info: (...args: unknown[]) => console.log(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};
```

## File: src/utils/string.ts
```typescript
export const levenshtein = (s1: string, s2: string): number => {
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

export const getIndent = (line: string): string =>
  line.match(/^[ \t]*/)?.[0] || "";

/**
 * Finds the shortest leading whitespace sequence among all non-empty lines,
 * which represents the common base indentation for a block of text.
 */
export const getCommonIndent = (text: string): string => {
  const lines = text.split("\n").filter((line) => line.trim() !== "");
  if (!lines.length) return "";

  return lines.reduce((shortest, line) => {
    const currentIndent = getIndent(line);
    if (currentIndent.length < shortest.length) {
      return currentIndent;
    }
    return shortest;
  }, getIndent(lines[0]));
};
```

## File: src/constants.ts
```typescript
export const ERROR_CODES = {
  // Standard Diff Errors
  INVALID_DIFF_FORMAT: "INVALID_DIFF_FORMAT",
  OVERLAPPING_HUNKS: "OVERLAPPING_HUNKS",
  CONTEXT_MISMATCH: "CONTEXT_MISMATCH",

  // Search/Replace Errors
  INSERTION_REQUIRES_LINE_NUMBER: "INSERTION_REQUIRES_LINE_NUMBER",
  INVALID_LINE_RANGE: "INVALID_LINE_RANGE",
  SEARCH_BLOCK_NOT_FOUND_IN_RANGE: "SEARCH_BLOCK_NOT_FOUND_IN_RANGE",
  SEARCH_BLOCK_NOT_FOUND: "SEARCH_BLOCK_NOT_FOUND",
} as const;
```

## File: src/types.ts
```typescript
export type DiffError = {
  code: string;
  message: string;
};

export type ApplyDiffResult =
  | { success: true; content: string }
  | { success: false; error: DiffError };
```

## File: src/index.ts
```typescript
export {
  applyDiff as applyStandardDiff,
  getToolDescription as getStandardDiffToolDescription,
} from "./strategies/standard-diff";
export {
  applyDiff as applySearchReplace,
  getToolDescription as getSearchReplaceToolDescription,
} from "./strategies/search-replace";

export * from "./types";
export * from "./constants";
export * from "./utils/error";
export * from "./utils/logger";
export * from "./utils/string";
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

## File: package.json
```json
{
  "name": "diff-apply",
  "module": "src/index.ts",
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

## File: src/strategies/standard-diff.ts
```typescript
import { ERROR_CODES } from "../constants";
import type { ApplyDiffResult } from "../types";
import { createErrorResult } from "../utils/error";
import { levenshtein } from "../utils/string";

type Hunk = {
  originalStartLine: number;
  originalLineCount: number;
  newStartLine: number;
  newLineCount: number;
  lines: string[];
};

export const getToolDescription = (cwd: string): string => {
  return `apply_diff Tool: Standard Diff Format

Applies changes to a single file using the standard unified diff format. This tool is highly resilient and uses multiple fallback strategies (fuzzy matching, hunk splitting) to apply changes even if the source file has been modified.

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
  let currentHunk: Omit<Hunk, 'lines'> & { lines: string[] } | null = null;
  const hunkHeaderRegex = /^@@ -(\d+)(,(\d+))? \+(\d+)(,(\d+))? @@/;

  for (const line of lines) {
    if (line.startsWith("---") || line.startsWith("+++")) continue;

    const match = line.match(hunkHeaderRegex);
    if (match) {
      if (currentHunk) hunks.push(currentHunk);
      currentHunk = {
        originalStartLine: parseInt(match[1], 10),
        originalLineCount: match[3] ? parseInt(match[3], 10) : 1,
        newStartLine: parseInt(match[4], 10),
        newLineCount: match[6] ? parseInt(match[6], 10) : 1,
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

const applyHunkAt = (sourceLines: readonly string[], hunk: Hunk, startIndex: number): string[] => {
    const result: string[] = [...sourceLines.slice(0, startIndex)];
    let sourceIdx = startIndex;

    for (const hunkLine of hunk.lines) {
      const lineContent = hunkLine.substring(1);
      if (hunkLine.startsWith("+")) {
        result.push(lineContent);
      } else if (hunkLine.startsWith(" ")) {
        if (sourceIdx < sourceLines.length) {
          result.push(sourceLines[sourceIdx]);
        }
        sourceIdx++;
      } else if (hunkLine.startsWith("-")) {
        sourceIdx++;
      }
    }
    result.push(...sourceLines.slice(sourceIdx));
    return result;
};

const findAndApplyHunk = (
  sourceLines: readonly string[],
  hunk: Hunk
): { success: true; newLines: string[] } | { success: false } => {
  const pattern = hunk.lines
    .filter((l) => l.startsWith(" ") || l.startsWith("-"))
    .map((l) => l.substring(1));

  if (pattern.length === 0) {
    // Pure insertion. Trust the line number.
    const insertionPoint = Math.max(0, hunk.originalStartLine - 1);
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

  // --- STAGE 2: Fuzzy Match (Global Search) ---
  let bestMatchIndex = -1;
  let minDistance = Infinity;
  const patternText = pattern.join("\n");
  const maxDistanceThreshold = Math.floor(patternText.length * 0.4); // 40% difference tolerance

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


const splitHunk = (hunk: Hunk): Hunk[] => {
  const subHunks: Hunk[] = [];
  const context = 2; 
  let i = 0;
  while (i < hunk.lines.length) {
    // Skip leading context
    while (i < hunk.lines.length && hunk.lines[i].startsWith(" ")) i++;
    if (i === hunk.lines.length) break;

    const changeBlockStart = i;
    // Find end of this change block
    while (i < hunk.lines.length && !hunk.lines[i].startsWith(" ")) i++;
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
  const hunks = parseHunks(diffContent);
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
      const h1End = h1.originalStartLine + h1.originalLineCount;
      const h2 = hunks[j];
      if (Math.max(h1.originalStartLine, h2.originalStartLine) < Math.min(h1End, h2.originalStartLine + h2.originalLineCount)) {
        return createErrorResult(ERROR_CODES.OVERLAPPING_HUNKS, "Hunks overlap, which is not supported.");
      }
    }
  }

  let lines: readonly string[] = originalContent.split("\n");
  let appliedSuccessfully = true;

  for (const hunk of hunks) {
    const result = findAndApplyHunk(lines, hunk);
    if (result.success) {
      lines = result.newLines;
    } else {
      // --- FALLBACK: Hunk Splitting ---
      const subHunks = splitHunk(hunk);
      if (subHunks.length <= 1) { // No benefit in splitting a single change block
        appliedSuccessfully = false;
        break;
      }

      let allSubHunksApplied = true;
      for (const subHunk of subHunks) {
        const subResult = findAndApplyHunk(lines, subHunk);
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

  return { success: true, content: lines.join("\n") };
};
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

  - name: handle-indentation-changes
    description: Should correctly handle changes involving different types of indentation
    input:
      original_content: |
        function example() {
          let a = 1;
            let b = 2;
        }
      diff_content: |
        --- a/file.js
        +++ b/file.js
        @@ -1,4 +1,5 @@
         function example() {
           let a = 1;
        +  // new line
             let b = 2;
         }
    expected:
      success: true
      content: |
        function example() {
          let a = 1;
          // new line
            let b = 2;
        }

  - name: handle-empty-lines-modification
    description: Should correctly apply changes that involve empty lines
    input:
      original_content: |
        line1

        line3
      diff_content: |
        --- a/file.txt
        +++ b/file.txt
        @@ -1,3 +1,3 @@
         line1
         
        -line3
        +line3-modified
    expected:
      success: true
      content: |
        line1

        line3-modified
  
  - name: fuzzy-match-with-drifted-context
    description: Should apply a hunk correctly even if the context has minor changes
    input:
      original_content: |
        // SPDX-License-Identifier: MIT
        pragma solidity ^0.8.20;

        contract SimpleStore {
            uint256 private _value; // The value stored

            function setValue(uint256 value) public {
                _value = value;
            }
        }
      diff_content: |
        --- a/SimpleStore.sol
        +++ b/SimpleStore.sol
        @@ -4,6 +4,10 @@
         contract SimpleStore {
             uint256 private _value;
 
+            function getValue() public view returns (uint256) {
+                return _value;
+            }
+
             function setValue(uint256 value) public {
                 _value = value;
             }
    expected:
      success: true
      content: |
        // SPDX-License-Identifier: MIT
        pragma solidity ^0.8.20;

        contract SimpleStore {
            uint256 private _value; // The value stored

            function getValue() public view returns (uint256) {
                return _value;
            }

            function setValue(uint256 value) public {
                _value = value;
            }
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
        -    logger.info('File read successfully');
        +    logger.info(`File ${filePath} read successfully`);
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

        const logger = new Logger();

        async function processFile(filePath: string) {
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
            console.log("hello world");
        }
        >>>>>>> REPLACE
    expected:
      success: true
      content: |
        function hello() {
            console.log("hello world");
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
                console.log("Getting value");
                return this.value;
            }
        >>>>>>> REPLACE
    expected:
      success: true
      content: |
        class Example {
            getValue() {
                // Add logging
                console.log("Getting value");
                return this.value;
            }
        }

  - name: fuzzy-match-on-minor-difference
    description: Should find and replace content that is slightly different from the search block
    input:
      original_content: |
        function calculate() {
          // A comment
          const result = 1 + 1;
          return result;
        }
      diff_content: |
        test.ts
        <<<<<<< SEARCH
          // An old comment
          const result = 1 + 1;
        =======
          const result = 2 * 2; // updated logic
        >>>>>>> REPLACE
    expected:
      success: true
      content: |
        function calculate() {
          const result = 2 * 2; // updated logic
          return result;
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

  - name: indentation-agnostic-search-and-preserve
    description: Should find content regardless of its indentation and preserve it on replace
    input:
      original_content: |
            function test() {
                return true;
            }
      diff_content: |
        test.ts
        <<<<<<< SEARCH
        function test() {
            return true;
        }
        =======
        function test() {
            return false;
        }
        >>>>>>> REPLACE
    expected:
      success: true
      content: |
            function test() {
                return false;
            }

  - name: respect-relative-indentation-in-replace
    description: Should respect the relative indentation inside the REPLACE block
    input:
      original_content: |
        class Test {
            method() {
                console.log("test");
            }
        }
      diff_content: |
        test.ts
        <<<<<<< SEARCH
            method() {
                console.log("test");
            }
        =======
            method() {
                try {
                    if (true) {
                        console.log("test");
                    }
                } catch (e) {
                    console.error(e);
                }
            }
        >>>>>>> REPLACE
    expected:
      success: true
      content: |
        class Test {
            method() {
                try {
                    if (true) {
                        console.log("test");
                    }
                } catch (e) {
                    console.error(e);
                }
            }
        }

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
        2 |     return false; // A comment
        >>>>>>> REPLACE
    expected:
      success: true
      content: "    return false; // A comment"

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

  - name: multiple-blocks-in-one-call
    description: Should process multiple search/replace blocks in a single operation
    input:
      original_content: |
        const a = "apple";
        const b = "banana";
      diff_content: |
        test.ts
        <<<<<<< SEARCH
        const a = "apple";
        =======
        const a = "apricot";
        >>>>>>> REPLACE
        <<<<<<< SEARCH
        const b = "banana";
        =======
        const b = "blueberry";
        >>>>>>> REPLACE
    expected:
      success: true
      content: |
        const a = "apricot";
        const b = "blueberry";
```

## File: src/strategies/search-replace.ts
```typescript
import { ERROR_CODES } from "../constants";
import type { ApplyDiffResult } from "../types";
import { createErrorResult } from "../utils/error";
import { getCommonIndent, getIndent, levenshtein } from "../utils/string";

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
  const maxDistanceThreshold = Math.floor(searchText.length * 0.08); // 8% difference tolerance

  const searchStart = startLine - 1;
  const searchEnd = endLine ?? sourceLines.length;

  for (let i = searchStart; i <= searchEnd - searchLines.length; i++) {
    const slice = sourceLines.slice(i, i + searchLines.length);
    const sliceText = slice.join("\n");
    const distance = levenshtein(searchText, sliceText);
    if (distance < minDistance) {
      minDistance = distance;
      bestMatchIndex = i;
    }
    if (distance === 0) break;
  }
  
  if (bestMatchIndex === -1 || minDistance > maxDistanceThreshold) {
    return null;
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
```
