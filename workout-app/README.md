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

The live build saves everything on the device and mirrors it to the viewer's Claude account through the artifact `db` capability (published with `{ db: {}, user: {} }`), in their private `data/users/<id>/` folder: a `profile` document plus one document per workout. See `src/lib/sync.ts`. To save there, someone outside the owner's organization must be invited by email as an Editor, with no public link on the page; otherwise the app keeps working on the device and says so.

Setting `PREVIEW` in `src/lib/store.tsx` to `true` builds a demo instead: six weeks of sample history under its own local key, never synced.

## Changing the built-in plan

A saved plan is never replaced wholesale, so a change to `defaultPlan()` in `src/data/plan.ts` only reaches new users. To bring existing ones along, raise `PLAN_REV` and add a step to `upgradePlan()`: a day still exactly as the previous revision shipped it can take the new version, and an edited day should only gain what it lacks. The store runs the upgrade on load and after sync, and `UpdateNotice` shows a one-time card about what changed (rewrite its text for each revision).

## Where things live

- `src/data`: exercise library with demo video links, the default weekly plan, body diagram paths
- `src/lib`: types, dates, workout logic (personal bests, streaks, muscle volume), store, rest timer, navigation
- `src/components`: UI kit, body map, charts, calendar, set logging card, sheets
- `src/screens`: Today, Week and day pages, focus mode with summary, Progress, Plan editor

The body diagram artwork is adapted from react-native-body-highlighter (MIT). See `src/data/BODY_DIAGRAM_LICENSE.txt`.
