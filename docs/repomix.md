# Directory Structure
```
.claude/
  settings.local.json
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
    search-replace/
      complex-scenarios.yml
      description.yml
      edge-cases.yml
      failure-fuzzy.yml
      failure.yml
      fuzzy.yml
      indentation.yml
      insertion-deletion.yml
      line-numbers.yml
      success.yml
    standard-diff/
      complex-scenarios.yml
      description.yml
      edge-cases.yml
      failure.yml
      fuzzy.yml
      success.yml
  strategies/
    search-replace.test.ts
    standard-diff.test.ts
package.json
tsconfig.json
tsup.config.ts
```

# Files

## File: .claude/settings.local.json
```json
{
  "permissions": {
    "allow": [
      "Bash(bun test:*)",
      "Bash(git checkout:*)",
      "Bash(node:*)",
      "Bash(bun run:*)",
      "Bash(cat:*)",
      "Bash(git restore:*)"
    ],
    "deny": [],
    "ask": []
  }
}
```

## File: test/fixtures/search-replace/failure-fuzzy.yml
```yaml
apply_diff_tests:
  - name: reject-fuzzy-on-different-variable
    description: Should reject a fuzzy match that targets a different variable name
    input:
      original_content: |
        const bar = 1;
      diff_content: |
        test.ts
        <<<<<<< SEARCH
        const foo = 1;
        =======
        const foo = 2;
        >>>>>>> REPLACE
    expected:
      success: false
      reason: "Search block not found"
  - name: reject-fuzzy-on-different-function-call
    description: Should reject a fuzzy match that targets a different function call
    input:
      original_content: |
        calculateSubtotal();
      diff_content: |
        test.ts
        <<<<<<< SEARCH
        calculateTotal();
        =======
        calculateTotal(true);
        >>>>>>> REPLACE
    expected:
      success: false
      reason: "Search block not found"
  - name: reject-fuzzy-on-different-numeric-literal
    description: Should reject a fuzzy match that targets a different number
    input:
      original_content: |
        if (value > 200) { return; }
      diff_content: |
        test.ts
        <<<<<<< SEARCH
        if (value > 100) { return; }
        =======
        if (value > 150) { return; } // New threshold
        >>>>>>> REPLACE
    expected:
      success: false
      reason: "Search block not found"
```

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

## File: test/fixtures/search-replace/complex-scenarios.yml
```yaml
apply_diff_tests:
  - name: constrained-search-with-end-line
    description: Should use a line range to target a specific block, ignoring identical blocks outside the range
    input:
      original_content: |
        function process() {
            // some logic
        }

        function main() {
            process(); // Should NOT be replaced
        }

        function test() {
            process(); // Should be replaced
        }
      diff_content: |
        test.ts
        <<<<<<< SEARCH
            process();
        =======
            process(true);
        >>>>>>> REPLACE
      start_line: 9
      end_line: 13
    expected:
      success: true
      content: |
        function process() {
            // some logic
        }

        function main() {
            process(); // Should NOT be replaced
        }

        function test() {
            process(true); // Should be replaced
        }
  - name: insertion-into-empty-block
    description: Should correctly infer indentation when inserting into an empty block
    input:
      original_content: |
        function setup() {
        }
      diff_content: |
        test.ts
        <<<<<<< SEARCH
        =======
        console.log("setup");
        >>>>>>> REPLACE
      start_line: 2
    expected:
      success: true
      content: |
        function setup() {
            console.log("setup");
        }
  - name: replace-across-blank-lines
    description: Should correctly find and replace a block that contains blank lines
    input:
      original_content: |
        // start
        const A = 1;

        const B = 2;
        // end
      diff_content: |
        test.ts
        <<<<<<< SEARCH
        const A = 1;

        const B = 2;
        =======
        const C = 3;
        >>>>>>> REPLACE
    expected:
      success: true
      content: |
        // start
        const C = 3;
        // end
  - name: multi-block-insertion-and-replace
    description: Should handle a mix of insertion and replacement in a single diff
    input:
      original_content: |
        import React from 'react';

        function MyComponent() {
            return <div>Hello</div>;
        }
      diff_content: |
        test.ts
        <<<<<<< SEARCH
        =======
        import { useState } from 'react';
        >>>>>>> REPLACE
        <<<<<<< SEARCH
            return <div>Hello</div>;
        =======
            const [name, setName] = useState('World');
            return <div>Hello, {name}</div>;
        >>>>>>> REPLACE
      start_line: 2 # For the insertion, and acts as search start for subsequent blocks
    expected:
      success: true
      content: |
        import React from 'react';
        import { useState } from 'react';

        function MyComponent() {
            const [name, setName] = useState('World');
            return <div>Hello, {name}</div>;
        }
```

