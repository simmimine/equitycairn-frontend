# EquityCairn video studio

All Remotion compositions, source artwork, and rendered videos live here.

- `pnpm video:setup` downloads Remotion's rendering browser once per machine.
- `pnpm video:studio` opens Remotion Studio.
- `pnpm video:render:home` renders the homepage video to
  `remotion/home/output/home-watchlist.mp4`.

Page-specific Remotion projects live in their own folder. The homepage video
keeps its composition, source artwork, public assets, and render output in
`remotion/home/`. Its static assets are loaded from `remotion/home/public/`.

Keep this directory out of the Next.js TypeScript and ESLint projects.
