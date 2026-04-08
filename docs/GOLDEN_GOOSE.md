# Golden Goose: Adaptive Behavior Loop

The Golden Goose is OpenAlfredo's proactive continuity system. Instead of waiting for user prompts, it observes conversation patterns, extracts themes, and autonomously creates follow-up artifacts — tasks, sticky notes, and workspace documents — that keep your goals moving forward.

## How It Works

```
User conversations
        │
        ▼
┌─────────────────────┐
│  Theme Extraction    │  inference.ts::extractThemes()
│  (LLM analyzes last  │  Reads last 50 transcript entries
│   50 transcripts)    │  Outputs 3-5 theme tags
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Theme Persistence   │  inference.ts::mergeThemes()
│  (themes.json)       │  Boosts re-engaged themes (+0.15)
│                      │  Decays absent themes (-0.05)
│                      │  New themes start at 0.6
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Follow-Up Inference │  inference.ts::inferFollowUps()
│  (LLM generates      │  Reads SOUL + active themes
│   concrete actions)  │  Outputs tasks/stickies/files
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Execution           │  continuity.ts::runContinuityLoop()
│  task → TASKS.md     │  Appends via appendTask()
│  sticky → desk/      │  Creates via saveSticky()
│  file → generated/   │  Saves via saveWorkspaceFile()
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Integration         │  Themes feed into:
│  - Reflection        │  buildReflectionPrompt() → AMBITION.md
│  - Heartbeat         │  runHeartbeat() system prompt
│  - Memory retrieval  │  retrieveContext() → chat context
│  - Telegram alerts   │  Notify on new artifacts
└──────────────────────┘
```

## Theme Lifecycle

1. **Birth** — A theme is first detected in conversation transcripts by the LLM. It enters `themes.json` with strength 0.6.

2. **Growth** — Each continuity cycle where the theme reappears in transcripts boosts its strength by 0.15 (capped at 1.0). The `lastEngaged` timestamp updates.

3. **Decay** — Each cycle where the theme is absent reduces strength by 0.05. This is gradual — a strong theme (0.9) takes 12 cycles to drop below the 0.3 activity threshold.

4. **Fade** — When a theme's `lastEngaged` is over 7 days old OR strength drops below 0.1, the theme is removed from `themes.json` entirely. The system lets that thread go.

## Configuration

In `.env`:

```bash
# How often the loop runs (default: twice daily at 10am and 4pm)
CONTINUITY_CRON="0 10,16 * * *"

# Disable entirely
CONTINUITY_ACTIVE=false
```

These can also be changed from the Settings panel in the web UI.

## High Autonomy Design

The Golden Goose operates with **high autonomy** — it does not ask permission before creating artifacts. This is intentional:

- Tasks are appended to `TASKS.md` where the user can see and manage them
- Sticky notes appear on the desk for review
- Generated files land in `workspace/generated/` where they're browsable
- Telegram alerts notify when new artifacts are created
- The fade mechanism prevents nagging about abandoned interests

If the user ignores a theme, the system naturally deprioritizes it. No explicit "stop" is needed.

## Files

| File | Purpose |
|---|---|
| `src/lib/inference.ts` | Theme extraction, persistence, follow-up inference |
| `src/lib/continuity.ts` | Orchestrator — runs the full loop |
| `data/themes.json` | Persisted theme state |
| `src/lib/__tests__/inference.test.ts` | Unit tests for inference |
| `src/lib/__tests__/golden-goose.test.ts` | End-to-end integration test |

## Testing

```bash
# Run just the golden goose tests
npx vitest run src/lib/__tests__/golden-goose.test.ts
npx vitest run src/lib/__tests__/inference.test.ts

# All tests (includes golden goose)
npx vitest run
```

All tests use mocked LLM responses — no live Ollama needed.
