<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Match simulation lives in src/lib/engine.ts (pure, framework-free) and is rendered on a canvas by src/components/Match.tsx — keeps game logic testable and separate from UI.
- Teams may supply an explicit positional lineup with individual ratings; legacy teams retain the star-slot roster mapping so custom clubs do not disrupt existing clubs.
- Player ratings resolve through ratingFor for lineups, named overrides and substitutions; engine ability formulas use individual ratings so team averages never erase star overrides.
- Kick charge tracking lives in a browser-independent helper and sends release strength in controller packets; the engine consumes the same input in local and online modes.
- CPU difficulty is match-state configuration applied only to the designated CPU team; local and online human opponents retain identical rules.
- Canvas colors resolve semantic CSS game tokens after mounting, and appearance is derived from player names so online peers render consistent identities without extra network data.
- Engine regression tests live outside src and run with Bun's test runner so test-only imports do not enter the application typecheck.
