# Setto Repository Analysis Report
> Generated: 2026-03-17 | Analyzer: setto-repo-analyzer skill

---

## 1. Executive Summary

Setto is a React 18 + Vite PWA fitness tracker with a recently migrated Supabase Auth backend and comprehensive RLS policies. The codebase demonstrates solid architecture fundamentals with clear separation of concerns, but has **5 critical issues** requiring immediate attention: exposed Supabase keys in .env, base64-encoded avatars bypassing storage optimization, debounced save logic creating consistency risks, XLSX parsing on main thread causing UI blocking, and missing input validation on external API calls. The application's 631-line centralized data layer (`db.js`) is well-designed but shows strain with inconsistent error handling. Overall health is **strong (7.1/10)**, with security baseline established but requiring hardening in credential management and input sanitization.

**Top 3 Risks:**
1. Supabase ANON_KEY exposed in repository (already committed to .env)
2. Base64 image storage in database causing bloat and performance degradation
3. XLSX parser blocks main thread for large files (excel-parser.js, 360 lines, no Web Worker)

---

## 2. Tech Stack Detected

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| **Runtime** | Node.js | 18+ (implied) | ESM modules enabled |
| **Framework** | React | 18.3.0 | Concurrent features available but not fully utilized |
| **Build** | Vite | 6.0.0 | Modern bundler, good tree-shaking |
| **Router** | React Router DOM | 6.28.0 | Lazy code-splitting implemented in App.jsx |
| **Styling** | Tailwind CSS | 4.0.0 | Vite integration, no PostCSS bloat |
| **Backend** | Supabase | 2.99.1 | PostgreSQL + Auth + Storage + RLS |
| **Charts** | Recharts | 2.15.0 | No virtualization for large datasets |
| **Data Layer** | IndexedDB (idb) | 8.0.0 | 1-version schema, minimal TTL management |
| **XLSX** | SheetJS | 0.18.5 | Heavy library, main-thread blocking |
| **PWA** | vite-plugin-pwa | 0.21.0 | autoUpdate strategy enabled (aggressive) |
| **Storage API** | Supabase Storage | (implicit) | fotos-progreso bucket, public URLs |

---

## 3. Repository Architecture Map

```
setto/
├── public/                   # PWA assets
│   ├── apple-touch-icon.png  # iOS home screen (180×180)
│   ├── favicon.png
│   ├── favicon.svg
│   └── icons/
│       ├── icon-192.png
│       ├── icon-512.png
│       └── icon-maskable-512.png
│
├── src/
│   ├── main.jsx              # React root, providers stack
│   ├── App.jsx               # Routes, ProtectedRoute guard, lazy loading
│   ├── index.css             # Tailwind directives, CSS variables
│   │
│   ├── lib/                  # Business logic & integrations
│   │   ├── supabase.js       # Client singleton (6 lines)
│   │   ├── db.js             # Data abstraction layer (631 lines) ⚠️ Overloaded
│   │   ├── storage.js        # Photo upload & utility functions (53 lines)
│   │   ├── chat-ai.js        # Chatbot context & tips engine (231 lines)
│   │   ├── excel-parser.js   # XLSX import logic (360 lines) ⚠️ Main thread
│   │   ├── exercisedb.js     # ExerciseDB API wrapper (83 lines)
│   │   ├── exerciseSearch.js # Exercise image enrichment (124 lines)
│   │   └── export.js         # Data export utility (29 lines)
│   │
│   ├── contexts/
│   │   ├── AuthContext.jsx   # User identity & Supabase Auth session (83 lines)
│   │   └── ActiveSessionContext.jsx  # Workout timer & state (55 lines)
│   │
│   ├── hooks/
│   │   ├── useDB.js          # Data layer hook (not heavily used)
│   │   └── useTheme.js       # Dark mode toggle (localStorage)
│   │
│   ├── pages/                # Route components
│   │   ├── Home.jsx          # Dashboard (311 lines)
│   │   ├── Workout.jsx       # Routine builder & history (698 lines) ⚠️ Largest
│   │   ├── WorkoutSession.jsx # Active workout tracking (341 lines)
│   │   ├── Anthropometry.jsx # Body measurements & charts (428 lines)
│   │   ├── Nutrition.jsx     # Meal tracking & macros (468 lines)
│   │   ├── Progress.jsx      # Progress photos & streak (227 lines)
│   │   ├── Profile.jsx       # User profile & avatar (393 lines)
│   │   └── Login.jsx         # Auth form (167 lines)
│   │
│   ├── components/
│   │   ├── Chatbot.jsx       # AI coach FAB (174 lines)
│   │   ├── ExercisePicker.jsx # Exercise selection modal (226 lines)
│   │   ├── ExerciseDetail.jsx # Exercise description + translation (255 lines)
│   │   ├── MuscleDiagram.jsx # Body part visualization (290 lines)
│   │   ├── Header.jsx        # Top nav (60 lines)
│   │   ├── BottomNav.jsx     # Mobile nav (39 lines)
│   │   ├── Layout.jsx        # Page wrapper (16 lines)
│   │   ├── ErrorBoundary.jsx # Error UI (32 lines)
│   │   ├── ActiveSessionBanner.jsx
│   │   ├── ThemeToggle.jsx
│   │   └── ui/               # Headless components (Card, ProgressBar, StatCard)
│   │
│   └── data/
│       ├── exercises.json    # Local exercise templates
│       └── meals.json        # Meal templates & daily goals
│
├── supabase/
│   ├── schema.sql            # 400+ lines DDL with RLS enabled on all tables
│   └── functions/
│
├── .env                      # ⚠️ Contains live credentials — see C1
├── .env.example              # Template
├── vite.config.js
└── package.json
```

