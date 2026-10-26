# My Training

A workout app for one person's weekly program: today's session with a muscle map, a week view with a page for every day, logging with personal bests and a rest timer, progress charts, and a full plan editor. Built with React, TypeScript and Tailwind, and bundled into a single HTML file that runs as a claude.ai artifact.

## Run it

```sh
pnpm install
pnpm dev
```

## Build the single-file page

```sh
npx tsc -p tsconfig.app.json --noEmit
npx parcel build index.html --dist-dir dist --no-source-maps
npx html-inline dist/index.html > bundle.html
```

`PREVIEW` in `src/lib/store.tsx` seeds six weeks of sample history and keeps data under its own local key, so the preview never touches real logs.

## Where things live

- `src/data`: exercise library with demo video links, the default weekly plan, body diagram paths
- `src/lib`: types, dates, workout logic (personal bests, streaks, muscle volume), store, rest timer, navigation
- `src/components`: UI kit, body map, charts, calendar, set logging card, sheets
- `src/screens`: Today, Week and day pages, focus mode with summary, Progress, Plan editor

The body diagram artwork is adapted from react-native-body-highlighter (MIT). See `src/data/BODY_DIAGRAM_LICENSE.txt`.
