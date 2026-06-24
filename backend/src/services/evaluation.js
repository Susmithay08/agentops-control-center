// AI Evaluation Engine
// -------------------------------------------------------------
// Computes per-run scores from static-analysis-style signals:
//   - Output Quality Score (0-100)
//   - Security Score (0-100)
//   - Maintainability Score (0-100)
//   - Test Coverage Score (0-100)
//   - Overall AI Run Health Score (0-100)
//
// The `signals` object simulates what a real static analyzer / test
// runner would extract from the generated code for a run.

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

// --- Security Score -------------------------------------------------
// Penalize hardcoded secrets, SQL injection patterns, unsafe eval, and
// missing input validation.
export function securityScore(signals) {
  let score = 100;
  const findings = [];

  if (signals.hardcodedSecrets > 0) {
    score -= signals.hardcodedSecrets * 22;
    findings.push(`${signals.hardcodedSecrets} hardcoded secret(s)`);
  }
  if (signals.sqlInjection > 0) {
    score -= signals.sqlInjection * 25;
    findings.push(`${signals.sqlInjection} SQL injection pattern(s)`);
  }
  if (signals.unsafeEval > 0) {
    score -= signals.unsafeEval * 18;
    findings.push(`${signals.unsafeEval} unsafe eval usage`);
  }
  if (signals.missingValidation > 0) {
    score -= signals.missingValidation * 10;
    findings.push(`${signals.missingValidation} unvalidated input(s)`);
  }

  return { score: clamp(score), findings };
}

// --- Maintainability Score ------------------------------------------
// Consider function length, duplication and naming quality.
export function maintainabilityScore(signals) {
  let score = 100;
  const findings = [];

  // Long functions: penalty grows past a 40-line budget.
  if (signals.avgFunctionLength > 40) {
    const penalty = Math.min(30, (signals.avgFunctionLength - 40) * 0.8);
    score -= penalty;
    findings.push(`long functions (avg ${signals.avgFunctionLength} lines)`);
  }
  // Duplication ratio 0..1
  if (signals.duplicationRatio > 0.05) {
    const penalty = Math.min(30, (signals.duplicationRatio - 0.05) * 120);
    score -= penalty;
    findings.push(`${Math.round(signals.duplicationRatio * 100)}% duplication`);
  }
  // Naming quality 0..1 (1 = excellent)
  if (signals.namingQuality < 0.8) {
    const penalty = (0.8 - signals.namingQuality) * 60;
    score -= penalty;
    findings.push('inconsistent naming');
  }

  return { score: clamp(score), findings };
}

// --- Output Quality Score -------------------------------------------
// 100 - complexity penalties - security penalties + test coverage bonus
export function qualityScore(signals, security) {
  let score = 100;

  // Complexity penalty (cyclomatic complexity above a budget of 8).
  const complexityPenalty = Math.min(35, Math.max(0, signals.complexity - 8) * 2.2);
  score -= complexityPenalty;

  // Security penalty derived from the security score.
  const securityPenalty = (100 - security.score) * 0.25;
  score -= securityPenalty;

  // Test coverage bonus (coverage 0..100 -> up to +12).
  const coverageBonus = (signals.testCoverage / 100) * 12;
  score += coverageBonus;

  return clamp(score);
}

// --- Health Score ----------------------------------------------------
// Weighted blend used as the overall "AI Run Health Score".
export function healthScore({ quality, security, maintainability, testCoverage }) {
  return clamp(
    quality * 0.4 + security * 0.25 + maintainability * 0.2 + testCoverage * 0.15
  );
}

// Evaluate a full run from its raw signals.
export function evaluateRun(signals) {
  const security = securityScore(signals);
  const maintainability = maintainabilityScore(signals);
  const quality = qualityScore(signals, security);
  const testCoverage = clamp(signals.testCoverage);
  const health = healthScore({
    quality,
    security: security.score,
    maintainability: maintainability.score,
    testCoverage,
  });

  return {
    qualityScore: quality,
    securityScore: security.score,
    securityFindings: security.findings,
    maintainabilityScore: maintainability.score,
    maintainabilityFindings: maintainability.findings,
    testCoverageScore: testCoverage,
    healthScore: health,
  };
}
