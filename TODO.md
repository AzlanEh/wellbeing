# Digital Wellbeing - Improvement Roadmap

This document tracks planned improvements for the Digital Wellbeing application.

---

## High Priority (Security/Bugs)

### 1. [x] Fix Command Injection Vulnerability
- **Location:** `src-tauri/src/lib.rs:148-154`
- **Issue:** The `block_app` function passes unsanitized user input to `pkill` command
- **Risk:** Attacker could execute arbitrary shell commands via crafted app name
- **Solution:** ✅ Added `is_valid_app_name()` validation function that only allows alphanumeric, spaces, hyphens, underscores, dots. Changed `pkill -f` to `pkill -x` for exact matching.

### 2. [x] Enable Content Security Policy (CSP)
- **Location:** `src-tauri/tauri.conf.json:22`
- **Issue:** CSP is set to `null`, disabling XSS protection
- **Solution:** ✅ Configured proper CSP: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src ipc: http://ipc.localhost`

### 3. [x] Fix Race Condition in Loading State
- **Location:** `src/store/useAppStore.ts`
- **Issue:** Multiple async operations share single `isLoading` flag causing UI flicker
- **Solution:** ✅ Implemented granular `LoadingState` interface with per-operation booleans. Added `isInitialLoad()` helper.

### 4. [x] Handle Potential Panics from Unwrap
- **Location:** `src-tauri/src/lib.rs:45-46`, `src-tauri/src/database.rs:227`
- **Issue:** Using `.unwrap()` on potentially `None` values can crash the app
- **Solution:** ✅ Replaced `.unwrap()` with `.unwrap_or_else()` and proper option chaining using `.ok().and_then().map().unwrap_or_else()`

### 5. [x] Add Database Transactions
- **Location:** `src-tauri/src/lib.rs:110-125`
- **Issue:** Multi-step operations like `record_usage` can leave orphan data if partially fails
- **Solution:** ✅ Added `record_usage_atomic()` method that uses SQLite transactions to ensure atomicity

---

## Medium Priority (Performance/UX)

### 6. [x] Reduce Polling Frequency
- **Location:** `src/App.tsx`
- **Issue:** Refreshes all data every 10 seconds (7 API calls), wasteful when idle
- **Solution:** ✅ Increased interval to 30 seconds. Added visibility-based refresh that pauses polling when window is hidden and refreshes immediately when becoming visible.

### 7. [x] Add User Error Feedback (Toast Notifications)
- **Location:** `src/store/useAppStore.ts`, `src/App.tsx`
- **Issue:** Errors only logged to console, users never see feedback
- **Solution:** ✅ Installed `sonner` toast library. Added success/error toasts for setAppLimit, removeAppLimit, and setAppCategory actions.

### 8. [x] Memoize Expensive Dashboard Computations
- **Location:** `src/components/Dashboard.tsx`
- **Issue:** `weeklyData`, `pieData`, `categoryData` recalculated on every render
- **Solution:** ✅ Wrapped `appsToday`, `pieData`, `weeklyData`, `timelineData`, and `categoryData` with `useMemo()`.

### 9. [x] Implement Data Retention Policy
- **Location:** `src-tauri/src/database.rs`, `src-tauri/src/lib.rs`
- **Issue:** Old usage sessions never deleted, database grows indefinitely
- **Solution:** ✅ Added `cleanup_old_data()` and `get_storage_stats()` methods. Runs cleanup on app startup (default 90 days retention). Added Tauri commands for manual cleanup.

### 10. [x] Fix N+1 Query in get_blocked_apps
- **Location:** `src-tauri/src/lib.rs`, `src-tauri/src/database.rs`
- **Issue:** Loops through limits and queries database for each one
- **Solution:** ✅ Added `get_blocked_apps()` method in database.rs with single JOIN query that gets all blocked apps at once.

