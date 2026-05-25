const getStatementCodes = (statement) =>
  String(statement?.code || "")
    .split("+")
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean);

const scoreStatementCodes = (statement, scoreCode) => {
  const codes = getStatementCodes(statement);
  if (codes.length === 0) return 0;
  return Math.max(...codes.map(scoreCode));
};

const scoreHazardCode = (code) => {
  if (/^H3(00|01|04|10|11|14|18|30|31)\b/.test(code)) return 100;
  if (/^H2(00|01|02|03|20|21|22|23|24|25|26|27|28)\b/.test(code)) {
    return 90;
  }
  if (/^H2(80|90)\b/.test(code)) return 80;
  if (/^H3(15|17|19|35|36|37)\b/.test(code)) return 50;
  return 10;
};

const scorePrecautionCode = (code) => {
  if (/^P3(01|02|03|04|05|06|08|10|11|12|13|14|15|20|21|30|31)\b/.test(code)) {
    return 100;
  }
  if (/^P2(60|61|64|71|80|84)\b/.test(code)) return 90;
  if (/^P3/.test(code)) return 80;
  if (/^P4/.test(code)) return 50;
  if (/^P5/.test(code)) return 30;
  return 10;
};

const prioritizeStatements = (statements, scoreCode) =>
  [...statements]
    .map((statement, index) => ({
      statement,
      index,
      score: scoreStatementCodes(statement, scoreCode),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ statement }) => statement);

export const prioritizeHazardStatements = (statements) =>
  prioritizeStatements(statements, scoreHazardCode);

export const prioritizePrecautionaryStatements = (statements) =>
  prioritizeStatements(statements, scorePrecautionCode);
