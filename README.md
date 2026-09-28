# SynerEduc

**School management SaaS running in production for three private schools in Brazil — academic operations, administration, finance, and four distinct AI patterns in one platform.**

The source code is not public: the system holds real student and staff records, including enrollment documents with government IDs. This repository documents the architecture.

---

## What it is

SynerEduc serves two operationally isolated segments — **distance learning (EAD)** and **in-person** — across three paying schools and 700+ students, with 10 user profiles and 8 role-specific dashboards.

Built from scratch over roughly a year by a single developer, then rolled out one segment at a time:

| When | What went live |
|---|---|
| **January 2026** | First school in production — Colégio Conexão, EAD segment |
| **April 2026** | In-person segment added, mid school year, alongside the existing one |
| **August 2026** | Two more schools onboarded — CEDAC and Colégio Ariane |

Adding the in-person segment to a system already serving live students, without downtime and without disturbing the EAD side, is why segment isolation runs as its own axis in the schema rather than as a flag in the UI.

| | |
|---|---|
| **In production since** | January 2026 |
| **Paying schools** | 3 |
| **Students served** | 700+ |
| **Codebase** | ~68,000 lines of TypeScript across 202 files |
| **Database** | 70 tables, PostgreSQL 17 |
| **Row Level Security** | 347 policies, RLS enabled on 72 tables |
| **Edge Functions** | 8, all JWT-authenticated |
| **Tests** | Vitest, 173 passing |

---

## Multi-tenant isolation

Tenant isolation is enforced **in the database, not in the application**. Every request carries a JWT; policies resolve the caller's school from it and filter rows server-side. The frontend cannot bypass it, and neither can a malformed query.

- **60 of 70 tables** carry `escola_id`
- **248 of 347 RLS policies** filter by school
- The remaining tables are pre-tenant by design (sales funnel, referrals) or inherit isolation from their parent row
- A regression test asserts that no policy grants access by user role without also scoping to a school, to a user, or to an explicit super-admin exception

Segment isolation (EAD vs in-person) runs as a second, independent axis on top of school isolation.

---

## Architecture

| Layer | Technology |
|---|---|
| Frontend | React 18 · TypeScript · Vite · Tailwind CSS |
| UI | shadcn/ui (Radix primitives) |
| Backend | Supabase — PostgreSQL 17, PostgREST, Auth |
| Serverless | Supabase Edge Functions (Deno) |
| LLM | Anthropic Claude — Sonnet and Haiku, routed by task complexity |
| Vector search | Pinecone — `multilingual-e5-large`, 1024 dims |
| Infrastructure | Terraform — remote backend, SQS, CloudWatch, Secrets Manager |
| CI | GitHub Actions — install, test, build on every push and PR |

---

## AI: four patterns, one of them an actual agent

The distinction matters, and most systems blur it.

**Gabriela — agent with tool use.** The only component that qualifies as an agent. Claude receives a question and a set of typed tools, decides autonomously which to call and in what order, queries the live database through them, reasons over the results and composes the answer. It never executes free-form SQL — only validated function calls. Available tools vary by user role.

**Sofia — RAG chatbot.** Retrieval plus generation, no actions and no tools. Embeds the question, pulls the most relevant chunks of course material from Pinecone, and answers with them in context.

**Structured generation.** Lesson plans and adapted pedagogical documents: guided input plus retrieved context in, formatted document out.

**Vision and speech.** Enrollment forms are read from PDF or photo into structured JSON; voice input is transcribed and interpreted into intent.

**Cost control.** Model choice is routed by task complexity, and per-call token use and cost are written to an audit table. Cost per conversation is a measured number, not an estimate.

---

## Security

- JWT required on all 8 Edge Functions; authorization derives from the token, never from the request body
- Role allowlists, payload size limits, prompt-injection guards in every AI system prompt
- Human-in-the-loop gates on irreversible actions
- MIME allowlists and size limits on uploads, client and server
- CPF/RG and address restricted to the roles that need them, masked elsewhere at the view level
- LGPD consent captured at enrollment, with timestamp

---

## Engineering practice

- Grade calculation lives in one module and is unit-tested — SQL-side formulas were removed after producing wrong results
- Dates are constructed locally to avoid a UTC-3 off-by-one-day class of bug
- Schema changes go through versioned migrations, with rollbacks kept alongside
- Issue templates and a documented workflow; architecture decisions recorded with their reasoning

---

## Author

**José João Santos Júnior** — São Luís, Maranhão, Brazil

Eighteen years running schools before writing the system that runs them. Computer Engineering in progress; B.A. in Administration.

[LinkedIn](https://www.linkedin.com/in/jrsantosdev1) · [GitHub](https://github.com/jjsjunior3)
