# CrypCal — AI Agent Contribution Guide

## Quick Orientation

CrypCal is a self-hostable, E2EE chat + calling app built on Matrix + LiveKit.

```
CrypCal/
├── apps/web/              # React 19 PWA client (this is where most edits happen)
│   ├── src/
│   │   ├── components/    # React UI components (one per file, named exports)
│   │   ├── hooks/         # Custom React hooks (useRooms, useTimeline, useCall)
│   │   ├── lib/           # Core singletons (matrix client, store, encryption)
│   │   └── utils/         # Pure helper functions (formatting, constants)
│   ├── public/            # Static assets (manifest, icons)
│   ├── index.html         # HTML entry point
│   ├── vite.config.ts     # Build config + dev proxy
│   └── package.json       # Dependencies
├── infra/                 # Docker Compose infrastructure (rarely needs edits)
│   ├── docker-compose.yml # Service definitions
│   ├── caddy/             # Reverse proxy config
│   ├── synapse/           # Matrix homeserver config (template with __VARS__)
│   ├── coturn/            # TURN/STUN config
│   ├── livekit/           # SFU config
│   └── postgres/          # DB init
├── scripts/               # Setup + utility scripts
├── tests/                 # Vitest unit + Playwright E2E tests
├── docs/                  # Architecture, threat model, security, decisions
└── .github/workflows/     # CI pipeline
```

## Conventions

### Code Style
- **TypeScript strict mode** — no `any` unless explicitly justified with a comment
- **Named exports** — every component, hook, and utility uses named exports (no default exports)
- **One component per file** — file name matches the exported component name
- **JSDoc on public functions** — every exported function has a JSDoc comment
- **Barrel exports** — each directory has an `index.ts` re-exporting its public API

### State Management
- **Matrix SDK owns the data** — rooms, messages, and crypto state live in matrix-js-sdk's IndexedDB stores
- **Zustand owns the UI** — only navigation state, theme, and call state live in the Zustand store (`lib/store.ts`)
- **Hooks bridge the gap** — `useRooms`, `useTimeline`, `useCall` subscribe to SDK events and return React-friendly data

### Encryption Rules (NON-NEGOTIABLE)
- **E2EE is always on** — rooms are created via `createEncryptedRoom()` in `lib/encryption.ts` — NEVER via raw `client.createRoom()`
- **No encryption toggle** — there is no UI to disable encryption
- **Verification status** — green shield = all verified, amber = unverified devices present

### Component Pattern
```tsx
/**
 * ComponentName — Brief description of what this component does.
 *
 * Where it appears in the UI and any important behavior notes.
 */
import { useState } from 'react';
import { SomeIcon } from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface ComponentNameProps {
  /** Description of this prop */
  someProp: string;
}

export function ComponentName({ someProp }: ComponentNameProps) {
  // Component logic here
  return <div>...</div>;
}
```

### Hook Pattern
```tsx
/**
 * useHookName — What this hook provides.
 *
 * Usage: `const { data, action } = useHookName(client, roomId);`
 */
export function useHookName(client: MatrixClient | null, roomId: string | null) {
  // Hook logic
  return { data, action };
}
```

## Testing

### Unit Tests (Vitest)
```bash
cd apps/web
npm run test        # single run
npm run test:watch  # watch mode
```
- Tests live in `tests/unit/` mirroring `src/` structure
- Mock matrix-js-sdk with `vi.mock('matrix-js-sdk')`
- Test pure functions directly, hooks via `@testing-library/react`

### E2E Tests (Playwright)
```bash
cd apps/web
npx playwright test
```
- Tests live in `tests/e2e/`
- Test against the dev server (no real homeserver needed for UI tests)

## Common Tasks

### Adding a new screen
1. Create component in `src/components/NewScreen.tsx`
2. Add view type to `AppView` in `lib/store.ts`
3. Add route case in `App.tsx`
4. Export from `src/components/index.ts`

### Adding a new Matrix event handler
1. Add event listener in the relevant hook (`useRooms.ts` or `useTimeline.ts`)
2. Process the event in the hook's callback
3. Update the return type if needed

### Modifying the design system
1. Edit CSS custom properties in `src/index.css` under `@theme {}`
2. Light mode vars are in `:root {}`, dark mode in `.dark {}`
3. Never use hardcoded colors — always use `var(--token-name)`

### Adding a dependency
1. Check the license is OSI-approved (MIT, Apache-2.0, BSD, MPL-2.0, ISC)
2. `npm install <package>` in `apps/web/`
3. Document the decision in `docs/DECISIONS.md`
4. The CI license-checker will block non-OSI deps

## Key Decisions (see docs/DECISIONS.md for full list)
- **Matrix protocol** over Signal/XMPP — federable, E2EE built-in, active ecosystem
- **Rust crypto WASM** over libolm — faster, audited, actively maintained
- **LiveKit SFU** over Janus/mediasoup — simpler, good Matrix integration
- **Zustand** over Redux — minimal boilerplate for small state surface
- **Tailwind CSS 4** — utility-first, `@theme` design tokens
- **No React Router** — simple state-driven routing for 3 screens
- **Lucide icons** — ISC licensed, tree-shakeable, consistent
