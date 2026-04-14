# GitHub Copilot Instructions — NeoSynapse

## Documentation maintenance rule

**DOCUMENTATION.md at the project root is the single source of truth for this project.**

Whenever you make any of the following changes, you MUST update `DOCUMENTATION.md` in the same response:

| Change type | What to update in DOCUMENTATION.md |
|---|---|
| New page or route added | Add entry under the relevant app section (§6, §7, or §8); update the route table in §3 if the route tree changes |
| New database table or column | Add or update the relevant table entry in §11 |
| New Supabase Edge Function | Add an entry in §10 |
| New AI provider or model change | Update §15 |
| New npm package added | Update §2 (Technology Stack) |
| New environment variable or secret | Update §17 |
| RLS policy added, changed, or confirmed working | Update the RLS notes in §16 and the table header in `src/shared/services/healthcare.ts` |
| New feature or significant behaviour change | Add a row to the Changelog table in §20 with today's date, a short description, and the files affected |
| Bug fix that changes documented behaviour | Update the relevant section and add a Changelog entry |
| Known limitation resolved | Remove it from §19 |
| New known limitation discovered | Add it to §19 |
| Theming system changed | Update §12 |
| Language/locale support changed | Update §13 |

## Changelog format

Each row in §20 must follow this format:

```
| YYYY-MM-DD | One-sentence description of the change | Comma-separated file paths |
```

Use today's actual date. Do not leave the date blank.

## Rules

- Do NOT create a separate markdown file to document a change. Always edit `DOCUMENTATION.md` in place.
- Keep entries concise. Aim for one sentence per change.
- Do not document internal refactors that don't affect observable behaviour, API surface, or DB schema.
- If you add a major new subsystem (e.g., a new context, a new shared hook category), add a dedicated section to the relevant chapter rather than squeezing it into the changelog only.