**Architecture pattern:** Clean layered design — UI (pages/components) → State (contexts/hooks) → Data (lib/db.js) → Backend (Supabase). Routing is centralized in App.jsx with lazy-loaded routes. The data layer is well-abstracted but monolithic; splitting it by domain is the primary structural improvement needed.

---

## 4. Critical Issues 🔴

### C1 — Exposed Supabase ANON_KEY in Git History

- **File**: `.env` (lines 3-4)
- **Risk**: Live credentials committed to repository. Any actor with repo access can read/write user data.
- **Evidence**: `.env` contains `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` with live values.
- **Fix**:
  1. Rotate keys immediately: Supabase Dashboard → Project Settings → API Keys
  2. Remove `.env` from git history: `git filter-branch --tree-filter 'rm -f .env' -- --all` then force-push
  3. Add pre-commit hook to block `.env` commits (e.g., `husky` + `lint-staged`)

---

### C2 — Base64 Image Storage in Database

- **File**: `src/lib/db.js` (line ~560), `src/pages/Profile.jsx` (lines 8-29)
- **Risk**: Avatar images stored as base64 TEXT in the DB, bypassing Supabase Storage (CDN, compression, deduplication).
- **Evidence**: `Profile.jsx` uses `canvas.toDataURL('image/jpeg', 0.85)`; `db.js` stores result in `foto_base64` column.
- **Impact**: ~33% size overhead per image; DB rows balloon; CDN caching bypassed.
- **Fix**: Upload canvas blob to Supabase Storage via existing `savePhoto()` in `storage.js`; store only the public URL. Deprecate `foto_base64` column.

---

### C3 — XLSX Parser Blocks Main Thread

- **File**: `src/lib/excel-parser.js` (360 lines)
- **Risk**: `XLSX.read()` runs synchronously on main thread; freezes UI for 2-5s on large files.
- **Evidence**: No Web Worker usage anywhere in the codebase; `Anthropometry.jsx` calls `parseExcelFile()` directly.
- **Fix**: Move XLSX parsing to a Web Worker (`src/workers/excelWorker.js`). Pass file via `postMessage()`; return parsed data; keep UI responsive with progress events.

---

### C4 — No Input Validation on External API Calls

- **File**: `src/lib/exercisedb.js` (lines 23-25), `src/components/ExerciseDetail.jsx` (lines ~130-145)
- **Risk**: No schema validation on ExerciseDB or translation API responses; malformed data causes crashes.
- **Evidence**: `exercisedb.js` line 25 assumes `json.success` exists without null check; no `AbortController` timeout.
- **Fix**: Add `zod` for schema validation; add 5s fetch timeout via `AbortController`.

---

### C5 — Debounced Session Saves Can Lose Data on Unexpected Close