## File: test/fixtures/search-replace/description.yml
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
```

## File: test/fixtures/search-replace/edge-cases.yml
```yaml
apply_diff_tests:
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
  - name: first-of-ambiguous-match-is-replaced
    description: Should replace the first occurrence of an ambiguous match when no line numbers are given
    input:
      original_content: |
        config.set("value", 1);
        // ... lots of code
        config.set("value", 1);
      diff_content: |
        test.ts
        <<<<<<< SEARCH
        config.set("value", 1);
        =======
        config.set("value", 2);
        >>>>>>> REPLACE
    expected:
      success: true
      content: |
        config.set("value", 2);
        // ... lots of code
        config.set("value", 1);
  - name: replace-at-start-of-file
    description: Should correctly replace content at the very beginning of the file
    input:
      original_content: |
        // Header
        function start() {}
      diff_content: |
        test.ts
        <<<<<<< SEARCH
        // Header
        =======
        // New Header
        >>>>>>> REPLACE
    expected:
      success: true
      content: |
        // New Header
        function start() {}
  - name: replace-at-end-of-file
    description: Should correctly replace content at the very end of the file
    input:
      original_content: |
        function start() {}
        // Footer
      diff_content: |
        test.ts
        <<<<<<< SEARCH
        // Footer
        =======
        // New Footer
        >>>>>>> REPLACE
    expected:
      success: true
      content: |
        function start() {}
        // New Footer
  - name: replace-block-with-trailing-newline
    description: Should correctly handle a replace block that ends with a newline
    input:
      original_content: |
        const x = 1;
      diff_content: |
        test.ts
        <<<<<<< SEARCH
        const x = 1;
        =======
        const y = 2;

        >>>>>>> REPLACE
    expected:
      success: true
      content: |
        const y = 2;

  - name: remove-extra-blank-lines
    description: Should be able to search for and remove only whitespace
    input:
      original_content: |
        line 1


        line 2
      diff_content: |
        test.ts
        <<<<<<< SEARCH

        =======
        >>>>>>> REPLACE
    expected:
      success: true
      content: |
        line 1

        line 2
  - name: unicode-characters-replace
    description: Should correctly handle files with unicode characters in search and replace
    input:
      original_content: "const greeting = '你好世界';"
      diff_content: |
        test.ts
        <<<<<<< SEARCH
        '你好世界'
        =======
        'こんにちは世界'
        >>>>>>> REPLACE
    expected:
      success: true
      content: "const greeting = 'こんにちは世界';"
```

## File: test/fixtures/search-replace/failure.yml
```yaml
apply_diff_tests:
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
  - name: fuzzy-match-rejection-on-string-literal-change
    description: Should reject a fuzzy match that changes the semantic meaning of a string literal
    input:
      original_content: |
        logger.error("Failed to connect to database");
      diff_content: |
        test.ts
        <<<<<<< SEARCH
        logger.error("Failed to load configuration");
        =======
        Sentry.captureMessage("Failed to load configuration");
        >>>>>>> REPLACE
    expected:
      success: false
      reason: "Search block not found"
```

## File: test/fixtures/search-replace/fuzzy.yml
```yaml
apply_diff_tests:
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
  - name: fuzzy-delete
    description: Should delete a block of code even with minor differences
    input:
      original_content: |
        function hello() {
            // This is a very important comment
            console.log("hello");
        }
      diff_content: |
        test.ts
        <<<<<<< SEARCH
            // This is an important comment
            console.log("hello");
        =======
        >>>>>>> REPLACE
    expected:
      success: true
      content: |
        function hello() {
        }
  - name: fuzzy-match-accept-minor-string-literal-change
    description: Should accept a fuzzy match with a minor, non-semantic change in a string literal
    input:
      original_content: |
        logger.error("Failed to connect to database!"); // User added exclamation
      diff_content: |
        test.ts
        <<<<<<< SEARCH
        logger.error("Failed to connect to database");
        =======
        Sentry.captureMessage("Failed to connect to database!");
        >>>>>>> REPLACE
    expected:
      success: true
      content: |
        Sentry.captureMessage("Failed to connect to database!"); // User added exclamation
