# TokenIQ — AI ROI Intelligence Platform

**Attribution of AI spending per PR. Multi-model cost analytics. LLM-powered insights.**

## 🎯 Problem Statement

Teams use AI coding assistants (ChatGPT, Claude, GitHub Copilot) but **don't know:**
- How much each PR costs to analyze
- Which AI models are most efficient for different code patterns
- Whether their estimation formulas match real OpenAI/Anthropic spending
- If specific models are overspending on certain PR types

Result: Blind AI budgets. No ROI visibility. Impossible to optimize spending.

## 💡 Solution

**TokenIQ** connects GitHub PR metadata with AI token/cost analytics to:

1. **Estimate AI costs** from PR size (lines changed, files affected)
2. **Support multiple providers** (OpenAI, Anthropic, GitHub Copilot)
3. **Compare estimated vs actual costs** — validate your cost formulas against real API usage
4. **Generate AI insights** — LLM analyzes each PR to explain model efficiency and cost variance
5. **Track cost trends** — see where AI spending creates value

### Key Features

- **📊 Cost Breakdown** — By PR size, model, provider, and over time
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
200+ PRs with:
- ✅ Estimated costs (formula-based)
- ✅ Actual costs (synthetic OpenAI data)
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
GitHub PR Data → Estimate Costs (formula) → Compare with Actual (API) → Generate Insights (LLM)
```

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
- [ ] Real-time OpenAI usage sync
- [ ] Cost forecasting / budgeting
- [ ] Slack alerts for overspending
- [ ] Custom cost formulas per team
- [ ] A/B test models on specific PR types

---

**Ready to understand your AI ROI?** Start the demo and navigate to **Cost Verification** to see the magic. 🚀