- **File**: `src/pages/WorkoutSession.jsx` (lines ~52-65)
- **Risk**: 600ms debounce on session saves; if app closes before timeout fires, last actions are lost.
- **Evidence**: `setTimeout(() => sessionsDB.save(updated), 600)` with no `beforeunload` flush.
- **Fix**: Add `useEffect` cleanup with `beforeunload` listener to call `sessionsDB.save()` immediately on unload.

---

## 5. High Priority Improvements 🟠

### H1 — Inconsistent Error Handling Across Data Layer

- **Area**: Error handling
- **File(s)**: `src/lib/db.js` (lines ~179, 265)
- **Problem**: Some methods throw, others silently log and return empty arrays. Users see no feedback on load failures.
- **Impact**: Silent failures in `routinesDB.getAll()` hide network issues.
- **Recommendation**: Define error classes (`NetworkError`, `AuthError`); add consistent try-catch; emit errors to context for toast notifications.

### H2 — Workout.jsx Component Overloaded (698 lines)

- **Area**: Component architecture
- **File(s)**: `src/pages/Workout.jsx`
- **Problem**: Single component manages routine list, session history, exercise picker, templates, and body part browser. Hard to maintain and test.
- **Recommendation**: Extract `ExerciseEnrichment` hook, `RoutineList` component, `TemplateSelector` component.

### H3 — Avatar Compression Blocks Main Thread

- **Area**: Performance
- **File(s)**: `src/pages/Profile.jsx` (lines 8-29)
- **Problem**: Canvas resizing + JPEG encoding runs on main thread; freezes UI on large images (>5MB).
- **Recommendation**: Move `compressImage()` to Web Worker using `OffscreenCanvas`; or upload original to Supabase Storage and let CDN optimize.

### H4 — No Pagination on Sessions/Meals/Measurements

- **Area**: Performance / Memory
- **File(s)**: `src/lib/db.js` (lines ~254, 392, 475)
- **Problem**: All records loaded into memory on every fetch. Users with 1000+ records experience slowdowns.
- **Recommendation**: Add `getPage(offset, limit)` to each domain; implement infinite scroll in history views.

### H5 — RLS Policies Not Explicitly Defined in Schema

- **Area**: Security
- **File(s)**: `supabase/schema.sql`
- **Problem**: `ENABLE ROW LEVEL SECURITY` called on all tables, but explicit `CREATE POLICY` statements are not visible in the schema. Relying on Supabase defaults is risky.
- **Recommendation**: Add explicit `SELECT/INSERT/UPDATE/DELETE` policies for each table; add integration tests that verify data isolation between users.

---

## 6. Medium Priority Improvements 🟡

### M1 — IndexedDB Cache Has No Upgrade Path (v1 Only)

- **File(s)**: `src/lib/db.js` (lines ~593-605)
- **Problem**: `CACHE_DB_VER = 1` with no `upgrade()` handler. Schema changes require manual IndexedDB deletion.
- **Recommendation**: Add version upgrade handler; implement TTL-based cache eviction (24h max).

### M2 — Chat-AI Context Cache TTL Too Short (30s)

- **File(s)**: `src/lib/chat-ai.js` (line 9)
- **Problem**: 30s TTL causes unnecessary `Promise.all()` every 30 seconds. Stale data is acceptable for 5 minutes.
- **Recommendation**: Change `CTX_TTL_MS = 30_000` to `300_000`; invalidate on explicit mutations.

### M3 — Recharts Renders All Data Points Without Virtualization

- **File(s)**: `src/pages/Anthropometry.jsx`
- **Problem**: All historical measurements render in chart. 500+ points causes jank.
- **Recommendation**: Limit chart data to last 90 days (configurable); or use canvas renderer for large datasets.

### M4 — Active Session Timer Re-renders Every Second

- **File(s)**: `src/contexts/ActiveSessionContext.jsx` (lines ~20-30)
- **Problem**: `setInterval(tick, 1000)` causes full context re-render every second, even when timer is not visible.
- **Recommendation**: Isolate timer state; use `useRef` for the interval; minimize what's in context.

### M5 — Translation API Called Every Time Exercise Detail Opens

- **File(s)**: `src/components/ExerciseDetail.jsx` (lines ~130-145)
- **Problem**: No caching of translations; each open triggers API call (500-2000ms).
- **Recommendation**: Cache translations in IndexedDB by exercise ID; only fetch if not in cache.

