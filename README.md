# TokenIQ — AI ROI Intelligence Platform

**AI platform observability for provider/model usage, tokens, latency, cost, and request traces.**

## 🎯 Problem Statement

Teams use OpenAI, Anthropic, and local LLMs but **don't know:**
- Which provider, model version, and request generated a cost
- Token consumption, latency, and failures across their AI platform
- Which AI models are most efficient for different code patterns
- Whether their estimation formulas match real OpenAI/Anthropic spending
- If specific models are overspending on certain PR types

Result: Blind AI budgets. No ROI visibility. Impossible to optimize spending.

## 💡 Solution

**TokenIQ** collects actual usage events alongside GitHub PR estimates to:

1. **Estimate AI costs** from PR size (lines changed, files affected)
2. **Support multiple providers** (OpenAI, Anthropic, GitHub Copilot)
3. **Ingest actual API usage** — OpenAI organization buckets or request-level events from Anthropic/local collectors
4. **Generate AI insights** — LLM analyzes each PR to explain model efficiency and cost variance
5. **Track cost trends** — see where AI spending creates value

### Key Features

- **📊 Metrics API** — Request counts, input/output/cached tokens, latency, errors, and cost
- **🧭 Request Tracing** — Request, trace, and span identifiers retained with provider/model attribution
- **🔍 Cost Verification** — Compare estimated costs (from formula) vs actual costs (from API)
- **🤖 AI-Generated Insights** — OpenAI analyzes each PR: *"gpt-4o-mini efficiently handled 42-line PR, 15% cheaper than estimated"*
- **📈 Model Performance Analysis** — Which models work best for small/medium/large PRs?
- **🔗 Multi-Provider Support** — Anthropic Claude, OpenAI GPT-4, GitHub Copilot pricing side-by-side
- **🔐 Secure Integration** — Encrypted API keys, OAuth-ready auth system

## 👥 Intended For

- **Engineering Teams** — Understand AI tool ROI on code reviews and development
- **Finance/CFOs** — Track and forecast AI spending with model-level granularity
- **DevOps/Platform Teams** — Optimize AI integration costs across teams
- **Product Managers** — Measure AI feature value vs cost per PR
- **AI/ML Teams** — Benchmark model efficiency and cost on real production code

## 🚀 Quick Start (Demo)

### 1. Clone & Install
```bash
git clone <repo>
cd tokeniq
npm install
```

### 2. Start Dev Server
```bash
npm run dev
```

### 3. Open & Login
- Visit: **http://localhost:3000**
- Email: `demo@example.com`
- Password: `demo123`

### 4. View Demo Data
200+ seeded PR estimates with:
- ✅ Estimated costs (formula-based)
- ✅ A real telemetry collector ready for provider events
- ✅ AI-generated insights
- ✅ Cost variance analysis (+30%, +1650%, etc.)

## 📌 What to Observe in the Demo

### 1. **Cost Breakdown Page**
   - 📊 Total estimated cost: **$1.58** for 203 PRs
   - 📍 **Cost by PR Size** — See 7-bucket distribution (0-50 lines, 50-100, etc.)
   - 🏆 **Top 10 Expensive PRs** — Click to see:
     - Which model was used (OpenAI, Anthropic, GitHub)
     - Estimated vs actual cost
     - **AI Insight:** *"claude-3-5-sonnet efficiently handled large refactor, only 12% over budget"*

### 2. **Cost Verification Page** ⭐ (Most Important)
   - 💰 **Estimated Total:** $1.58 | **Actual Total:** $4.93
   - 📊 **Model Performance Insights** — Cards showing:
     - Which models overran budget (gpt-4o: +1650%)
     - Which models stayed efficient (gpt-4o-mini: -8%)
   - 🎯 **Accuracy:** Shows if your estimation formula is realistic
   - ✨ **Key Insight:** Actual costs are 3.1x higher → formula needs tuning

### 3. **Model Distribution Page**
   - Compare costs across **OpenAI vs Anthropic vs GitHub**
   - See per-author breakdown
   - Identify which models are used most

### 4. **Repositories Page**
   - Shows how to connect real GitHub repos
   - "Sync Now" button to fetch PRs and generate estimates
   - Ready for live integration (just add GitHub PAT + API keys)

## 🔧 Technical Highlights

### Stack
- **Frontend:** Next.js 16 (App Router), React, Tailwind, Recharts
- **Backend:** Next.js API routes, Prisma ORM
- **Database:** SQLite (dev), ready for PostgreSQL
- **Auth:** NextAuth.js with credentials + encryption
- **AI Integration:** OpenAI API for insights generation

