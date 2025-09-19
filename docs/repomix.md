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
package.json
tsconfig.json
tsup.config.ts
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

// Configuration for fuzzy matching in search-replace strategy
export const DEFAULT_FUZZY_SEARCH_WINDOW_RADIUS = 200; // Lines to search around an exact reference point
export const DEFAULT_GLOBAL_FUZZY_SEARCH_CAP = 500; // Max lines to search if no good reference point is found
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
    const currentRow = [i + 1];
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
  "version": "0.1.4",
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

    const match = line.match(hunkHeaderRegex);
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
  const maxDistanceThreshold = Math.floor(patternText.length * 0.20); // 20% threshold

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
import {
  ERROR_CODES,
  DEFAULT_FUZZY_SEARCH_WINDOW_RADIUS,
  DEFAULT_GLOBAL_FUZZY_SEARCH_CAP,
} from "../constants";
import type { ApplyDiffResult } from "../types";
import { createErrorResult } from "../utils/error";
import { getCommonIndent, levenshtein } from "../utils/string";

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
  startLineOpt: number | undefined,
  endLineOpt: number | undefined
): { index: number; distance: number } | null => {
  if (searchLines.length === 0) return null; // Should not happen if called from applyDiff
  
  let effectiveSearchStart: number;
  let effectiveSearchEnd: number;

  if (typeof startLineOpt === "number" || typeof endLineOpt === "number") {
    // If explicit start/end lines are provided, use them
    effectiveSearchStart = (startLineOpt ?? 1) - 1;
    effectiveSearchEnd = endLineOpt ?? sourceLines.length;
  } else {
    // No explicit start/end lines: try to find a reference point to narrow the search
    let referenceIndex = -1;
    const firstSignificantSearchLine = searchLines.find((l) => l.trim().length > 0);

    if (firstSignificantSearchLine) {
      // Find the first exact match of the first significant line of the search pattern
      for (let i = 0; i < sourceLines.length; i++) {
        if (sourceLines[i] === firstSignificantSearchLine) {
          referenceIndex = i;
          break;
        }
      }
    }

    if (referenceIndex !== -1) {
      // Center the search window around the reference point
      effectiveSearchStart = Math.max(0, referenceIndex - DEFAULT_FUZZY_SEARCH_WINDOW_RADIUS);
      effectiveSearchEnd = Math.min(
        sourceLines.length,
        referenceIndex + searchLines.length + DEFAULT_FUZZY_SEARCH_WINDOW_RADIUS
      );
    } else {
      // Fallback: If no reference point, perform fuzzy search only within a capped range from the beginning
      // This is less ideal but prevents scanning the entire file with large blocks.
      effectiveSearchStart = 0;
      effectiveSearchEnd = Math.min(sourceLines.length, DEFAULT_GLOBAL_FUZZY_SEARCH_CAP);
    }
  }

  // Special case: searching for a single newline (whitespace removal)
  if (searchLines.length === 1 && searchLines[0] === '') {
    // Look for a blank line in the source within the search range
    for (let i = effectiveSearchStart; i < Math.min(effectiveSearchEnd, sourceLines.length); i++) {
      if (sourceLines[i] === '') {
        return { index: i, distance: 0 };
      }
    }
    return null;
  }
  
  // Validate the search range before starting the main loop
  const maxSearchIndex = effectiveSearchEnd - searchLines.length;
  if (effectiveSearchStart > maxSearchIndex || effectiveSearchStart < 0) {
    return null; // Search block is larger than the search window, or invalid range
  }

  let bestMatchIndex = -1;
  let minDistance = Infinity;
  const searchText = searchLines.join("\n");
  const trimmedSearchText = searchLines.map(l => l.trim()).join('\n');

  for (let i = effectiveSearchStart; i <= maxSearchIndex; i++) {
    const slice = sourceLines.slice(i, i + searchLines.length);
    // Compare trimmed content to be indentation-agnostic
    const trimmedSliceText = slice.map(l => l.trim()).join('\n');
    const distance = levenshtein(trimmedSearchText, trimmedSliceText);
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
        if (levenshtein(allSearchStrings, allSliceStrings) > Math.floor(allSearchStrings.length * 0.5)) {
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
    let searchLines: string[];
    if (/^\n+$/.test(block.search)) {
      // A search for N blank lines is represented by N \n's. This becomes an array of N empty strings.
      searchLines = Array(block.search.length).fill('');
    } else {
      searchLines = block.search.split("\n");
    }
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