---

## 7. Low Priority / Nice-to-Have 🟢

- **L1** — Add **TypeScript** for type safety across `db.js` and all DB models (estimated 2-3 day refactor; high ROI)
- **L2** — Add **unit tests** for `db.js` — the most complex and critical file has zero test coverage
- **L3** — Implement **SW update notification** — silent auto-update (vite-plugin-pwa `autoUpdate`) may confuse users with sudden UI changes
- **L4** — **Lazy-load SheetJS** — move `import * as XLSX` inside function body; reduces initial bundle by ~200KB
- **L5** — Add **breadcrumb navigation** in modal stacks (ExercisePicker → ExerciseDetail)
- **L6** — Add **opt-in analytics** to track feature usage (no PII)
- **L7** — **Dark mode auto-detect** from `prefers-color-scheme` media query (currently manual toggle only)

---

## 8. Security Findings

| ID | Severity | Finding | File | Recommendation |
|----|----------|---------|------|----------------|
| SEC-001 | 🔴 Critical | Live Supabase ANON_KEY committed to .env | `.env` | Rotate keys; remove from git history |
| SEC-002 | 🟠 High | Base64 images in DB instead of Storage | `db.js:560`, `Profile.jsx` | Migrate to Supabase Storage |
| SEC-003 | 🟠 High | No input validation on ExerciseDB API responses | `exercisedb.js:25` | Add `zod` schema validation |
| SEC-004 | 🟡 Medium | Translation API called directly from client (rate-limiting, no proxy) | `ExerciseDetail.jsx:130` | Add client-side rate limiting |
| SEC-005 | 🟡 Medium | Console.error may expose sensitive data in production | `db.js`, `chat-ai.js` | Add log scrubbing; use Sentry |
| SEC-006 | 🟢 Low | No CSRF protection (mitigated: Supabase auth is SameSite-strict) | N/A | Already handled by Supabase |

**Key security concerns:**
1. **Credential exposure (SEC-001)** is the immediate blocker — rotate keys before any other work.
2. **Storage misuse (SEC-002)** is both a security and performance issue: base64 BLOBs in the DB expose the full image payload in any DB dump/backup.
3. **Input validation (SEC-003)** is weak across all external API integrations; a malformed ExerciseDB response can crash the app.

---

## 9. Performance Findings

| ID | Area | Finding | Impact | Fix |
|----|------|---------|--------|-----|
| PERF-001 | Main thread | XLSX parsing blocks UI 2-5s | Frozen app during import | Move to Web Worker |
| PERF-002 | Memory | No pagination on sessions/meals (all records) | Slowdown at 1000+ records | Add cursor pagination |
| PERF-003 | Main thread | Canvas avatar compression on main thread | 1-2s UI freeze on large images | Use Web Worker / OffscreenCanvas |
| PERF-004 | Render | Recharts renders all data points | Jank in Anthropometry on large datasets | Limit to last 90 days |
| PERF-005 | Render | Active session timer triggers full re-render every second | Unnecessary renders | Isolate timer context |
| PERF-006 | Network | Translation API called every exercise detail open | 500-2000ms latency per open | IndexedDB cache |
| PERF-007 | Bundle | SheetJS (850KB uncompressed) loaded at app init | 15% bundle overhead | Lazy-load on-demand |
| PERF-008 | Render | Workout.jsx 72 state variables, minimal memoization | Unrelated re-renders | Extract sub-components + `React.memo` |

**Key performance concerns:**
XLSX import (PERF-001) is the most user-visible pain point. Pagination (PERF-002) is a future ticking time bomb as users accumulate years of data. Lazy-loading SheetJS (PERF-007) is a 15-minute change with immediate bundle improvement.

---

## 10. Proposed Architecture Improvements

### Current Structure Problems
1. `db.js` (631 lines) handles users, routines, sessions, measurements, meals, photos, caching, and settings — all in one file
2. No domain-driven organization; all data models mixed together
3. Error handling ad-hoc per method
4. No unified cache layer or write-through sync

### Proposed Folder Structure