### Architecture
```
OpenAI ─────┐
Anthropic ──┼──► Usage Collector ──► Usage Metadata ──► Metrics API
Local LLM ──┘                              │                │
                                          Cost / Tokens / Latency
                                                           │
                                             Dashboard + Model Analysis
```

### Actual usage ingestion

`POST /api/usage/sync` fetches real OpenAI organization completion usage into durable, idempotent usage events. It requires an OpenAI **Admin API key** and is available from the Integrations page.

For Anthropic, local models, gateways, or application SDK instrumentation, send normalized request events to `POST /api/usage/ingest`:

```json
{
  "events": [{
    "provider": "anthropic",
    "model": "claude-sonnet-4",
    "modelVersion": "2026-01-01",
    "requestId": "req_123",
    "traceId": "trace_abc",
    "spanId": "span_01",
    "sourceEventId": "gateway-req_123",
    "startedAt": "2026-08-27T10:00:00Z",
    "latencyMs": 842,
    "inputTokens": 1250,
    "outputTokens": 320,
    "cachedTokens": 400,
    "costUsd": 0.0098,
    "statusCode": 200
  }]
}
```

`sourceEventId` makes retries idempotent. The Metrics API (`GET /api/metrics?days=30`) exposes aggregated provider/model/version metrics, recent events, and trace groups. OpenAI's organization endpoint is aggregate usage, so it cannot supply individual request IDs or latency; SDK/gateway events provide that request-level visibility.

### Hiding demo data

Set `SHOW_SYNTHETIC_DATA=false` in `.env.local` and restart the server to remove seeded PR estimates from the Dashboard, PR Analytics, Cost, Cost Verification, and Model Analysis pages. Actual collector events remain visible.

Use **Generate insights** on Cost Breakdown to generate up to ten concise OpenAI insights for unprocessed live PR estimates at a time. This uses the connected OpenAI inference key; an OpenAI Admin key used for organization usage sync does not itself grant model-inference access.

### Multi-Provider Support
```typescript
// Extensible design for new providers
Providers: OpenAI | Anthropic | GitHub Copilot | Cursor
Each has: Model list, pricing, usage API, cost calculation
```

### LLM-Powered Insights
- Analyzes PR characteristics (size, type, files changed)
- Queries OpenAI GPT-4o-mini to generate per-PR summaries
- Highlights: efficiency, cost accuracy, suitability for PR type
- Example: *"gpt-4o handled 245-line medium PR well but 1650% over estimated — recalibrate formula"*

## 📊 Demo Data Observations

**Why is Actual ($4.93) > Estimated ($1.58)?**

The demo uses proportional allocation from OpenAI's aggregate usage. Real-world scenario:
- Your daily OpenAI bill: $100
- Your formula estimated: $5 for all PRs
- TokenIQ allocates the $100 proportionally across 203 PRs
- Result: Some PRs show 1000%+ variance (realistic for tuning your formula)

**This is the power of TokenIQ:** You now see where your formula is wrong.

## 📝 Database & Insights

- **203 PRs seeded** with realistic distributions
- **Provider/Model mix:**
  - OpenAI: gpt-4o, gpt-4o-mini (40%)
  - Anthropic: claude-3-5-sonnet, claude-3-opus (35%)
  - GitHub: copilot-gpt-4 (25%)
- **Insights:** Each PR has AI-generated analysis of cost efficiency
- **Database:** SQLite at `prisma/dev.db` (216KB)

## 🎮 Interactive Features to Try

1. **Sort by Variance** — Which models overspent the most?
2. **Filter by Size** — Do large PRs always cost more?
3. **Export CSV** — (Ready to implement) Share cost reports with finance
4. **Model Comparison** — Switch between Anthropic/OpenAI insights for same PR
5. **Add Real Repo** — Connect your GitHub repo to see live data

## 🔮 Future Enhancements

- [ ] Live GitHub integration (currently reads existing PR data)
- [x] OpenAI organization usage sync
- [x] Provider-agnostic request event ingestion
- [ ] Cost forecasting / budgeting
- [ ] Slack alerts for overspending
- [ ] Custom cost formulas per team
- [ ] A/B test models on specific PR types

---

**Ready to understand your AI ROI?** Start the demo and navigate to **Cost Verification** to see the magic. 🚀
