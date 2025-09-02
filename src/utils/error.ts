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