export type DiffError = {
  code: string;
  message: string;
};

export type ApplyDiffResult =
  | { success: true; content: string }
  | { success: false; error: DiffError };