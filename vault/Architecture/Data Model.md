---
tags: [architecture, schema]
---

# Data Model

Full local state shape as of `schemaVersion: 1`. Owned by `src/state.js` (`normalizeState`, `DEFAULT_STATE`). Migrator is `migrateFromLegacy`.

## Root

```ts
type State = {
  schemaVersion: 1;
  settings: Settings;
  pro: Pro;
  goals: Goal[];
  stepEvents: StepEvent[];
};
```

## Settings

```ts
type Settings = {
  autoHideSeconds: number;       // 0 = never auto-hide; default 6
  launchAtStartup: boolean;
  notifyWhenBehind: boolean;     // opt-in daily nudge
  hotkeyPlusOne: string;         // Electron accelerator, default "CommandOrControl+Alt+="
};
```

## Pro

```ts
type Pro = {
  enabled: boolean;              // must be true for sync to run
  apiBaseUrl: string;            // default https://api.growbuddy.app
  userToken: string;             // bearer token; snapshot redacts this to "***"
  userEmail: string;
  shares: Share[];
};

type Share = {
  code: string;
  goalId: string;                // "" if incoming (a friend's goal)
  direction: "outgoing" | "incoming";
  friendLabel: string;
  lastSyncedAt: string;
  snapshot: SnapshotPayload | null;
};
```

## Goal

```ts
type Goal = {
  id: string;                    // UUID
  name: string;
  target: number;
  unitValue: number;             // amount added per +1 step
  startDate: string;             // ISO
  deadline: string;              // ISO
  spriteKey: "avatar" | "naruto";
  spriteVariant: 1 | 2 | 3;
  idealStartValue: number;       // starting offset for the ideal line
  barColor: string;              // #hex
  active: boolean;               // exactly one active at a time (post-normalize)
  archived: boolean;
  shareCode: string;             // outgoing share code for this goal, if any
};
```

## StepEvent

```ts
type StepEvent = {
  id: string;                    // UUID
  goalId: string;
  delta: number;                 // +1 or -1 typically
  timestamp: string;             // ISO
};
```

## Computed metrics (not stored)

`src/compute.js` `computeGoalMetrics(goal, stepEvents, now?)` returns:

```ts
type Metrics = {
  stepCount: number;
  actual: number;
  ideal: number;
  delta: number;                 // signed; positive = ahead
  requiredPace: number;          // per day, from today to deadline
  actualRatio: number;           // clamped [0, 1.2]
  idealRatio: number;            // clamped [0, 1.2]
  idealStartValue: number;
  isComplete: boolean;
  isBehind: boolean;
  daysRemaining: number;
  daysElapsed: number;
  totalDays: number;
  history: StepEvent[];          // newest first
};
```

These get attached as `goal.stats` in every snapshot the renderers receive.

## Snapshot to renderer

Main sends `state:snapshot` on every mutation. The snapshot shape is `getSnapshot()` in `main.js`:

```ts
type Snapshot = {
  schemaVersion: number;
  settings: Settings;
  pro: Pro;                      // userToken redacted to "***"
  goals: (Goal & { stats: Metrics })[];
  activeGoalId: string | null;
  activeGoal: (Goal & { stats: Metrics }) | null;
  spriteSources: { avatar: string[]; naruto: string[] };  // data: URLs
  theme: "dark" | "light";
  appVersion: string;
};
```

## Server-side data

See [[Pro Tier]] for the D1 schema.
