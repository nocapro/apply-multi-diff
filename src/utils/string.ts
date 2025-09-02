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
      const insertions = previousRow[j + 1] + 1;
      const deletions = currentRow[j] + 1;
      const substitutions = previousRow[j] + (s1[i] === s2[j] ? 0 : 1);
      currentRow.push(Math.min(insertions, deletions, substitutions));
    }
    previousRow = currentRow;
  }
  return previousRow[previousRow.length - 1];
};

export const getIndent = (line: string): string =>
  line.match(/^[ \t]*/)?.[0] || "";

export const getCommonIndent = (text: string): string => {
  const lines = text.split("\n").filter((line) => line.trim() !== "");
  if (lines.length === 0) {
    return "";
  }

  let shortestIndent = getIndent(lines[0]);
  for (let i = 1; i < lines.length; i++) {
    const indent = getIndent(lines[i]);
    if (indent.length < shortestIndent.length) {
      shortestIndent = indent;
    }
  }
  return shortestIndent;
};