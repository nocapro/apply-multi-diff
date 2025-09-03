# apply-multi-diff

> **Robust, dual-strategy diff application for Node.js and browser environments**
> Apply standard unified diffs *or* semantic search-and-replace patches to source files with **fuzzy-matching**, **indentation-preserving insertions**, and **hunk-splitting** fallbacks.

[![npm version](https://badge.fury.io/js/apply-multi-diff.svg)](https://www.npmjs.com/package/apply-multi-diff)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/nocapro/apply-multi-diff/blob/main/LICENSE)
[![CI](https://github.com/nocapro/apply-multi-diff/actions/workflows/ci.yml/badge.svg)](https://github.com/nocapro/apply-multi-diff/actions)

---

## Installation

```bash
npm install apply-multi-diff
# or
yarn add apply-multi-diff
# or
bun add apply-multi-diff
```

---

## Quick Start

```ts
import { applyStandardDiff, applySearchReplace } from 'apply-multi-diff';

const original = `function add(a, b) {
  return a + b;
}`;

// 1. Standard unified diff
const diff = `--- a/math.ts
+++ b/math.ts
@@ -1,3 +1,3 @@
 function add(a, b) {
-  return a + b;
+  return a + b + 1;
 }`;

const result1 = applyStandardDiff(original, diff);
console.log(result1.success && result1.content);
// → function add(a, b) {
//     return a + b + 1;
//   }

// 2. Search-replace (with fuzzy matching & auto-indent)
const replace = `math.ts
<<<<<<< SEARCH
  return a + b;
=======
  return a - b;
>>>>>>> REPLACE`;

const result2 = applySearchReplace(original, replace);
console.log(result2.success && result2.content);
// → function add(a, b) {
//     return a - b;
//   }
```

---

## Core Features

| Feature | Standard Diff | Search-Replace |
|---------|---------------|----------------|
| **Format** | Unified diff (`---`, `+++`, `@@`) | `<<<<<<< SEARCH`, `=======`, `>>>>>>> REPLACE` |
| **Multi-hunk** | ✅ | ✅ (multiple blocks per call) |
| **Fuzzy match** | ✅ (Levenshtein + context drift) | ✅ (Levenshtein + string-literal guard) |
| **Hunk splitting** | ✅ (fallback on failure) | — |
| **Indentation aware** | — | ✅ (preserves surrounding indent) |
| **Insert / Delete** | Pure addition / deletion hunks | Empty SEARCH or REPLACE block |
| **Target by line range** | — | `start_line` / `end_line` |
| **Unicode safe** | ✅ | ✅ |

---

## API

### 1. `applyStandardDiff(originalContent, diffContent)`

Apply a standard unified diff.

```ts
import { applyStandardDiff } from 'apply-multi-diff';

const res = applyStandardDiff(src, diff);
if (!res.success) {
  console.error(res.error.code, res.error.message);
}
```

### 2. `applySearchReplace(originalContent, diffContent, options?)`

Apply one or more search-replace blocks.

```ts
import { applySearchReplace } from 'apply-multi-diff';

const res = applySearchReplace(
  original,
  diffContent,
  { start_line: 42, end_line: 50 } // optional
);
```

#### Options

| Key | Type | Purpose |
|-----|------|---------|
| `start_line` | `number` | First line to consider when searching (1-based) |
| `end_line` | `number` | Last line to consider when searching (1-based) |

---

### Utility exports

```ts
import {
  getStandardDiffToolDescription,   // Markdown help for LLM agents
  getSearchReplaceToolDescription,  // Markdown help for LLM agents
  ERROR_CODES,                      // Constant error codes
  levenshtein,                      // Edit-distance helper
  getCommonIndent, dedent           // Indentation helpers
} from 'apply-multi-diff';
```

---

## LLM Integration Guide

> **TL;DR for agents**
> Use **Search-Replace** when you want **precise, targeted edits** (add import, rename function, delete block).
> Use **Standard Diff** when you have a **complete diff from git** (multi-hunk, moved code).
> When in doubt, start with Search-Replace—its fuzzy matcher is more forgiving of small source drift.

### 1. Decide which strategy to use

| Task Example | Recommended Strategy | Why |
|--------------|----------------------|-----|
| “Add a new import line at the top of the file.” | **Search-Replace** | One-line insertion with `start_line: 1` is trivial. |
| “Rename the function `oldName` to `newName` everywhere.” | **Search-Replace** | Single search/replace block; fuzzy matching tolerates comment drift. |
| “Apply the diff I just got from `git diff`.” | **Standard Diff** | Already in unified diff format; multi-hunk & context lines handled automatically. |
| “Delete the entire `legacy()` function.” | **Search-Replace** | Empty REPLACE block; no need for full diff. |
| “Apply 5 hunks across 3 files that touch imports, logic, and tests.” | **Standard Diff** (per file) | Hunk-splitting & exact context matching is built-in. |

### 2. Prompt templates for the LLM

#### A. Search-Replace (most common)

```xml
<apply_diff file_path="src/components/Header.tsx" start_line="3">
Header.tsx
<<<<<<< SEARCH
import React from 'react';
=======
import React, { useState } from 'react';
>>>>>>> REPLACE
</apply_diff>
```

- Provide `start_line` (and optionally `end_line`) whenever the search text may appear **multiple times** in the file.
- Leave SEARCH empty for **pure insertion**; leave REPLACE empty for **pure deletion**.

#### B. Standard Diff

```xml
<apply_diff file_path="src/utils/math.ts">
--- a/src/utils/math.ts
+++ b/src/utils/math.ts
@@ -10,7 +10,7 @@
 export function add(a: number, b: number): number {
-  return a + b;
+  return a + b + 1;
 }
</apply_diff>
```

- Do **not** alter spacing or context lines—the library uses them for exact matching.
- If the diff is large, the library will automatically split failed hunks and retry with fuzzy matching.

### 3. Handling ambiguous or failing patches

| Symptom | LLM action |
|---------|------------|
| “Search block not found” | 1. Ask the LLM to loosen the search (shorter snippet, remove comments).  <br>2. Provide `start_line`/`end_line` to disambiguate. |
| “Hunks overlap” (Standard Diff) | Split the diff into smaller logical pieces and apply them one file at a time. |
| “Insertion requires a start_line” | Supply `start_line: N` where `N` is **the line number *before*** which the new code should appear. |
| “Could not apply modification” (context drift) | Switch to **Search-Replace** with a shorter search snippet—its fuzzy matcher is more tolerant. |

### 4. Quick reference flowchart

```
┌────────────────────────────────────────────┐
│ Need to change code?                       │
└──────────────┬─────────────────────────────┘
               │
   ┌───────────┴───────────┐
   │ Is the change already  │  YES  →  Use Standard Diff
   │ a full git diff?       │
   └───────────┬───────────┘
               │ NO
   ┌───────────┴───────────┐
   │ Targeted edit,        │  YES  →  Use Search-Replace
   │ single block?         │
   └───────────┬───────────┘
               │ NO
   ┌───────────┴───────────┐
   │ Large multi-hunk,     │  YES  →  Use Standard Diff
   │ contiguous changes?   │
   └───────────┬───────────┘
               │ NO
   ┌───────────┴───────────┐
   │ Mixed / unsure → start with Search-Replace,
   │ fallback to Standard Diff if it fails.
   └───────────────────────┘
```

---

## Usage Examples

### 1. Insert new import at a specific line

```ts
const patch = `src/app.ts
<<<<<<< SEARCH
=======
import { logger } from './logger';
>>>>>>> REPLACE`;

applySearchReplace(content, patch, { start_line: 1 });
```

### 2. Delete a deprecated function

```ts
const patch = `src/legacy.ts
<<<<<<< SEARCH
function old() {
  console.warn('deprecated');
}
=======
>>>>>>> REPLACE`;
```

### 3. Handle user edits with hunk-splitting (standard diff)

Even if the user added unrelated code between hunks, the library splits the failing hunk and applies each valid sub-part.

---

## Error Handling

Both strategies return a discriminated union:

```ts
type ApplyDiffResult =
  | { success: true; content: string }
  | {
      success: false;
      error: { code: string; message: string };
    };
```

Common `error.code` values:

- `INVALID_DIFF_FORMAT`
- `OVERLAPPING_HUNKS`
- `CONTEXT_MISMATCH`
- `SEARCH_BLOCK_NOT_FOUND`
- `INSERTION_REQUIRES_LINE_NUMBER`

---

## Directory Structure

```
src/
  strategies/
    standard-diff.ts   # Unified diff parser & applier
    search-replace.ts  # Search/replace parser & applier
  utils/
    error.ts           # createErrorResult helper
    logger.ts          # Simple console logger
    string.ts          # levenshtein, getCommonIndent, dedent
  constants.ts         # ERROR_CODES
  types.ts             # ApplyDiffResult, DiffError
test/
  fixtures/            # 200+ YAML-driven test cases
  strategies/
    standard-diff.test.ts
    search-replace.test.ts
debug.ts               # CLI tool to step through failing tests
```

---

## Testing

Uses Bun’s built-in test runner:

```bash
bun test
```

The repo contains **200+ declarative test cases** in `test/fixtures/` covering:

- Edge cases (empty files, unicode, trailing newlines)
- Fuzzy matching (minor comment drift)
- Overlapping hunks & ambiguous matches
- Indentation preservation
- Insertion & deletion scenarios

---

## Contributing

1. Fork the repo
2. `bun install`
3. Write/fix code & add tests under `test/fixtures/`
4. `bun test`
5. PR with a clear description

---

## License

MIT © [nocapro](https://github.com/nocapro)
