# Continuity loop

The continuity loop is OpenAlfredo's theme-based follow-up system. The code and some tests also call it Golden Goose.

Instead of waiting for prompts, the loop reviews recent transcripts, extracts active themes, and creates follow-up artifacts: tasks, desk notes, and generated workspace files.

## Flow

```text
recent transcripts
  -> extractThemes()
  -> mergeThemes()
  -> themes.json
  -> inferFollowUps()
  -> tasks, stickies, or generated files
```

## Files

| File | Purpose |
|---|---|
| `oax-web/src/lib/inference.ts` | Theme extraction, theme merging, and follow-up inference. |
| `oax-web/src/lib/continuity.ts` | Orchestrates the full loop. |
| `oax-web/data/themes.json` | Persisted theme state. |
| `oax-web/src/lib/__tests__/inference.test.ts` | Unit tests for inference. |
| `oax-web/src/lib/__tests__/golden-goose.test.ts` | Integration tests for the loop. |

## Theme lifecycle

- New themes start at strength `0.6`.
- Re-engaged themes gain `0.15`, capped at `1.0`.
- Absent themes decay by `0.05`.
- Themes fade when they are more than 7 days stale or strength drops below `0.1`.

## Configuration

The default schedule is twice daily:

```bash
CONTINUITY_CRON="0 10,16 * * *"
CONTINUITY_ACTIVE=true
```

Disable the loop with:

```bash
CONTINUITY_ACTIVE=false
```

Settings can be changed in the web UI or directly in `oax-web/.env`. Restart the pod after changing daemon schedules.

## Outputs

The continuity loop can create:

- tasks in `oax-web/data/TASKS.md`;
- sticky notes under `oax-web/data/workspace/desk/`;
- generated files under `oax-web/data/workspace/generated/`;
- Telegram notifications when the daemon has a paired chat.

## Testing

```bash
cd oax-web
npx vitest run src/lib/__tests__/golden-goose.test.ts
npx vitest run src/lib/__tests__/inference.test.ts
```

Tests mock model responses. They do not require a running Ollama instance.
