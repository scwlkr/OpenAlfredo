# Style guide

This guide keeps OpenAlfredo documentation direct, current, and navigable.

## Voice

Write like a user manual for a technical operator:

- Direct.
- Concrete.
- Present tense.
- Source-grounded.
- Calm and practical.

Avoid hype, brainstorm tone, unresolved planning language, and unexplained internal nicknames.

## Naming

- Use `OpenAlfredo` for the product.
- Use `OAX` for technical shorthand.
- Use `oax` only for the CLI command.
- Use `oax-web` for the application package.
- Use `continuity loop` before using the nickname Golden Goose.
- Use `TASKS.md` for tasks and `AMBITION.md` for reflection. Do not blur them.

## Filenames

Use lowercase kebab-case for active manual docs, such as `setup.md`, `operations.md`, and `continuity-loop.md`.

Allowed exceptions:

- `README.md` at repo or directory entry points.
- `RESTLESS.md` because the source bootstrap template points to this protocol doc and the filename mirrors the runtime protocol name.
- Tool-specific root instruction files such as `AGENTS.md` and `CLAUDE.md`.
- Governance files such as `CODE_OF_CONDUCT.md`.

Do not keep planning-shaped filenames active unless they are current, intentional contracts with a documented reason.

## Headings

- Use one `#` title per file.
- Use sentence-case section headings.
- Prefer short nouns or imperative phrases.
- Do not include decorative separators.

## Links

- Link to active canonical docs from `docs/README.md`.
- Use relative links.
- Do not link active docs to deprecated docs except from a dedicated archive section.
- Repair links after every rename, move, or consolidation.

## Commands

Document commands only after checking the repo scripts or code path that provides them.

- Root package commands belong in root docs.
- `oax-web` scripts should show `cd oax-web` first.
- Use `node bin/oax.js ...` when the command works without global linking.
- Mention `npm link` only as an optional convenience for `oax ...` commands.

## Examples

- Keep examples short and runnable.
- Do not include fake secrets.
- Use environment variable names only, never values.
- Prefer local, safe commands over install, migration, deploy, or network commands unless the doc is specifically about those operations.

## Deprecation

Move historical plans, stale checklists, and scratchpad material to `docs/deprecated/` with the original path preserved.

Each deprecated file should start with:

```md
> Deprecated: Reason.
> Replacement: path/to/current-doc.md
> Original path: old/path.md
```

## Active-docs audit standard

Every active documentation file should answer one clear reader need. If it only preserves history, duplicates another page, or carries unresolved planning language, move it to `docs/deprecated/` or merge its current facts into the canonical doc.
