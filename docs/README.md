# Documentation

This is the canonical documentation map for OpenAlfredo. Start at the root [README](../README.md), then use this guide to move through setup, architecture, operations, and reference material.

## Reading path

1. [Setup](setup.md) - install dependencies, bootstrap local state, and start the pod.
2. [Architecture](architecture.md) - understand packages, runtime components, memory, data flow, and design decisions.
3. [Operations](operations.md) - run the pod, manage sandbox profiles, inspect logs, and maintain the local database.
4. [Testing](testing.md) - run tests, understand test organization, and add coverage.
5. [API](api.md) - inspect local HTTP endpoints used by the web UI.

## Feature guides

- [Telegram](telegram.md) - pair a Telegram chat, switch models, and use daemon commands.
- [RESTLESS](RESTLESS.md) - understand the heartbeat protocol and marker effects.
- [Continuity loop](continuity-loop.md) - understand the theme-based follow-up system.
- [Self-modification](self-modification.md) - test and verify source-edit markers.

## Reference

- [Glossary](glossary.md) - canonical project terms.
- [Style guide](style-guide.md) - documentation voice, file naming, links, and cleanup rules.
- [Brand](brand.md) - product language, naming, voice, and visual direction.
- [Security](security.md) - local threat model, secret locations, and disclosure guidance.
- [CI debugging runbook](runbooks/ci-debugging.md) - reproduce and diagnose CI failures.

## Tool-specific instructions

- [AGENTS.md](../AGENTS.md) - Codex and repo-agent operating instructions.
- [CLAUDE.md](../CLAUDE.md) - Claude Code operating instructions.
- [CONTRIBUTING.md](../CONTRIBUTING.md) - contribution workflow.

## Deprecated archive

Historical planning and checklist artifacts live under [deprecated/](deprecated/). Active docs should not depend on them except when intentionally reviewing project history.
