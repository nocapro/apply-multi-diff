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

export const __LAST_MODIFIED__ = '2025-09-20 04:58:24';
