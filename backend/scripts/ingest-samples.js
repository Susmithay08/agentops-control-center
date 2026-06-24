// Ingest a handful of REAL code samples through POST /api/runs and print the
// scores the evaluation engine computes from the actual code.
//
// Usage (backend must be running):
//   node scripts/ingest-samples.js
//   API_BASE=http://localhost:4000 node scripts/ingest-samples.js

const API_BASE = process.env.API_BASE || 'http://localhost:4000';

const samples = [
  {
    label: 'Clean, tested utility',
    agentName: 'Claude Code',
    modelName: 'claude-sonnet-4-6',
    taskType: 'Test Generation',
    files: ['src/lib/money.ts', 'tests/money.spec.ts'],
    code: `export function computeTotal({ subtotal, discount, taxRate }) {
  const validate = (n, name) => {
    if (typeof n !== 'number' || Number.isNaN(n)) throw new Error(name + ' must be a number');
    return n;
  };
  const discounted = validate(subtotal, 'subtotal') * (1 - validate(discount, 'discount'));
  return Number((discounted * (1 + validate(taxRate, 'taxRate'))).toFixed(2));
}

describe('computeTotal', () => {
  it('applies tax after discount', () => {
    expect(computeTotal({ subtotal: 100, discount: 0.1, taxRate: 0.2 })).toBe(108);
  });
  it('rejects non-numeric input', () => {
    expect(() => computeTotal({ subtotal: 'x', discount: 0, taxRate: 0 })).toThrow();
  });
});`,
  },
  {
    label: 'Hardcoded secret + unsafe eval',
    agentName: 'OpenAI Codex',
    modelName: 'gpt-4o',
    taskType: 'Code Generation',
    files: ['src/integrations/webhook.js'],
    code: `const apiKey = "sk-live-9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c";
const password = "SuperSecret123!";

function handleWebhook(req) {
  const payload = req.body.payload;
  const result = eval(payload.expression);            // unsafe eval of user input
  return fetch('https://api.example.com/notify', {
    headers: { Authorization: 'Bearer ' + apiKey },
    body: JSON.stringify({ result }),
  });
}`,
  },
  {
    label: 'SQL injection via string concatenation',
    agentName: 'Cursor',
    modelName: 'gpt-4o',
    taskType: 'Code Review',
    files: ['src/db/users.js'],
    code: `async function findUser(req, db) {
  const name = req.query.name;
  const sql = "SELECT * FROM users WHERE name = '" + name + "'";   // SQL injection
  const rows = await db.query(sql);
  const sql2 = \`DELETE FROM sessions WHERE user = \${req.query.id}\`;  // interpolated SQL
  await db.execute(sql2);
  return rows;
}`,
  },
  {
    label: 'Long, duplicated, poorly named function',
    agentName: 'Internal Agent',
    modelName: 'gemini-1.5-flash',
    taskType: 'Refactoring',
    files: ['src/legacy/proc.js'],
    code: `function doStuff(a, b, c, d) {
  let x = 0;
  if (a > 0) { x = x + a; } else { x = x - a; }
  if (b > 0) { x = x + b; } else { x = x - b; }
  if (c > 0) { x = x + c; } else { x = x - c; }
  if (d > 0) { x = x + d; } else { x = x - d; }
  let y = 0;
  if (a > 0) { y = y + a; } else { y = y - a; }
  if (b > 0) { y = y + b; } else { y = y - b; }
  if (c > 0) { y = y + c; } else { y = y - c; }
  if (d > 0) { y = y + d; } else { y = y - d; }
  for (let i = 0; i < a; i++) { x += i; }
  for (let i = 0; i < b; i++) { y += i; }
  return x > y ? x : y;
}`,
  },
  {
    label: 'Well-documented API handler',
    agentName: 'Claude Code',
    modelName: 'claude-opus-4-8',
    taskType: 'Documentation',
    files: ['src/api/orders.ts'],
    code: `/**
 * List orders for the authenticated account, paginated.
 * @param {Request} req - expects validated query: page, size
 * @returns {Promise<{ data: Order[], page: number, total: number }>}
 */
export async function listOrders(req, res) {
  const page = Number.isFinite(+req.query.page) ? Math.max(1, +req.query.page) : 1;
  const size = Math.min(100, Number(req.query.size) || 20);
  const { rows, total } = await orderRepository.paginate({ page, size });
  return res.json({ data: rows, page, total });
}`,
  },
];

async function post(path, body) {
  const res = await fetch(API_BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-role': 'admin' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${res.status}: ${json.message || JSON.stringify(json)}`);
  return json;
}

async function main() {
  console.log(`Ingesting ${samples.length} real code samples into ${API_BASE}\n`);
  for (const s of samples) {
    const run = await post('/api/runs', s);
    const m = run.metrics;
    const findings = [...(m.securityFindings || []), ...(m.maintainabilityFindings || [])];
    console.log(`• ${s.label}`);
    console.log(`    ${run.id}  agent=${run.agentName}  model=${run.modelName}  →  ${run.status}`);
    console.log(`    quality=${m.qualityScore}  security=${m.securityScore}  maintainability=${m.maintainabilityScore}  coverage=${m.testCoverageScore}  HEALTH=${m.healthScore}`);
    if (findings.length) console.log(`    findings: ${findings.join('; ')}`);
    console.log('');
  }
  console.log('Done. Open the Agent Runs page (sorted by newest) to see them.');
}

main().catch((e) => {
  console.error('Ingestion failed:', e.message);
  console.error('Is the backend running on', API_BASE, '?');
  process.exit(1);
});