### 11. [x] Add Confirmation Dialogs for Destructive Actions
- **Location:** `src/components/AppLimits.tsx`
- **Issue:** Deleting limits happens immediately without confirmation
- **Solution:** ✅ Created AlertDialog component. Added delete confirmation dialog before removing limits.

### 12. [x] Add Dark Mode Toggle
- **Location:** `src/components/Settings.tsx`, `src/hooks/useDarkMode.ts`
- **Issue:** Dark mode CSS exists but no UI toggle to switch
- **Solution:** ✅ Created `useDarkMode` hook with localStorage persistence. Added Light/Dark/System toggle buttons in Settings with icons.

---

## Lower Priority (Code Quality)

### 13. [x] Split Dashboard Component
- **Location:** `src/components/Dashboard.tsx` (was 466 lines, now ~110 lines)
- **Issue:** Component violates single responsibility principle, hard to maintain
- **Solution:** ✅ Extracted into smaller components:
  - `components/dashboard/constants.ts` - Shared colors and tooltip styles
  - `components/dashboard/StatsCards.tsx` - Top stat cards
  - `components/dashboard/UsageChart.tsx` - Tabbed chart area
  - `components/dashboard/AppBreakdownPie.tsx` - Pie chart
  - `components/dashboard/AppUsageList.tsx` - App list with category editing
  - `components/dashboard/index.ts` - Barrel exports

### 14. [x] Remove Duplicate formatTime Function
- **Location:** `src/components/Sidebar.tsx:12-17`
- **Issue:** Duplicates `formatDuration` from `src/utils/formatters.ts`
- **Solution:** ✅ Updated Sidebar to import and use shared `formatDuration` function

### 15. [x] Remove Dead Code
- **Location:** `src-tauri/src/commands.rs:26-99`
- **Issue:** Entire `Commands` struct and impl block is unused
- **Solution:** ✅ Removed dead code, reduced from 99 lines to 21 lines (kept only type definitions)

