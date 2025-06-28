# Howdy‑Hub Bot

**A smart, customizable GitHub Action that greets contributors, auto‑assigns users, applies labels, syncs reviewers, and more — lovingly crafted by [petherldev](https://github.com/petherldev).**

## Features

- [x] **Welcome comments** for first‑time issues & PRs
- [x] **Friendly messages** for returning contributors
- [x] **Auto‑assign** authors (and optionally unassign when removed)
- [x] **Auto‑label** issues / PRs
- [x] **Keyword‑based auto‑close** (e.g., any title containing “complete”)
- [x] **Sync assignees with requested reviewers**
- [ ] Close stale issues (coming soon)
- [ ] Slash‑command support (coming soon)

> [!TIP]  
> Ship it fast: the action is ​*JavaScript‑only*​ on the runner — no Docker, no external runtimes.

## Quick Start

1. **Install**

   ```bash
   # In your target repo
   gh workflow run --repo petherldev/howdy-hub-bot install
   ```

2. **Add a workflow**

   ```yaml
   # .github/workflows/howdy.yml
   name: 🤖 Howdy‑Hub Bot

   on:
     workflow_dispatch:
     schedule:
       - cron: "0 9 * * 1" # Monday 09:00 UTC
     issues:
       types: [opened, reopened]
     pull_request:
       types: [opened, reopened, ready_for_review]

   permissions:
     contents: read
     issues: write
     pull-requests: write

   jobs:
     howdy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: petherldev/howdy-hub-bot@v1
           with:
             repo-token: ${{ secrets.GITHUB_TOKEN }}
             # config-path: ".github/howdy-hub-bot.yml" # optional
   ```

3. **(Optional) Tweak `.github/howdy-hub-bot.yml`**

   ```yaml
   welcome:
     first_time_issue: "👋 Howdy, **{{author}}**, thanks for opening your first issue!"
     returning_issue: "Welcome back, **{{author}}** — we appreciate it!"
     first_time_pr: "🎉 Howdy, **{{author}}**, thanks for your first PR!"
     returning_pr: "🤠 You're awesome, **{{author}}**, thanks again!"
   labels:
     issues: ["needs-triage"]
     prs: ["awaiting-review"]
   autoCloseOnTitleContains: "complete"
   autoAssignAuthor: true
   autoUnassignIfRemoved: true
   syncAssigneesWithReviewers: true
   ```

> \[!IMPORTANT]
> The default configuration file path is `.github/howdy-hub-bot.yml`. Change it with the `config-path` input if you like.

## Action Inputs

| Name          | Required | Default                     | Description                                                     |
| ------------- | -------- | --------------------------- | --------------------------------------------------------------- |
| `repo-token`  | ❌       | `${{ github.token }}`       | Token for API calls (use the provided `GITHUB_TOKEN` or a PAT). |
| `config-path` | ❌       | `.github/howdy-hub-bot.yml` | Path to custom YAML config.                                     |

> \[!NOTE]
> Outputs are not currently exposed (none are needed for downstream jobs).

## Development

> \[!CAUTION]
> Node 22 + npm 10 are recommended (the bot bundles down to Node 20 for the runner).

```bash
git clone https://github.com/petherldev/howdy-hub-bot.git
cd howdy-hub-bot
npm install                # install deps
npm run build              # generate dist/ with ncc
npm test                   # run Jest unit tests
```

### Useful Scripts

| Command          | What it does                                |
| ---------------- | ------------------------------------------- |
| `npm run build`  | Bundle `src/` → `dist/` via **@vercel/ncc** |
| `npm test`       | Run **Jest** tests in `tests/`              |
| `npm run lint`   | Lint code with ESLint / TypeScript plugin   |
| `npm run format` | Auto‑format with Prettier                   |

> \[!TIP]
> Use `npm version <patch|minor|major>` + `git push --follow-tags` to publish a new semver tag — GitHub Actions picks up the new release automatically.

## Reference Docs for Building GitHub Actions

| Topic                          | Link                                                                                                                                                                       |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| JavaScript actions toolkit     | [https://docs.github.com/actions/creating-actions/creating-a-javascript-action](https://docs.github.com/actions/creating-actions/creating-a-javascript-action)             |
| Using **@vercel/ncc**          | [https://github.com/vercel/ncc](https://github.com/vercel/ncc)                                                                                                             |
| Metadata (`action.yml`) schema | [https://docs.github.com/actions/creating-actions/metadata-syntax-for-github-actions](https://docs.github.com/actions/creating-actions/metadata-syntax-for-github-actions) |
| Workflow syntax                | [https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions](https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions)   |

## Roadmap

- [ ] Slash commands (`/label`, `/assign me`, …)
- [ ] Stale‑issue reaper
- [ ] i18n templates (multi‑lingual welcomes)
- [ ] Web UI for config generation

Feel free to open issues or PRs to add ideas!

## Contributing

1. Fork → branch → PR.
2. Run `npm test` before pushing.
3. Follow the **Conventional Commits** style (e.g., `feat: add …`).
4. Sign your commits (optional but appreciated).

> \[!TIP]
> See **`CONTRIBUTING.md`** for guidelines and a full code‑of‑conduct.

## License

```text
MIT © 2025 HErl <petherl@protonmail.com>
```

See [`LICENSE`](./LICENSE) for the full text.

Made with 🍬 by [petherldev](https://github.com/petherldev) — Happy hacking! 🤠