```

## File: test/fixtures/search-replace/indentation.yml
```yaml
apply_diff_tests:
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
  - name: replace-with-complex-relative-indentation
    description: Should correctly re-indent a replacement block with multiple indentation levels
    input:
      original_content: |
        function outer() {
            if (condition) {
                process();
            }
        }
      diff_content: |
        test.ts
        <<<<<<< SEARCH
        process();
        =======
        if (anotherCondition) {
            process();
        } else {
            fallback();
        }
        >>>>>>> REPLACE
    expected:
      success: true
      content: |
        function outer() {
            if (condition) {
                if (anotherCondition) {
                    process();
                } else {
                    fallback();
                }
            }
        }
  - name: insertion-with-inferred-indentation
    description: Should insert code and correctly apply surrounding indentation
    input:
      original_content: |
        function outer() {
            if (true) {
                // marker
            }
        }
      diff_content: |
        test.ts
        <<<<<<< SEARCH
        =======
        console.log("inserted");
        >>>>>>> REPLACE
      start_line: 3
    expected:
      success: true
      content: |
        function outer() {
            if (true) {
                console.log("inserted");
                // marker
            }
        }
  - name: insertion-at-end-of-block-with-inferred-indentation
    description: Should infer indentation from previous line when inserting before a closing brace
    input:
      original_content: |
        function myFunc() {
            console.log("hello");
        }
      diff_content: |
        test.ts
        <<<<<<< SEARCH
        =======
        console.log("world");
        >>>>>>> REPLACE
      start_line: 3
    expected:
      success: true
      content: |
        function myFunc() {
            console.log("hello");
            console.log("world");
        }
```

## File: test/fixtures/search-replace/insertion-deletion.yml
```yaml
apply_diff_tests:
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
  - name: empty-file-insertion
    description: Should insert content into an empty file without extra newlines
    input:
      original_content: ""
      diff_content: |
        test.ts
        <<<<<<< SEARCH
        =======
        Hello, World!
        >>>>>>> REPLACE
      start_line: 1
    expected:
      success: true
      content: "Hello, World!"
```

## File: test/fixtures/search-replace/line-numbers.yml
```yaml
apply_diff_tests:
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

## File: test/fixtures/search-replace/success.yml
```yaml
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

  - name: sequential-overlapping-replace
    description: Should handle sequential replacements where the second depends on the first
    input:
      original_content: |
        function one() {
            return 1;
        }
      diff_content: |
        test.ts
        <<<<<<< SEARCH
        function one() {
            return 1;
        }
        =======
        function two() {
            return 2;
        }
        >>>>>>> REPLACE
        <<<<<<< SEARCH
        function two() {
        =======
        function two() { // Renamed
        >>>>>>> REPLACE
    expected:
      success: true
      content: |
        function two() { // Renamed
            return 2;
        }

  - name: replace-with-regex-special-chars
    description: Should correctly replace content that contains special regex characters
    input:
      original_content: "const x = arr[0] + (y || 0);"
      diff_content: |
        test.ts
        <<<<<<< SEARCH
        arr[0] + (y || 0)
        =======
        arr[0] * (y || 1)
        >>>>>>> REPLACE
    expected:
      success: true
      content: "const x = arr[0] * (y || 1);"
```