### 16. [x] Add Missing Database Indexes
- **Location:** `src-tauri/src/database.rs`
- **Issue:** Missing indexes on frequently queried columns
- **Solution:** ✅ Added indexes via migration system:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_apps_name ON apps(name);
  CREATE INDEX IF NOT EXISTS idx_apps_category ON apps(category);
  ```

### 17. [x] Implement Proper Rust Error Types
- **Location:** Throughout `src-tauri/src/`
- **Issue:** All errors are `String` type, no structured error handling
- **Solution:** ✅ 
  - Added `thiserror = "2.0"` crate
  - Created `src-tauri/src/error.rs` with `WellbeingError` enum
  - Implemented variants: Database, IO, InvalidAppName, Notification, Autostart, etc.
  - Updated all commands to use `CmdResult<T>` type alias

### 18. [x] Add Logging Framework
- **Location:** Throughout `src-tauri/src/`
- **Issue:** Uses `println!` and `eprintln!` for logging
- **Solution:** ✅
  - Added `tracing = "0.1"` and `tracing-subscriber` crates
  - Created `init_tracing()` function with env-filter support
  - Replaced all println!/eprintln! with structured logging (info!, error!, warn!, debug!)
  - Added structured fields like `deleted_sessions`, `error`, `notification_type`

### 19. [x] Refactor Hardcoded App Name Mappings
- **Location:** `src-tauri/src/window_tracker.rs:98-169`
- **Issue:** 40+ if-else chains for normalizing app names
- **Solution:** ✅
  - Added `once_cell = "1.21"` crate
  - Created `AppMapping` struct and `APP_MAPPINGS` static Vec
  - Created `EXACT_MATCH_MAP` HashMap for O(1) lookups
  - Data-driven approach replaces if-else chains

### 20. [x] Add Database Migration System
- **Location:** `src-tauri/src/database.rs:116-119`
- **Issue:** Uses inline ALTER TABLE with ignored errors
- **Solution:** ✅
  - Created `src-tauri/src/migrations.rs` module
  - Tracks schema version in `schema_version` table
  - Migrations are versioned, described, and applied incrementally
  - Idempotent migration handling (ignores "column already exists" errors)
  - Unit tests for migration ordering

---

## Testing

### 21. [x] Add Frontend Unit Tests
- **Framework:** Vitest + React Testing Library
- **Coverage:** ✅
  - `src/utils/formatters.test.ts` - 15 tests for all formatting functions
  - `src/lib/utils.test.ts` - 9 tests for cn() utility
  - `src/hooks/useDarkMode.test.ts` - 10 tests for dark mode hook

### 22. [x] Add Frontend Component Tests
- **Framework:** Vitest + React Testing Library
- **Coverage:** ✅
  - `src/components/dashboard/StatsCards.test.tsx` - 7 tests
  - `src/components/dashboard/AppUsageList.test.tsx` - 9 tests
  - Component rendering, user interactions, state updates

### 23. [x] Add Rust Unit Tests
- **Coverage:** ✅
  - `src-tauri/src/window_tracker.rs` - 12 tests for app name extraction
  - `src-tauri/src/lib.rs` - 9 tests (4 app name validation + 5 CSV export)
  - `src-tauri/src/migrations.rs` - 2 tests for migration ordering
  - Total: 22 Rust tests

### 24. [ ] Add Integration Tests
- **Framework:** Playwright or WebdriverIO
- **Coverage:**
  - Full user flows
  - Tauri command integration

---

## Feature Requests

### 25. [x] Data Export
- ✅ Export usage data as CSV or JSON
- ✅ Allow selecting date range
- ✅ Include all apps with categories
- **Implementation:**
  - Added `export_usage_data()` database query with date range filtering
  - Added `format_export_csv()` and `format_export_json()` Tauri commands
  - Created Export UI in Settings with date pickers
  - Integrated Tauri dialog and fs plugins for file save
  - Added 5 Rust tests for CSV formatting

### 26. [x] Historical Analysis View
- ✅ View past weeks/months with preset and custom date ranges
- ✅ Trend charts over time (line chart showing daily usage)
- ✅ Compare periods (shows change vs previous period)
- **Implementation:**
  - Added `get_daily_totals_in_range()`, `get_app_usage_in_range()`, `get_category_usage_in_range()` database methods
  - Added `get_historical_data` Tauri command returning daily totals, app usage, and category usage
  - Created `src/components/History.tsx` with:
    - Date range presets (7d, 14d, 30d, 90d) and custom picker
    - Stats cards (total time, daily average, peak day, vs previous period)
    - Line chart showing daily usage trends
    - Bar chart for top 10 apps
    - Pie chart for category breakdown
    - Period comparison section showing app-by-app changes
  - Added "History" tab to Sidebar navigation
  - Added `HistoricalData` type to frontend
  - Added keyboard shortcut Ctrl+2 for History

### 27. [x] Break Reminders
- ✅ Pomodoro-style break notifications
- ✅ Configurable work/break intervals
- ✅ Option to show notification when break time
- **Implementation:**
  - Created `src-tauri/src/break_reminder.rs` module with async state management
  - Background task ticks every 60 seconds
  - Settings stored in memory with default 25min work / 5min break
  - Break Reminders card in Settings with enable toggle and duration inputs

### 28. [ ] Focus Mode
- Proactively block distracting apps
- Scheduled focus sessions
- Quick toggle from system tray

### 29. [ ] Goal Setting
- Set daily screen time goals (not just limits)
- Track progress toward goals
- Celebrate achievements

### 30. [ ] Multiple Profiles (not now)
- Separate work/personal profiles
- Different limits per profile
- Auto-switch based on time/day

### 31. [ ] Undo for Destructive Actions
- Undo limit removal
- Undo category changes
- Temporary "trash" for deleted items

### 32. [x] System Tray Integration
- ✅ Minimize to tray
- ✅ Quick actions (show/hide window, quit)
- ✅ Left-click to toggle window visibility
- **Implementation:**
  - Created `src-tauri/src/tray.rs` module with tray icon and menu
  - Added minimize button (Minus icon) in Sidebar header
  - Enabled `tray-icon` feature in Tauri Cargo.toml

### 33. [x] Keyboard Accessibility Improvements
- ✅ Full keyboard navigation
- ✅ Focus indicators
- ✅ Screen reader support
- **Implementation:**
  - Added enhanced focus styles in `src/index.css` (skip-link, focus-visible rings, sr-only)
  - Created `src/hooks/useKeyboardNav.ts` with `useKeyboardNav()`, `useRovingTabIndex()`, `useAnnounce()` hooks
  - Added skip link and ARIA attributes to App.tsx
  - Added `role="navigation"`, `aria-current="page"` to Sidebar
  - Added `role="region"`, `role="list"`, `role="alert"` to AppLimits

### 34. [x] Notification Customization
- ✅ Configure notification thresholds (warning at custom %, exceeded at 100%)
- ✅ Do not disturb schedule
- **Implementation:**
  - Created `src-tauri/src/notification_settings.rs` with `NotificationSettings` struct and `NotificationManager`
  - DND schedule support with overnight range handling
  - Added 5 Tauri commands for notification settings management
  - Added notification settings UI in Settings page with threshold slider and test button

---

## DevOps/Infrastructure

### 35. [x] Add CI/CD Pipeline
- **Platform:** GitHub Actions
- **Jobs:**
  - ✅ Lint (ESLint, Clippy)
  - ✅ Type check (TypeScript, Rust)
  - ✅ Test (Vitest, Cargo test)
  - ✅ Build (Linux)
  - Release automation (pending)
- **Implementation:**
  - Created `.github/workflows/ci.yml` with parallel jobs
  - Jobs: frontend-lint, frontend-test, rust-lint, rust-fmt, rust-test, build
  - Runs on push to main and all pull requests
  - Uses ubuntu-22.04 for Tauri build compatibility

### 36. [x] Add Pre-commit Hooks
- **Tool:** Husky + lint-staged
- **Checks:**
  - ✅ ESLint (auto-fix on staged files)
  - ✅ TypeScript type checking
  - ✅ Cargo fmt check for Rust files
- **Implementation:**
  - Installed husky and lint-staged
  - Created `.husky/pre-commit` hook
  - Configured lint-staged in package.json

### 37. [x] Create PKGBUILD for Arch Linux
- ✅ AUR package for easy installation
- ✅ Include desktop file and icons
- **Implementation:**
  - Created `pkg/arch/PKGBUILD` - release package (builds from tarball)
  - Created `pkg/arch/PKGBUILD-git` - git version (builds from repo)
  - Created `pkg/arch/digital-wellbeing.desktop` - desktop entry
  - Created `LICENSE` (MIT)

### 38. [ ] Add Changelog
- Track version history
- Document breaking changes
- Follow Keep a Changelog format

### 39. [ ] Improve Documentation
- Comprehensive README
- Contributing guidelines
- Architecture documentation
- API documentation

---

## Quick Wins (Easy to Implement)

These can be done quickly with minimal risk:

1. [x] Remove dead code in `commands.rs` ✅
2. [x] Fix duplicate `formatTime` in Sidebar ✅
3. [x] Increase refresh interval to 30s ✅
4. [x] Add `useMemo` to Dashboard computations ✅
5. [x] Add dark mode toggle in Settings ✅
6. [x] Add database indexes ✅
7. [x] Enable CSP in tauri.conf.json ✅

---

## Notes

- Priority levels are suggestions; security issues should always be addressed first
- Some improvements may require breaking changes - consider versioning
- Test thoroughly after each change, especially security-related ones
- Consider user feedback when prioritizing feature requests

---

*Last updated: 2026-01-13 (Tasks 33, 34, 35, 36, 37 completed)*
