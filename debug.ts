import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import {
  applyDiff as applySearchReplace,
  _parseDiff_for_debug,
  _findBestMatch_for_debug,
} from "./src/strategies/search-replace";
import {
  applyDiff as applyStandardDiff,
  _parseHunks_for_debug,
  _findAndApplyHunk_for_debug,
  _splitHunk_for_debug,
  type Hunk,
} from "./src/strategies/standard-diff";
import { getCommonIndent, dedent } from './src/utils/string';

// --- Types from tests ---
interface ApplyDiffTestCase {
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
}

interface TestFixtures {
  apply_diff_tests: ApplyDiffTestCase[];
}

// --- Helper to load fixtures ---
const loadFixturesFromDir = (dirPath: string): ApplyDiffTestCase[] => {
  let allTests: ApplyDiffTestCase[] = [];
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    if (path.extname(file) === ".yml" || path.extname(file) === ".yaml") {
      const filePath = path.join(dirPath, file);
      const fixture = yaml.load(
        fs.readFileSync(filePath, "utf-8")
      ) as Partial<TestFixtures>;
      if (fixture.apply_diff_tests) {
        allTests.push(...fixture.apply_diff_tests);
      }
    }
  }
  return allTests;
};

// --- Test Cases ---
const searchReplaceFixtures = loadFixturesFromDir(
  path.join(__dirname, "test/fixtures/search-replace")
);
const standardDiffFixtures = loadFixturesFromDir(
  path.join(__dirname, "test/fixtures/standard-diff")
);

// --- CONFIGURATION ---
const FAILING_SEARCH_REPLACE_TESTS = [
  'fuzzy-match-accept-minor-string-literal-change', // Loses trailing comment
  'replace-with-regex-special-chars', // Loses prefix/suffix on same line
  'remove-extra-blank-lines', // Fails to find a single blank line
  'unicode-characters-replace', // Loses prefix/suffix on same line
  'constrained-search-with-end-line', // Incorrectly replaces line
];

const FAILING_STANDARD_DIFF_TESTS = [
  'hunk-splitting-failure', // A sub-hunk fails to apply
  'add-to-file-without-trailing-newline', // Doesn't add trailing newline when needed
  'large-hunk-split-with-fuzzy-subhunks', // A fuzzy sub-hunk fails to apply
];

const TEST_TO_RUN = FAILING_SEARCH_REPLACE_TESTS[0]; // <-- CHANGE INDEX TO DEBUG DIFFERENT TESTS
const STRATEGY: "search-replace" | "standard-diff" = "search-replace";

// --- Deep Debugger for Search/Replace ---
const debugSearchReplace = (testCase: ApplyDiffTestCase) => {
  console.log('--- DEEP DEBUG: SEARCH/REPLACE ---');
  const { original_content, diff_content, start_line, end_line } = testCase.input;
  const options = { start_line, end_line };

  console.log('\n[1] Parsing Diff Content...');
  const blocks = _parseDiff_for_debug(diff_content);
  if (!blocks) { console.error('Failed to parse blocks.'); return; }
  console.log(`Found ${blocks.length} block(s).`);

  let currentContent = original_content;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    console.log(`\n--- Processing Block ${i + 1} ---`);
    console.log('Search Block:\n---', `\n${block.search}`, '\n---');
    console.log('Replace Block:\n---', `\n${block.replace}`, '\n---');

    if (block.search === "") { console.log('Skipping deep debug for insertion block.'); continue; }

    const sourceLines = currentContent.split("\n");
    const searchLines = block.search.split("\n");

    console.log('\n[2] Finding Best Match...');
    const match = _findBestMatch_for_debug(sourceLines, searchLines, options.start_line ?? 1, options.end_line ?? sourceLines.length);

    if (!match) { console.error('No match found.'); continue; }
    console.log(`Match found: index=${match.index}, distance=${match.distance}`);

    const { index: matchStartIndex } = match;
    const matchEndIndex = matchStartIndex + searchLines.length;

    console.log('\n[3] Preparing Replacement...');
    const sourceMatchBlock = sourceLines.slice(matchStartIndex, matchEndIndex).join('\n');
    const sourceMatchIndent = getCommonIndent(sourceMatchBlock);
    console.log(`Source Match Block (at index ${matchStartIndex}):\n---`, `\n${sourceMatchBlock}`, '\n---');
    console.log(`Inferred Indent: '${sourceMatchIndent}' (length: ${sourceMatchIndent.length})`);

    const replaceLines = block.replace ? block.replace.split('\n') : [];
    const replaceBaseIndent = getCommonIndent(block.replace);
    console.log(`Replace Base Indent: '${replaceBaseIndent}' (length: ${replaceBaseIndent.length})`);

    const reindentedReplaceLines = replaceLines.map((line: string) => {
      if (line.trim() === "") return "";
      const dedentedLine = line.startsWith(replaceBaseIndent)
        ? line.substring(replaceBaseIndent.length)
        : line;
      return sourceMatchIndent + dedentedLine;
    });

    console.log('Re-indented Replace Lines:\n---', `\n${reindentedReplaceLines.join('\n')}`, '\n---');

    console.log('\n[4] Applying Slice...');
    console.log(`Splicing out ${matchEndIndex - matchStartIndex} line(s) from index ${matchStartIndex}.`);
  }
};

