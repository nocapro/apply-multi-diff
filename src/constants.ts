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