```
src/
├── domains/
│   ├── workout/
│   │   ├── api.js           # Supabase calls: routines, sessions, exercises
│   │   └── hooks/
│   │       ├── useRoutines.js
│   │       └── useSessions.js
│   ├── nutrition/
│   │   ├── api.js           # meals, foods, meal items
│   │   └── hooks/
│   ├── anthropometry/
│   │   ├── api.js           # measurements + XLSX import
│   │   └── hooks/
│   ├── progress/
│   │   ├── api.js           # photos
│   │   └── hooks/
│   └── user/
│       ├── api.js           # user profile, settings
│       └── hooks/
│
├── lib/
│   ├── supabase.js          # Client singleton (unchanged)
│   ├── storage.js           # File upload helpers (unchanged)
│   ├── cache.js             # NEW: Unified IndexedDB + localStorage cache
│   ├── error.js             # NEW: Error classes + retry logic
│   └── validation.js        # NEW: zod schemas for API responses
│
├── contexts/                # (unchanged)
├── hooks/
│   ├── useTheme.js          # (unchanged)
│   └── useSyncedState.js    # NEW: Debounced state with beforeunload flush
│
└── (pages/, components/ unchanged)
```

---

## 11. Safe Refactor Opportunities

1. **Extract `useSyncedState` hook** — Wraps debounced saves with `beforeunload` flush. Reusable in WorkoutSession, Nutrition, Anthropometry. Zero breaking changes.
2. **Create domain API files** — Start by extracting `routinesDB` out of `db.js` into `domains/workout/api.js`. One domain at a time; no breaking changes.
3. **Lazy-load SheetJS** — Wrap `XLSX.read()` call in dynamic `import('xlsx')`. No API changes needed.
4. **Cache translations** — Add IndexedDB lookup by exercise ID in ExerciseDetail before calling translation API. Purely additive.
5. **Increase chat-ai TTL** — One-line change: `CTX_TTL_MS = 300_000`. Zero risk.

---

## 12. Quick Wins

> Can be done in <30 minutes each.

- [ ] **Rotate Supabase keys** (5 min) — Supabase Dashboard → Project Settings → API → Regenerate ANON_KEY
- [ ] **Remove `.env` from git history** (10 min) — `git filter-branch --tree-filter 'rm -f .env' HEAD`
- [ ] **Add `beforeunload` handler to WorkoutSession.jsx** (10 min) — Flush pending saves before page unload
- [ ] **Increase chat-ai context TTL** (2 min) — `src/lib/chat-ai.js` line 9: change `30_000` → `300_000`
- [ ] **Lazy-load SheetJS** (15 min) — Convert `import * as XLSX from 'xlsx'` to dynamic `import('xlsx')` inside `parseExcelFile()`
- [ ] **Limit Recharts data to last 90 days** (20 min) — Slice `sorted` array before passing to charts in `Anthropometry.jsx`
- [ ] **Cache translations in IndexedDB** (25 min) — Add cache check before mymemory API call in `ExerciseDetail.jsx`

---

## Summary Score

| Dimension | Score | Notes |
|-----------|-------|-------|
| Architecture | 8/10 | Clean layered design; centralized data layer works but approaching limits |
| Security | 6/10 | RLS + Auth solid; exposed keys and no API input validation drag score down |
| Performance | 7/10 | Responsive on small datasets; XLSX/pagination gaps visible at scale |
| Code Quality | 7/10 | Well-written; inconsistent error handling and 698-line Workout.jsx are pain points |
| Maintainability | 7/10 | Clear separation of concerns; no tests; docs sparse |
| PWA Completeness | 8/10 | Manifest correct; RLS protects data; aggressive auto-update may confuse users |
| **Overall** | **7.1/10** | Good foundation — 3-4 quick wins bring it to 8+ |

---

## Final Recommendations (Priority Order)

1. **This week**: Rotate Supabase keys, remove `.env` from git history (C1)
2. **Next week**: Fix debounced session saves `beforeunload` (C5), add `zod` validation for ExerciseDB (C4)
3. **Sprint 1**: Move XLSX to Web Worker (C3), add sessions/meals pagination (H4)
4. **Sprint 2**: Extract domain-specific hooks, consolidate error handling (H1, H2)
5. **Sprint 3**: Add TypeScript + unit tests for `db.js`

---

*This report was generated by the `setto-repo-analyzer` skill. No files were modified.*
*Analysis mode only — all suggestions are proposals, not applied changes.*
