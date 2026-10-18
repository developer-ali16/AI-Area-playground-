

https://github.com/user-attachments/assets/1fc3d885-5d2d-4f34-8081-062fe26748d3














# AI Arena

AI Arena is a full-stack web application designed for evaluating and benchmarking AI model responses side-by-side. Users enter a prompt and compare answers from selected AI models concurrently, tracking real latency, response tokens, and speed (tokens/sec).

---

## Key Features

- **Genuine Google Gemini Integration**: Built using the official `@google/genai` TypeScript SDK on the server-side runtime.
- **Side-by-Side Arena Columns**: Responsive desktop multi-column viewport (2 to 4 models) with synchronised metrics, plus an accessible mobile stacked/tabbed view.
- **Pre-Architected Multi-Provider Registry**: Modular provider interface (`AIProvider`) pre-wired for Anthropic Claude and OpenAI GPT alongside Google Gemini, with explicit configuration status reporting.
- **Labeled Demo Mode**: Toggleable offline benchmark simulation mode (`[Demo Mode]`) to explore multi-column UI comparisons without requiring secondary API keys.
- **Granular Telemetry**: Records per-provider duration (ms), prompt tokens, completion tokens, total tokens, and computed tokens per second.
- **Per-Model Actions**: Copy response, expand fullscreen read modal, and regenerate individual model answers without re-running the entire batch.
- **Resilient Concurrency & Error Containment**: Per-provider timeouts, partial success preservation (if one model times out or errors, others still render), rate-limit handling, and input validation.
- **Dark & Light Themes**: Accessible color contrast with system preference detection and manual toggle.
- **Evaluation History**: Stores comparison runs locally to easily reload past prompts and results.

---

## Architecture

```
/
├── server.ts                  # Express full-stack entry point + Vite middleware integration
├── src/
│   ├── server/
│   │   ├── routes/
│   │   │   └── api.ts         # /api/health, /api/providers, /api/compare, /api/regenerate
│   │   └── providers/
│   │       ├── base.ts        # AIProvider interface and ProviderError definitions
│   │       ├── gemini.ts      # GeminiProvider using official @google/genai SDK
│   │       ├── future-providers.ts # AnthropicProvider, OpenAIProvider, DemoProvider
│   │       └── registry.ts    # ProviderRegistry, concurrency orchestration & timeouts
│   ├── shared/
│   │   └── types.ts           # Shared TypeScript types for API contracts
│   ├── services/
│   │   └── api.ts             # Client API service
│   ├── components/
│   │   ├── Header.tsx         # Navbar with theme toggle, demo switch & status
│   │   ├── PromptEditor.tsx   # Prompt input, model selectors, benchmark presets
│   │   ├── ComparisonView.tsx # Multi-column comparison grid & mobile switcher
│   │   ├── ResponseCard.tsx   # Per-model output card, telemetry & actions
│   │   ├── ArchitectureModal.tsx # Transparency modal explaining provider connectivity
│   │   └── HistoryDrawer.tsx  # Run history drawer
│   ├── App.tsx                # Main state orchestration
│   ├── main.tsx               # React client root
│   └── index.css              # Tailwind CSS configuration
└── test/
    └── compare.test.ts        # Automated test suite for validation & concurrency
```

---

## Setup & Secrets Configuration

### 1. Environment Variables
Create a `.env` file in the project root (see `.env.example`):

```bash
# Required for live Google Gemini comparisons
GEMINI_API_KEY="your-gemini-api-key"

# Port (defaults to 3000)
PORT="3000"

# Optional future provider keys
# ANTHROPIC_API_KEY="your-anthropic-key"
# OPENAI_API_KEY="your-openai-key"
```

In Google AI Studio, `GEMINI_API_KEY` is injected automatically via user secrets.

### 2. Install Dependencies
```bash
npm install
```

### 3. Development Server
Start the full-stack server (runs Express with Vite middleware on port 3000):
```bash
npm run dev
```

### 4. Running Automated Tests
Run the test suite verifying input validation, concurrency, partial failures, timeouts, and security:
```bash
npm test
```

### 5. Production Build & Deployment
Build the client bundle:
```bash
npm run build
```
Start the production server:
```bash
npm start
```

---

## Manual Verification of Live Gemini Calls

To manually verify that a real call is sent to Google Gemini:

1. Launch the app (`npm run dev`) and ensure `GEMINI_API_KEY` is set.
2. Select **Gemini 3.8 Flash** and **Gemini 3.1 Flash Lite** in the model selection bar.
3. Click any benchmark preset (e.g., *"Monty Hall Problem"*) or type:
   > *"Explain why time dilation occurs in special relativity in 2 sentences."*
4. Click **Compare Responses**.
5. Observe:
   - Both models generate real responses concurrently.
   - Latency counters (e.g. `0.92s`) and token counts (e.g. `48 tokens`) reflect the live Gemini response metadata.
   - Network inspector confirms the request was handled by `POST /api/compare` without any API keys exposed in the browser.
