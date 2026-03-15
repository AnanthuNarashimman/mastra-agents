# 🎯 YC Job Hunter Agent

An AI agent that searches Y Combinator's company database, filters by country, industry, batch, or any keyword, and exports results to a formatted Excel file — all from a single natural language prompt.

---

## 🧰 Tech Stack

![Mastra](https://img.shields.io/badge/Mastra-Framework-black?style=for-the-badge)
![Google Gemini](https://img.shields.io/badge/Gemini_2.5_Flash_Lite-4285F4?style=for-the-badge&logo=google&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js_%3E%3D22-339933?style=for-the-badge&logo=node.js&logoColor=white)
![ExcelJS](https://img.shields.io/badge/ExcelJS-217346?style=for-the-badge&logo=microsoft-excel&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-3E67B1?style=for-the-badge)

| Layer | Technology |
|---|---|
| Agent Framework | [Mastra](https://mastra.ai) |
| LLM | Google Gemini 2.5 Flash Lite via `@ai-sdk/google` |
| Language | TypeScript (ESM) |
| Runtime | Node.js >= 22.13.0 |
| Data Source | [YC Company API](https://api.ycombinator.com/v0.1) (public, no auth needed) |
| Excel Export | ExcelJS |
| Schema Validation | Zod |

---

## ✨ What It Does

- **Search** YC companies by country, industry, batch, stage, or any keyword
- **Paginate automatically** — loops through all result pages (up to 200 companies by default)
- **Export to Excel** — formatted `.xlsx` with YC orange headers, zebra striping, clickable hyperlinks, and auto-filters
- **Single prompt** — just describe what you want in plain English

---

## 📁 Project Structure

```
job-hunter-agent/
├── src/
│   └── mastra/
│       ├── index.ts                      # Mastra instance + agent registration
│       ├── agents/
│       │   └── yc-hunter-agent.ts        # Agent definition, model, instructions
│       └── tools/
│           └── yc-tools.ts               # All tools (search, fetch, export)
├── patches/
│   └── @mastra+yc-hn-tools+0.0.7.patch  # Compatibility fixes (auto-applied on install)
├── output/                               # Generated Excel files saved here
├── .env                                  # Your API keys (never commit this)
├── .env.example                          # Template for required env vars
└── package.json
```

---

## ⚙️ Setup

### 1. Prerequisites

- **Node.js >= 22.13.0** — [Download](https://nodejs.org)
- **Google Gemini API key** — [Get one free at Google AI Studio](https://aistudio.google.com/app/apikey)

### 2. Clone & Install

```bash
git clone <repo-url>
cd job-hunter-agent
npm install
```

> `npm install` automatically runs `patch-package` via the `postinstall` hook, applying compatibility fixes to `@mastra/yc-hn-tools`. No manual steps needed.

### 3. Configure API Keys

Copy the example env file:

```bash
cp .env.example .env
```

Open `.env` and set your key:

```env
GOOGLE_GENERATIVE_AI_API_KEY=your-google-ai-api-key-here
```

That's the only key required. The YC Company API is public and needs no authentication.

### 4. Run

```bash
npm run dev
```

This starts the Mastra development server. Open the playground URL shown in your terminal (usually `http://localhost:4111`), select **YC Job Hunter**, and start prompting.

---

## 🤖 Using the Agent

### Example Prompts

| Prompt | What happens |
|---|---|
| `Find YC companies based in India` | Searches and lists top results |
| `Find YC fintech companies from batch W24` | Filters by industry + batch |
| `Find all active B2B SaaS companies` | Fetches and lists results |
| `Get Indian YC startups and export to Excel` | Fetches all pages + writes `.xlsx` |
| `Find healthcare companies and save as a file` | Same — exports to `output/` folder |

**Tip:** Words like "export", "save", "download", or "give me a file" trigger the combined fetch-and-export tool — the agent fetches all matching pages and writes the Excel file in one shot.

---

## 🛠️ Tools Reference

| Tool | Description | When the agent uses it |
|---|---|---|
| `ycSearchTool` | Single-page search (20 results) | Quick lookups |
| `ycDetailTool` | Fetch one company by its YC slug | Looking up a specific company |
| `ycFetchAllTool` | Paginated fetch, returns full list | Browse large datasets |
| `ycFetchAndExportTool` | Paginated fetch + Excel export in one shot | Any export / save / download request |
| `exportToExcelTool` | Write a companies array to `.xlsx` | Standalone export step |

### How Pagination Works

The YC API returns **20 companies per page**. `ycFetchAllTool` and `ycFetchAndExportTool` loop automatically:

```
Page 0 → reads totalPages from API response
Page 1, 2, 3 ... → fetches until totalPages OR maxPages is hit
```

- Default cap: **10 pages = up to 200 companies**
- Stops early if the query has fewer results than the cap
- The loop condition: `while (page < totalPages && page < maxPages)`

---

## 📊 Excel Output

Files are saved to the `output/` directory (created automatically if it doesn't exist).

Each file includes:

- **YC orange (`#FF6600`) header row** with bold white text
- **Frozen header** row — stays visible when scrolling
- **Zebra-striped rows** for readability
- **Clickable hyperlinks** on Website and YC Profile columns
- **Auto-filter** on all columns

**Columns exported:**

| Company | One-liner | Batch | Status | Team Size | Website | Tags | Industries | Location | Regions | YC Profile |

---

## 🩹 About the Patches

`@mastra/yc-hn-tools@0.0.7` was published with bugs that break it against `@mastra/core@1.13.x`. The `patches/` directory contains fixes managed by [`patch-package`](https://github.com/ds300/patch-package):

| File | Problem | Fix applied |
|---|---|---|
| `package.json` | `"@mastra/core": "latest"` — `"latest"` is not valid semver, crashes the Mastra CLI | Changed to `"*"` |
| `dist/ycapi.js` | Imports `createTool` from `@mastra/core` (removed in v1.13.x) | Fixed import to `@mastra/core/tools` |
| `dist/ycapi.js` | `execute({ context, mastra })` — old API; new API passes input directly | Changed to `execute(context)` |
| `dist/hnapi.js` | Same import + signature issues as `ycapi.js` | Same fixes |

Patches are applied automatically on every `npm install` via the `postinstall` hook. You never need to apply them manually.

---

## 📚 Documentation

| Resource | Link |
|---|---|
| Mastra Docs | [mastra.ai/docs](https://mastra.ai/docs) |
| Mastra Agents | [mastra.ai/docs/agents/overview](https://mastra.ai/docs/agents/overview) |
| Mastra Tools | [mastra.ai/docs/agents/using-tools](https://mastra.ai/docs/agents/using-tools) |
| Mastra Workflows | [mastra.ai/docs/workflows/overview](https://mastra.ai/docs/workflows/overview) |
| Mastra Studio (Playground) | [mastra.ai/docs/getting-started/studio](https://mastra.ai/docs/getting-started/studio) |
| Mastra Cloud Deployment | [mastra.ai/docs/deployment/overview](https://mastra.ai/docs/deployment/overview) |
| Google AI SDK | [sdk.vercel.ai/providers/ai-sdk-providers/google-generative-ai](https://sdk.vercel.ai/providers/ai-sdk-providers/google-generative-ai) |
| Google AI Studio (get API key) | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) |
| patch-package | [github.com/ds300/patch-package](https://github.com/ds300/patch-package) |

---

## 🧑‍💻 Scripts

```bash
npm run dev      # Start Mastra dev server with live reload → http://localhost:4111
npm run build    # Build for production
npm run start    # Start production server
```
