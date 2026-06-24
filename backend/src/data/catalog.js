// Static reference catalog: providers, models, agents, task profiles.
// Pricing is per 1K tokens (USD) and is representative, not authoritative.

export const MODELS = [
  { id: 'mdl_claude_opus', provider: 'Claude', name: 'claude-opus-4-8', tier: 'frontier', pricePer1k: 0.015, baseLatencyMs: 7200, qualityBias: 12 },
  { id: 'mdl_claude_sonnet', provider: 'Claude', name: 'claude-sonnet-4-6', tier: 'balanced', pricePer1k: 0.006, baseLatencyMs: 4200, qualityBias: 8 },
  { id: 'mdl_claude_haiku', provider: 'Claude', name: 'claude-haiku-4-5', tier: 'fast', pricePer1k: 0.0015, baseLatencyMs: 1800, qualityBias: 3 },
  { id: 'mdl_gpt_4o', provider: 'GPT', name: 'gpt-4o', tier: 'frontier', pricePer1k: 0.01, baseLatencyMs: 6200, qualityBias: 9 },
  { id: 'mdl_gpt_4o_mini', provider: 'GPT', name: 'gpt-4o-mini', tier: 'fast', pricePer1k: 0.0008, baseLatencyMs: 2200, qualityBias: 2 },
  { id: 'mdl_gemini_pro', provider: 'Gemini', name: 'gemini-1.5-pro', tier: 'frontier', pricePer1k: 0.0085, baseLatencyMs: 5600, qualityBias: 7 },
  { id: 'mdl_gemini_flash', provider: 'Gemini', name: 'gemini-1.5-flash', tier: 'fast', pricePer1k: 0.0007, baseLatencyMs: 2000, qualityBias: 1 },
  { id: 'mdl_copilot', provider: 'Copilot', name: 'copilot-gpt-4', tier: 'balanced', pricePer1k: 0.005, baseLatencyMs: 3800, qualityBias: 5 },
];

export const AGENTS = [
  { id: 'agt_claude_code', name: 'Claude Code', vendor: 'Anthropic', reliabilityBias: 0.04 },
  { id: 'agt_cursor', name: 'Cursor', vendor: 'Anysphere', reliabilityBias: 0.0 },
  { id: 'agt_copilot', name: 'GitHub Copilot', vendor: 'GitHub', reliabilityBias: -0.01 },
  { id: 'agt_codex', name: 'OpenAI Codex', vendor: 'OpenAI', reliabilityBias: -0.02 },
  { id: 'agt_internal', name: 'Internal Agent', vendor: 'Platform Team', reliabilityBias: -0.05 },
];

// Which models each agent is allowed to drive (realistic coupling).
export const AGENT_MODELS = {
  agt_claude_code: ['mdl_claude_opus', 'mdl_claude_sonnet', 'mdl_claude_haiku'],
  agt_cursor: ['mdl_claude_sonnet', 'mdl_gpt_4o', 'mdl_gemini_pro', 'mdl_gpt_4o_mini'],
  agt_copilot: ['mdl_copilot', 'mdl_gpt_4o'],
  agt_codex: ['mdl_gpt_4o', 'mdl_gpt_4o_mini'],
  agt_internal: ['mdl_gemini_pro', 'mdl_gemini_flash', 'mdl_claude_haiku'],
};

export const TEAMS = [
  { id: 'team_platform', name: 'Platform Engineering' },
  { id: 'team_payments', name: 'Payments' },
  { id: 'team_growth', name: 'Growth' },
  { id: 'team_data', name: 'Data & ML' },
  { id: 'team_mobile', name: 'Mobile' },
];

export const FIRST_NAMES = ['Ava', 'Liam', 'Noah', 'Mia', 'Ethan', 'Sofia', 'Lucas', 'Priya', 'Omar', 'Chen', 'Maya', 'Diego', 'Aisha', 'Kenji', 'Lena', 'Marcus'];
export const LAST_NAMES = ['Patel', 'Kim', 'Garcia', 'Nguyen', 'Okafor', 'Rossi', 'Cohen', 'Müller', 'Silva', 'Tanaka', 'Novak', 'Haddad'];

// Prompt summaries keyed by task type for realistic run detail pages.
export const PROMPT_TEMPLATES = {
  'Code Generation': [
    'Implement a paginated REST endpoint for the orders service',
    'Generate a React hook for debounced search input',
    'Create a CSV export utility with streaming support',
    'Build a rate limiter middleware using a token bucket',
  ],
  'Code Review': [
    'Review the new authentication middleware for security issues',
    'Audit the payments reconciliation module for edge cases',
    'Review the database migration for backward compatibility',
    'Assess the caching layer changes for race conditions',
  ],
  'Test Generation': [
    'Generate unit tests for the invoice calculation service',
    'Write integration tests for the webhook delivery pipeline',
    'Add property-based tests for the pricing engine',
    'Create regression tests for the auth token refresh flow',
  ],
  Refactoring: [
    'Refactor the notification service to use the event bus',
    'Extract the validation logic into a reusable module',
    'Migrate the user repository from callbacks to async/await',
    'Decompose the monolithic checkout handler',
  ],
  Documentation: [
    'Document the public API for the billing service',
    'Write an architecture decision record for the cache redesign',
    'Generate JSDoc for the analytics SDK',
    'Produce an onboarding guide for the deployment pipeline',
  ],
};

export const FILE_POOL = [
  'src/services/orders.ts', 'src/lib/cache.ts', 'src/api/auth.ts', 'src/utils/csv.ts',
  'src/components/Search.tsx', 'src/db/migrations/0042_orders.sql', 'src/middleware/ratelimit.ts',
  'src/services/payments.ts', 'tests/orders.spec.ts', 'src/hooks/useDebounce.ts',
  'src/events/bus.ts', 'src/repositories/user.ts', 'docs/architecture.md',
];

export const FAILURE_REASONS = [
  'Tool execution timeout after 120s',
  'Test suite failed: 3 assertions did not pass',
  'Compilation error: type mismatch in generated code',
  'Context window exceeded for the target repository',
  'Sandbox network policy blocked dependency install',
  'Model returned malformed diff that could not be applied',
  'Rate limited by upstream provider (429)',
];
