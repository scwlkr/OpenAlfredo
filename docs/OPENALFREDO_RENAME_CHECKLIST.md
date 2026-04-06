# OpenAlfredo Rename Checklist

## Objective

Convert every canonical project identifier from the previous name set to the new system:

- product name: `OpenAlfredo`
- technical abbreviation: `OAX`
- terminal command: `oax`
- app package path: `oax-web`

## Lowest-Risk Order Of Operations

1. Freeze the new canonical naming system.
2. Rename runtime identifiers and commands while the repo root path is still stable.
3. Rename file paths and module filenames.
4. Rewrite package metadata and Git-facing URLs.
5. Rewrite public docs, brand language, and UI copy.
6. Update on-disk runtime filenames and env vars.
7. Rename the local repository directory.
8. Run verification greps, tests, and command checks.

## Sequential Checklist

- [x] Rename root package from `deathofprompt` to `openalfredo`.
- [x] Rename CLI binary from `dop` to `oax`.
- [x] Rename app directory from `dop-web` to `oax-web`.
- [x] Rename shared engine modules from `dop*` to `oax*`.
- [x] Rename runtime env vars from `DOP_*` to `OAX_*`.
- [x] Rename API auth header from `x-dop-key` to `x-oax-key`.
- [x] Rename runtime state files like `.dop-api-key` and `.dop-pod.json`.
- [x] Rename the tracked MVP plan to `OAX_MVP_PLAN.md`.
- [x] Update package metadata and repository URLs to `OpenAlfredo`.
- [x] Rewrite README around the new brand and `oax` command set.
- [x] Replace the old brand system with a new OpenAlfredo identity.
- [x] Update internal architecture docs and contributor guidance.
- [x] Rename the local working directory from `DeathOfPrompt` to `OpenAlfredo`.
- [x] Update local Git remote configuration to the `OpenAlfredo` repository URL.
- [x] Run final verification greps and runtime checks.

## Verification Commands

Use these to confirm the rename is complete:

```bash
rg -n --hidden --glob '!node_modules' --glob '!.next' --glob '!oax-web/data' --glob '!.git' 'DeathOfPrompt|Death of Prompt|deathofprompt|\bdop\b|\bDOP\b|dop-web|DOP_|\.dop-|x-dop-key'
```

```bash
node bin/oax.js --help
cd oax-web && npm run build
cd oax-web && npx vitest run
```

## Notes

- The repo directory rename should happen last so relative paths stay stable during edits and verification.
- Updating the local `origin` URL assumes the GitHub repository name is also being changed to `OpenAlfredo`.
