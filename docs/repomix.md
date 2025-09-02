# Directory Structure
```
test/
  fixtures/
    search-replace.yml
    standard-diff.yml
  strategies/
    search-replace.test.ts
    standard-diff.test.ts
index.ts
package.json
relay.config.json
tsconfig.json
```

# Files

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
      start_line: 4
      end_line: 4
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
      - "--- a/path/to/original_file.ext"
      - "+++ b/path/to/modified_file.ext"
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
        @@ ... @@
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
        @@ ... @@
         line1
        -line2
        +modified line2
        @@ ... @@
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
        @@ ... @@
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

        const logger = new Logger();

        async function processFile(filePath:string) {
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
        @@ ... @@
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
        @@ ... @@
         line1
         line2
        -line3
        +modified3
        @@ ... @@
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
          expect(result.content).toBe(testCase.expected.content);
        } else {
          // For failed cases, check if the error message includes the expected reason
          expect(result.error.message).toInclude(testCase.expected.reason);
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
          expect(result.content).toBe(testCase.expected.content);
        } else {
          // For failed cases, check if the error message includes the expected reason
          expect(result.error.message).toInclude(testCase.expected.reason);
        }
      });
    });
  });
});
```

## File: index.ts
```typescript
console.log("Hello via Bun!");
```

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

## File: tsconfig.json
```json
{
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
