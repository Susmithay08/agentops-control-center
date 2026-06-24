// Static code analysis.
// Extracts real signals from actual source code text. These signals feed the
// AI Evaluation Engine (services/evaluation.js) so that scores reflect the
// code that was submitted, not random seed values.

const SECRET_PATTERNS = [
  /(password|passwd|pwd)\s*[:=]\s*['"][^'"]{3,}['"]/gi,
  /(api[_-]?key|apikey|secret|access[_-]?token|auth[_-]?token)\s*[:=]\s*['"][^'"]{6,}['"]/gi,
  /AKIA[0-9A-Z]{16}/g, // AWS access key id
  /sk-[a-zA-Z0-9]{20,}/g, // OpenAI-style secret key
  /xox[baprs]-[0-9a-zA-Z-]{10,}/g, // Slack token
  /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/g,
];

const SQLI_PATTERNS = [
  // String concatenation building a SQL statement
  /(SELECT|INSERT|UPDATE|DELETE)\b[^;'"`]*['"`]\s*\+\s*\w/gi,
  // Template literal interpolation inside a SQL statement
  /(SELECT|INSERT|UPDATE|DELETE)\b[^;`]*\$\{/gi,
  // query()/execute() called with a concatenated argument
  /\b(query|execute|raw)\s*\(\s*[`'"][^`'"]*['"`]\s*\+/gi,
];

const EVAL_PATTERNS = [
  /\beval\s*\(/g,
  /new\s+Function\s*\(/g,
  /\bchild_process\b|\.exec(Sync)?\s*\(/g,
  /\bsetTimeout\s*\(\s*['"`]/g, // string-arg setTimeout (implicit eval)
];

function countMatches(text, patterns) {
  let n = 0;
  for (const re of patterns) {
    const m = text.match(re);
    if (m) n += m.length;
  }
  return n;
}

export function analyzeCode(code, opts = {}) {
  const text = String(code || '');
  const lines = text.split('\n');
  const codeLines = lines.map((l) => l.trim()).filter((l) => l && !l.startsWith('//') && !l.startsWith('*'));
  const loc = codeLines.length || 1;

  // --- security signals ---
  const hardcodedSecrets = countMatches(text, SECRET_PATTERNS);
  const sqlInjection = countMatches(text, SQLI_PATTERNS);
  const unsafeEval = countMatches(text, EVAL_PATTERNS);

  // Missing input validation: external inputs referenced minus validation calls.
  const inputs = (text.match(/req\.(body|query|params)|process\.argv|JSON\.parse\(/g) || []).length;
  const validations = (text.match(/\b(validate|zod|joi|yup|schema|sanitize|escape|assert|typeof|Number\.is|isNaN)\b/gi) || []).length;
  const missingValidation = Math.max(0, inputs - validations);

  // --- maintainability signals ---
  const functionCount =
    (text.match(/function\s+\w+|=>\s*\{|\b\w+\s*\([^)]*\)\s*\{/g) || []).length || 1;
  const avgFunctionLength = Math.round(loc / functionCount);

  const meaningful = codeLines.filter((l) => l.length > 15);
  const uniqueLines = new Set(meaningful);
  const duplicationRatio = meaningful.length ? (meaningful.length - uniqueLines.size) / meaningful.length : 0;

  const names = [...text.matchAll(/(?:const|let|var|function|class)\s+([a-zA-Z_$][\w$]*)/g)].map((m) => m[1]);
  const goodNames = names.filter((n) => n.length >= 3 && !/^(tmp|val|data|foo|bar|x|y|z|a|b|i|j)$/i.test(n)).length;
  const namingQuality = names.length ? goodNames / names.length : 0.85;

  // --- complexity (approx cyclomatic) ---
  const branches = (text.match(/\b(if|for|while|case|catch|else if)\b|\?\s|&&|\|\|/g) || []).length;
  const complexity = Math.min(30, 1 + branches);

  // --- test coverage ---
  const hasTests = /\b(describe|it|test|expect|assert|toBe|toEqual)\s*\(/.test(text);
  const testCoverage =
    typeof opts.testCoverage === 'number' ? opts.testCoverage : hasTests ? 82 : 48;

  return {
    loc,
    functionCount,
    complexity,
    testCoverage,
    hardcodedSecrets,
    sqlInjection,
    unsafeEval,
    missingValidation,
    avgFunctionLength,
    duplicationRatio: Number(duplicationRatio.toFixed(3)),
    namingQuality: Number(namingQuality.toFixed(3)),
  };
}