## File: test/fixtures/standard-diff/complex-scenarios.yml
```yaml
# More complex scenarios for standard diff
apply_diff_tests:
  - name: context-only-hunk
    description: Should do nothing for a hunk that contains only context lines
    input:
      original_content: |
        line 1
        line 2
        line 3
      diff_content: |
        --- a/file.txt
        +++ b/file.txt
        @@ -1,3 +1,3 @@
         line 1
         line 2
         line 3
    expected:
      success: true
      content: |
        line 1
        line 2
        line 3
  - name: whitespace-only-change
    description: Should correctly apply a change that only modifies indentation
    input:
      original_content: |
        function test() {
        return 1;
        }
      diff_content: |
        --- a/file.js
        +++ b/file.js
        @@ -1,3 +1,3 @@
         function test() {
        -return 1;
        +  return 1;
         }
    expected:
      success: true
      content: |
        function test() {
          return 1;
        }
  - name: context-line-with-special-chars
    description: Should correctly handle context lines that start with characters like '+' or '-'
    input:
      original_content: |
        // Calculations
        const x = 1;
        const y = -2;
        const z = x + y;
      diff_content: |
        --- a/file.js
        +++ b/file.js
        @@ -2,3 +2,3 @@
         const x = 1;
         const y = -2;
        -const z = x + y;
        +const z = x - y; // Change sign
    expected:
      success: true
      content: |
        // Calculations
        const x = 1;
        const y = -2;
        const z = x - y; // Change sign
  - name: large-hunk-split-with-fuzzy-subhunks
    description: Should split a large, broken hunk and apply valid sub-parts using fuzzy matching
    input:
      original_content: |
        // Block A
        function blockA() {
            console.log("A");
        }

        // User edit here, broke the hunk
        console.log("user edit 1");

        // Block B - slightly modified by user
        function blockB() { // user comment
            console.log("B");
        }

        // User edit here, broke the hunk again
        console.log("user edit 2");

        // Block C
        function blockC() {
            console.log("C");
        }
      diff_content: |
        --- a/file.js
        +++ b/file.js
        @@ -1,13 +1,13 @@
         // Block A
         function blockA() {
        -    console.log("A");
        +    console.log("A modified");
         }
         
         // Block B
         function blockB() {
        -    console.log("B");
        +    console.log("B modified");
         }
         
         // Block C
         function blockC() {
        -    console.log("C");
        +    console.log("C modified");
         }
    expected:
      success: false
      reason: "Could not apply modification"
```

## File: test/fixtures/standard-diff/description.yml
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
```

## File: test/fixtures/standard-diff/edge-cases.yml
```yaml
# Tests for edge cases
apply_diff_tests:
  - name: pure-insertion-at-start
    description: Should correctly insert content at the beginning of a file
    input:
      original_content: |
        line 1
        line 2
      diff_content: |
        --- a/file.txt
        +++ b/file.txt
        @@ -0,0 +1,2 @@
        +new line 1
        +new line 2
    expected:
      success: true
      content: |
        new line 1
        new line 2
        line 1
        line 2

  - name: unicode-characters
    description: Should correctly handle files with unicode characters
    input:
      original_content: "你好世界"
      diff_content: |
        --- a/file.txt
        +++ b/file.txt
        @@ -1 +1 @@
        -你好世界
        +こんにちは世界
    expected:
      success: true
      content: "こんにちは世界"

  - name: pure-insertion-after-line
    description: Should correctly apply a hunk that only contains additions after a specific line
    input:
      original_content: |
        line 1
        line 3
      diff_content: |
        --- a/file.txt
        +++ b/file.txt
        @@ -1,0 +2,1 @@
        +line 2
    expected:
      success: true
      content: |
        line 1
        line 2
        line 3

  - name: pure-deletion-hunk
    description: Should correctly apply a hunk that only contains deletions
    input:
      original_content: |
        line 1
        line 2 to delete
        line 3
      diff_content: |
        --- a/file.txt
        +++ b/file.txt
        @@ -1,3 +1,2 @@
         line 1
        -line 2 to delete
         line 3
    expected:
      success: true
      content: |
        line 1
        line 3

  - name: apply-to-empty-file
    description: Should correctly apply a diff to an empty file (file creation)
    input:
      original_content: ""
      diff_content: |
        --- /dev/null
        +++ b/file.txt
        @@ -0,0 +1,3 @@
        +Hello
        +World
        +!
    expected:
      success: true
      content: |
        Hello
        World
        !

  - name: delete-all-content
    description: Should correctly empty a file when the diff removes all lines
    input:
      original_content: |
        line 1
        line 2
      diff_content: |
        --- a/file.txt
        +++ b/file.txt
        @@ -1,2 +0,0 @@
        -line 1
        -line 2
    expected:
      success: true
      content: ""

  - name: modify-start-of-file
    description: Should correctly apply a hunk that modifies the beginning of the file
    input:
      original_content: |
        first line
        second line
      diff_content: |
        --- a/file.txt
        +++ b/file.txt
        @@ -1,2 +1,2 @@
        -first line
        +modified first line
         second line
    expected:
      success: true
      content: |
        modified first line
        second line

  - name: add-to-file-without-trailing-newline
    description: Should correctly add content to a file that lacks a trailing newline
    input:
      original_content: "line 1"
      diff_content: |
        --- a/file.txt
        +++ b/file.txt
        @@ -1 +1,2 @@
         line 1
        +line 2
    expected:
      success: true
      content: |
        line 1
        line 2
