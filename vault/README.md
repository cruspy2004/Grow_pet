---
tags: [meta]
---

# Grow Buddy vault

This folder is an [Obsidian](https://obsidian.md) vault for the Grow Buddy project. It lives in the same repo as the code so notes and code evolve together.

## Open it

1. Install Obsidian (free).
2. Open Obsidian → **Open folder as vault** → pick `D:/grow_buddy/vault`.
3. Start from [[Home]].

## Layout

| Folder | What's in it |
|---|---|
| `Product` | PRD, design doc, positioning — the "what and why" |
| `Architecture` | How the app is put together, what each piece does |
| `Roadmap` | Launch plan, what's now / next / later |
| `Decisions` | Dated decision records (why we did it this way) |
| `Marketing` | Landing copy, launch channels, demo plan |
| `Logs` | Daily notes go here |
| `Templates` | Templates for decisions, features, daily notes |

## Conventions

- **Wiki links `[[Note Name]]`** for cross-references.
- **Tags** at the top of each note in frontmatter, e.g. `tags: [product, tier-free]`.
- **Decisions** are named `YYYY-MM-DD Short title.md` and never edited — if a decision changes, add a new one that supersedes it and link back.
- **Roadmap** notes use checkboxes (`- [ ]`) so they show up in the built-in Tasks view.

## Not stored here

Anything that belongs in the code stays in the code:
- Feature implementation → source files under `src/`, `renderer/`.
- Bugs/tickets → GitHub Issues (once the repo is public).
- API endpoints → `server/README.md`.
- Install/dev instructions → repo root `README.md`.
