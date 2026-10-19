# ExperimentFlow

ExperimentFlow is a local A/B experimentation dashboard. It runs entirely in the browser: experiments, metrics, and the event log are stored in `localStorage`. The event stream, latency, errors, and assistant notes are simulated. Nothing in this project calls a backend or an external AI API.

## Run it

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

```bash
npm run build
npm run preview
```

`build` typechecks with TypeScript and writes a static bundle to `dist/`.

## What works

- Overview counts for running experiments, participants, processed events, and conversion rate, plus a recent activity chart and a performance table.
- Experiment create, edit, start, pause, resume, archive, and restore. Each test has a control, a treatment, a traffic split, and a conversion goal.
- A start/stop event simulator that assigns users, records clicks, and counts at most one conversion per user.
- Analytics for variant comparison, conversion rate, cumulative event volume, trend lines, and a 95% Wilson interval once a variant has 30 participants. A leader is named only when both variants have at least 200 participants and the intervals do not overlap.
- A rule-based assistant that explains the metrics, flags small samples, and recommends pausing a test when treatment is behind.
- A reliability panel with throughput, simulated errors, latency, event history, and pause/resume controls.
- Refresh keeps the saved workspace. If the simulator was running, it resumes. Settings can export JSON, reset the three demo experiments, or clear everything.

Demo experiments seeded on first launch:

- AI Copilot Onboarding
- Search Ranking Optimization
- Teams Meeting Experience

## Architecture

```text
pages and components
        |
        v
React store (useReducer)
        |
        +--> src/lib/simulator.ts   pure event step
        +--> src/lib/insights.ts    local experiment rules
        +--> src/lib/storage.ts     localStorage key experimentflow.v1
```

The store is the only place that changes workspace data. Pages do not write metrics themselves. That boundary is where a future API client can replace `storage.ts` and `simulator.ts` without rewriting the screens.

| Piece | This version | Later |
| --- | --- | --- |
| UI | React, TypeScript, Vite, Tailwind | Same client, pointed at HTTP |
| Experiments and aggregates | `localStorage` | ASP.NET Core API and PostgreSQL |
| Event stream | `setInterval` in the browser | Kafka topics for assignment, click, and conversion |
| Hosting and processing | None | Azure App Service, database, and stream processing |
| Assistant | Local rules over stored metrics | Can stay rules-based, or call a model with the same summaries |

Planned systems are labeled “Not connected” in Settings. This build does not pretend they are available.

## Simulator

- Only experiments with status `running` receive events.
- Each new user is assigned once, using the variant traffic split.
- A user is marked as a future converter from that variant’s simulator propensity. The propensity is a generator input, not a measured result.
- A conversion event flips that user once. Later conversion attempts cannot count again.
- About 4.5% of events are simulated processing errors. They increase the error counter and latency, and they do not create a participant or a conversion.
- Raw history keeps the newest 140 events. Totals live in aggregate counters, so trimming the log does not erase results.

## Metric definitions

- Participant: one assignment.
- Conversion rate: conversions ÷ participants.
- Lift: (treatment rate − control rate) ÷ control rate.
- Events processed: assignments + clicks + conversions + errors.
- Uncertainty: 95% Wilson score interval. It is not a sequential production test.
