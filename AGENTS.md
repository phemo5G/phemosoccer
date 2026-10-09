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
- Canvas colors resolve semantic CSS game tokens after mounting, and appearance is derived from player names so online peers render consistent identities without extra network data.