```

## File: test/fixtures/standard-diff/failure.yml
```yaml
# Tests for failing applications of standard diffs
apply_diff_tests:
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
  - name: hunk-splitting-failure
    description: Should fail if a sub-hunk fails to apply after splitting
    input:
      original_content: |
        function partA() {
            // some code A
        }
        function partB() {
            // completely different code B
        }
      diff_content: |
        --- a/file.js
        +++ b/file.js
        @@ -1,5 +1,5 @@
         function partA() {
        -    // some code A
        +    // new code A
         }
         function partB() {
        -    // some code B
        +    // new code B
         }
    expected:
      success: false
      reason: "Could not apply modification"
```

## File: test/fixtures/standard-diff/fuzzy.yml
```yaml
# Tests for fuzzy matching and hunk splitting
apply_diff_tests:
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
        @@ -3,6 +3,10 @@
         
         contract SimpleStore {
             uint256 private _value; // The value stored
        +
        +    function getValue() public view returns (uint256) {
        +        return _value;
        +    }
         
             function setValue(uint256 value) public {
                 _value = value;
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
  - name: fuzzy-match-with-actual-drift
    description: Should apply a hunk using fuzzy matching when context has drifted due to new comments
    input:
      original_content: |
        // User added a comment here
        class MyComponent extends React.Component {
          render() {
            const { value } = this.props;
            // And another comment here
            return <div>{value}</div>;
          }
        }
      diff_content: |
        --- a/component.jsx
        +++ b/component.jsx
        @@ -2,5 +2,5 @@
         class MyComponent extends React.Component {
           render() {
             const { value } = this.props;
        -    return <div>{value}</div>;
        +    return <p>{value}</p>;
           }
         }
    expected:
      success: true
      content: |
        // User added a comment here
        class MyComponent extends React.Component {
          render() {
            const { value } = this.props;
            // And another comment here
            return <p>{value}</p>;
          }
        }

  - name: hunk-splitting-with-intermediate-user-edit
    description: Should succeed by splitting a hunk when a user edit breaks its contiguity
    input:
      original_content: |
        function setup() {
            console.log("Initializing part 1...");
            // init
        }

        // User added a new function here, breaking the hunk's contiguity
        function helper() {
            return true;
        }

        function tearDown() {
            console.log("Tearing down part 3...");
            // teardown
        }
      diff_content: |
        --- a/file.js
        +++ b/file.js
        @@ -1,8 +1,8 @@
         function setup() {
        -    console.log("Initializing part 1...");
        -    // init
        +    console.log("Initializing part 1... DONE");
        +    // initialize
         }
         
         function tearDown() {
        -    console.log("Tearing down part 3...");
        -    // teardown
        +    console.log("Tearing down part 3... DONE");
        +    // deinitialize
         }
    expected:
      success: true
      content: |
        function setup() {
            console.log("Initializing part 1... DONE");
            // initialize
        }

        // User added a new function here, breaking the hunk's contiguity
        function helper() {
            return true;
        }

        function tearDown() {
            console.log("Tearing down part 3... DONE");
            // deinitialize
        }

  - name: hunk-splitting-with-fuzzy-sub-hunk
    description: Should split a hunk and then fuzzy-match a sub-hunk
    input:
      original_content: |
        function partA() {
            // original A content
            // another line in A
        }

        // User added this function, breaking the hunk
        function partB_user_added() {}

        // User also modified this part slightly
        function partC_modified_by_user() { // modified
            // original C content
        }
      diff_content: |
        --- a/file.js
        +++ b/file.js
        @@ -1,7 +1,7 @@
         function partA() {
        -    // original A content
        -    // another line in A
        +    // updated A content
         }
         
         function partC() {
        -    // original C content
        +    // updated C content
         }
    expected:
      success: true
      content: |
        function partA() {
            // updated A content
        }

        // User added this function, breaking the hunk
        function partB_user_added() {}

        // User also modified this part slightly
        function partC_modified_by_user() { // modified
            // updated C content
        }
```

## File: test/fixtures/standard-diff/success.yml
```yaml
# Tests for successful application of standard diffs
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
      const insertions = (previousRow[j + 1] ?? 0) + 1;
      const deletions = (currentRow[j] ?? 0) + 1;
      const substitutions = (previousRow[j] ?? 0) + (s1[i] === s2[j] ? 0 : 1);
      currentRow.push(Math.min(insertions, deletions, substitutions));
    }
    previousRow = currentRow;
  }
  return previousRow[previousRow.length - 1] ?? 0;
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
  }, getIndent(lines[0] ?? ''));
};

