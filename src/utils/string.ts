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