// --- Deep Debugger for Standard Diff ---
const debugStandardDiff = (testCase: ApplyDiffTestCase) => {
  console.log('--- DEEP DEBUG: STANDARD DIFF ---');
  const { original_content, diff_content } = testCase.input;

  console.log('\n[1] Parsing Hunks...');
  const hunks = _parseHunks_for_debug(diff_content);
  if (!hunks) { console.error('Failed to parse hunks.'); return; }
  console.log(`Found ${hunks.length} hunk(s).`);

  let lines: readonly string[] = original_content.split("\n");

  for (const hunk of hunks) {
    console.log(`\n--- Processing Hunk (original line ${hunk.originalStartLine}) ---`);
    console.log(hunk.lines.join('\n'));

    console.log('\n[2] Applying Hunk...');
    const result = _findAndApplyHunk_for_debug(lines, hunk);
    if (result.success) {
      console.log('Hunk applied successfully.');
      lines = result.newLines;
    } else {
      console.log('Hunk application failed. Attempting to split...');
      const subHunks = _splitHunk_for_debug(hunk);
      if (subHunks.length <= 1) {
        console.log('Could not split hunk further. Failing.');
        break;
      }
      console.log(`Split into ${subHunks.length} sub-hunk(s).`);
      for (const subHunk of subHunks) {
        console.log('\n-- Applying Sub-Hunk --');
        console.log(subHunk.lines.join('\n'));
        const subResult = _findAndApplyHunk_for_debug(lines, subHunk);
        if (subResult.success) {
          console.log('Sub-hunk applied successfully.');
          lines = subResult.newLines;
        } else {
          console.error('Sub-hunk failed to apply. Aborting split.');
          break;
        }
      }
    }
  }
};


// --- Runner ---
const runTest = () => {
  const isSr = STRATEGY === "search-replace";
  const fixtures = isSr ? searchReplaceFixtures : standardDiffFixtures;
  const testCase = fixtures.find((t) => t.name === TEST_TO_RUN);

  if (!testCase) {
    console.error(`Test case "${TEST_TO_RUN}" not found in ${STRATEGY} fixtures.`);
    return;
  }

  console.log(`--- Running Test: ${testCase.name} ---`);
  console.log(`Description: ${testCase.description}\n`);

  isSr ? debugSearchReplace(testCase) : debugStandardDiff(testCase);

  const applyFn = isSr ? applySearchReplace : applyStandardDiff;

  // @ts-ignore
  const result = applyFn(
    testCase.input.original_content,
    testCase.input.diff_content,
    { start_line: testCase.input.start_line, end_line: testCase.input.end_line }
  );

  console.log("\n\n--- EXPECTED ---");
  console.log(JSON.stringify(testCase.expected, null, 2));
  console.log("\n\n--- ACTUAL ---");
  console.log(JSON.stringify(result, null, 2));

  console.log("\n\n--- COMPARISON ---");
  if (result.success !== testCase.expected.success) {
    console.log(`❌ Success mismatch: expected ${testCase.expected.success}, got ${result.success}`);
  } else {
    console.log(`✅ Success matches: ${result.success}`);
  }

  if (result.success && testCase.expected.success) {
    if (result.content !== testCase.expected.content) {
      console.log("❌ Content mismatch!");
      console.log("--- Expected Content ---", JSON.stringify(testCase.expected.content));
      console.log("--- Actual Content ---", JSON.stringify(result.content));
    } else {
      console.log("✅ Content matches!");
    }
  }

  if (!result.success && !testCase.expected.success && testCase.expected.reason) {
    if (!result.error.message.includes(testCase.expected.reason)) {
      console.log(`❌ Reason mismatch: expected to include "${testCase.expected.reason}", got "${result.error.message}"`);
    } else {
      console.log(`✅ Reason matches.`);
    }
  }
};

runTest();