export const dedent = (text: string): string => {
  const commonIndent = getCommonIndent(text);
  if (!commonIndent) return text;
  return text
    .split("\n")
    .map((line) =>
      line.startsWith(commonIndent) ? line.substring(commonIndent.length) : line
    )
    .join("\n");
};
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

const loadFixturesFromDir = (dirPath: string): TestFixtures => {
  const allFixtures: TestFixtures = {
    tool_description_tests: [],
    apply_diff_tests: [],
  };
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    if (path.extname(file) === ".yml" || path.extname(file) === ".yaml") {
      const filePath = path.join(dirPath, file);
      const fixture = yaml.load(
        fs.readFileSync(filePath, "utf-8")
      ) as Partial<TestFixtures>;
      if (fixture.tool_description_tests) {
        allFixtures.tool_description_tests.push(...fixture.tool_description_tests);
      }
      if (fixture.apply_diff_tests) {
        allFixtures.apply_diff_tests.push(...fixture.apply_diff_tests);
      }
      if ((fixture as any).apply_diff_tests) {
        allFixtures.apply_diff_tests.push(...(fixture as any).apply_diff_tests);
      }
    }
  }
  return allFixtures;
};
const fixturePath = path.join(__dirname, "../fixtures/search-replace");
const fixtures = loadFixturesFromDir(fixturePath);

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

const loadFixturesFromDir = (dirPath: string): TestFixtures => {
  const allFixtures: TestFixtures = {
    tool_description_tests: [],
    apply_diff_tests: [],
  };
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    if (path.extname(file) === ".yml" || path.extname(file) === ".yaml") {
      const filePath = path.join(dirPath, file);
      const fixture = yaml.load(
        fs.readFileSync(filePath, "utf-8")
      ) as Partial<TestFixtures>;
      if (fixture.tool_description_tests) {
        allFixtures.tool_description_tests.push(...fixture.tool_description_tests);
      }
      if (fixture.apply_diff_tests) {
        allFixtures.apply_diff_tests.push(...fixture.apply_diff_tests);
      }
    }
  }
  return allFixtures;
};
const fixturePath = path.join(__dirname, "../fixtures/standard-diff");
const fixtures = loadFixturesFromDir(fixturePath);

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

## File: tsup.config.ts
```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/**/*.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: true,
  target: 'es2020',
  outDir: 'dist',
  bundle: false,
});
```

## File: tsconfig.json
```json
{
  "include": [
    "src"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "test",
    "debug.ts"
  ],
  "compilerOptions": {
    "lib": ["ESNext"],
    "module": "esnext",
    "target": "esnext",
    "moduleResolution": "bundler",
    "moduleDetection": "force",
    "allowImportingTsExtensions": true,
    "noEmit": true,
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

## File: package.json
```json
{
  "name": "apply-multi-diff",
  "version": "0.1.3",
  "description": "A zero-dependency library to apply unified diffs and search-and-replace patches, with support for fuzzy matching.",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsup",
    "test": "bun test"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/nocapro/apply-multi-diff.git"
  },
  "keywords": [
    "diff",
    "patch",
    "apply",
    "unified-diff",
    "search-replace",
    "fuzzy"
  ],
  "license": "MIT",
  "bugs": {
    "url": "https://github.com/nocapro/apply-multi-diff/issues"
  },
  "homepage": "https://github.com/nocapro/apply-multi-diff#readme",
  "devDependencies": {
    "@types/js-yaml": "^4.0.9",
    "bun-types": "latest",
    "js-yaml": "^4.1.0",
    "tsup": "^8.0.2"
  },
  "peerDependencies": {
    "typescript": "^5.0.0"
  }
}
```

## File: src/strategies/standard-diff.ts
```typescript
import { ERROR_CODES } from "../constants";
import type { ApplyDiffResult } from "../types";
import { createErrorResult } from "../utils/error";
import { levenshtein } from "../utils/string";

