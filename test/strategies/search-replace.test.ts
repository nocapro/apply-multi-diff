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