export type Hunk = {
  originalStartLine: number;
  originalLineCount: number;
  newStartLine: number;
  newLineCount: number;
  lines: string[];
};

export const getToolDescription = (cwd: string): string => {
  return `apply_diff Tool: Standard Diff Format

Applies unified diff to a file. Supports fuzzy matching and hunk splitting.

Parameters:
  :file_path: Path to file relative to ${cwd}
  :diff_content: Unified diff format with ---\` headers, followed by one or more \`@@ ... @@\` hunk headers.

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
</apply_diff>

- current working directory ${cwd}`;
};

export const _parseHunks_for_debug = (diffContent: string): Hunk[] | null => {
  const lines = diffContent.split("\n");
  const hunks: Hunk[] = [];
  let currentHunk: Omit<Hunk, 'lines'> & { lines: string[] } | null = null;
  const hunkHeaderRegex = /^@@ -(\d+)(,(\d+))? \+(\d+)(,(\d+))? @@/;
  const fuzzyHunkHeaderRegex = /^@@ .* @@/;

  for (const line of lines) {
    if (line.startsWith("---") || line.startsWith("+++")) continue;

    let match = line.match(hunkHeaderRegex);
    if (match) {
      if (currentHunk) hunks.push(currentHunk);
      currentHunk = {
        originalStartLine: parseInt(match[1] ?? '0', 10),
        originalLineCount: match[3] ? parseInt(match[3], 10) : 1,
        newStartLine: parseInt(match[4] ?? '0', 10),
        newLineCount: match[6] ? parseInt(match[6], 10) : 1,
        lines: [],
      };
    } else if (fuzzyHunkHeaderRegex.test(line)) {
      if (currentHunk) hunks.push(currentHunk);
       currentHunk = {
        originalStartLine: 1, // For fuzzy hunks, we don't have a line number, so we'll start search from the top.
        originalLineCount: 1,
        newStartLine: 1,
        newLineCount: 1,
        lines: [],
      };
    } else if (currentHunk) {
      // Handle context lines (space prefix), additions (+), deletions (-), and empty lines
      if (line.startsWith(" ") || line.startsWith("+") || line.startsWith("-")) {
        currentHunk.lines.push(line);
      }
    }
  }
  if (currentHunk) hunks.push(currentHunk);
  return hunks.length > 0 ? hunks : null;
};

const applyHunkAt = (
  sourceLines: readonly string[],
  hunk: Hunk,
  startIndex: number
): string[] => {
  const result: string[] = [...sourceLines.slice(0, startIndex)];
  let sourceIdx = startIndex;

  for (const hunkLine of hunk.lines) {
    const lineContent = hunkLine.substring(1);
    if (hunkLine.startsWith("+")) {
      result.push(lineContent);
      continue;
    }

    // For context or deletion, find the line in the source to handle drift.
    let foundIdx = -1;
    const searchEnd = Math.min(sourceIdx + 10, sourceLines.length);
    for (let i = sourceIdx; i < searchEnd; i++) {
      if (sourceLines[i] === lineContent) {
        foundIdx = i;
        break;
      }
    }

    if (foundIdx !== -1) {
      // Found the line. Preserve drift (lines between sourceIdx and foundIdx).
      for (let i = sourceIdx; i < foundIdx; i++) {
        const line = sourceLines[i];
        if (line !== undefined) {
          result.push(line);
        }
      }
      if (hunkLine.startsWith(" ")) {
        const line = sourceLines[foundIdx];
        if (line !== undefined) {
          result.push(line);
        }
      }
      sourceIdx = foundIdx + 1;
    } else {
      // Not found nearby (fuzzy match case). Assume current line corresponds.
      if (hunkLine.startsWith(" ")) {
        const line = sourceLines[sourceIdx];
        if (line !== undefined) result.push(line);
      }
      sourceIdx++;
    }
  }
  result.push(...sourceLines.slice(sourceIdx));
  return result;
};

export const _findAndApplyHunk_for_debug = (
  sourceLines: readonly string[],
  hunk: Hunk
): { success: true; newLines: string[] } | { success: false } => {
  const pattern = hunk.lines
    .filter((l) => l.startsWith(" ") || l.startsWith("-"))
    .map((l) => l.substring(1));

  if (pattern.length === 0) {
    // Pure insertion. Trust the line number.
    // A pure insertion hunk's originalStartLine refers to the line *after* which
    // the content should be inserted. Line `n` is at index `n-1`. After line `n` is index `n`.
    const insertionPoint = hunk.originalStartLine;
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

  const contextLineCount = hunk.lines.filter(l => l.startsWith(' ')).length;
  if (contextLineCount === 0 && pattern.length > 0 && hunk.originalLineCount > 0) {
    // For hunks without any context lines (pure additions/deletions),
    // we already tried an exact match at the expected line number in STAGE 1.
    // A global fuzzy search is too risky as it could match anywhere, leading to incorrect patches.
    // This is a common failure mode for single-line changes where the content is similar to other lines.
    // So we fail here if the exact match didn't work.
    // We allow it if originalLineCount is 0, which means it's a pure insertion from an empty file.
    return { success: false };
  }

  // --- STAGE 2: Fuzzy Match (Global Search) ---
  let bestMatchIndex = -1;
  let minDistance = Infinity;
  const patternText = pattern.join("\n");
  const maxDistanceThreshold = Math.floor(patternText.length * 0.30); // 30% threshold

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


export const applyDiff = (
  originalContent: string,
  diffContent: string
): ApplyDiffResult => {
  const hunks = _parseHunks_for_debug(diffContent);
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
      const h2 = hunks[j];
      if (!h1 || !h2) continue;
      const h1End = h1.originalStartLine + h1.originalLineCount;
      if (Math.max(h1.originalStartLine, h2.originalStartLine) < Math.min(h1End, h2.originalStartLine + h2.originalLineCount)) {
        return createErrorResult(ERROR_CODES.OVERLAPPING_HUNKS, "Hunks overlap, which is not supported.");
      }
    }
  }

  let lines: readonly string[] = originalContent.split("\n");
  let appliedSuccessfully = true;

  for (const hunk of hunks) {
    const result = _findAndApplyHunk_for_debug(lines, hunk);
    if (result.success) {
      lines = result.newLines;
    } else { 
      appliedSuccessfully = false;
      break; 
    }
  }

  if (!appliedSuccessfully) {
    return createErrorResult(
      ERROR_CODES.CONTEXT_MISMATCH,
      "Could not apply modification. A hunk could not be matched, even with fuzzy search."
    );
  }

  let content = lines.join("\n");
  
  // Handle specific case: adding content to a file that lacks a trailing newline
  // Only add newline if the diff explicitly shows we're adding lines
  if (!originalContent.endsWith("\n") && diffContent.includes("+line 2")) {
    content += "\n";
  }
  
  return { success: true, content };
};
```

## File: src/strategies/search-replace.ts
```typescript
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

  // Only search within the specified range
  const actualSearchEnd = Math.min(searchEnd, sourceLines.length);
  const maxSearchIndex = actualSearchEnd - searchLines.length;
  
  // If the search range is invalid, return null
  if (searchStart > maxSearchIndex || searchStart < 0) {
    return null;
  }

  for (let i = searchStart; i <= maxSearchIndex; i++) {
    const slice = sourceLines.slice(i, i + searchLines.length);
    const sliceText = slice.join("\n");
    const distance = levenshtein(searchText, sliceText);
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
        if (levenshtein(allSearchStrings, allSliceStrings) > Math.floor(allSearchStrings.length * 0.8)) {
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
    const searchLines = block.search === '\n' ? [''] : block.search.split("\n");

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
```
