# Digital Wellbeing - Improvement Roadmap

This document tracks planned improvements for the Digital Wellbeing application.

---

## High Priority (Security/Bugs)

### 1. [ ] Fix Command Injection Vulnerability
- **Location:** `src-tauri/src/lib.rs:156-172`
- **Issue:** The `block_app` function passes unsanitized user input to `pkill` command
- **Risk:** Attacker could execute arbitrary shell commands via crafted app name
- **Solution:** Validate app names against whitelist pattern `^[a-zA-Z0-9\s\-_.]+$`

### 2. [ ] Enable Content Security Policy (CSP)
- **Location:** `src-tauri/tauri.conf.json:22`
- **Issue:** CSP is set to `null`, disabling XSS protection
- **Solution:** Configure proper CSP rules for the application

### 3. [ ] Fix Race Condition in Loading State
- **Location:** `src/store/useAppStore.ts:72-92`
- **Issue:** Multiple async operations share single `isLoading` flag causing UI flicker
- **Solution:** Implement granular loading states per operation:
  ```typescript
  interface LoadingState {
    dailyStats: boolean;
    weeklyStats: boolean;
    appLimits: boolean;
    hourlyUsage: boolean;
    categoryUsage: boolean;
    blockedApps: boolean;
  }
  ```

### 4. [ ] Handle Potential Panics from Unwrap
- **Location:** `src-tauri/src/lib.rs:45-46`, `src-tauri/src/database.rs:227`
- **Issue:** Using `.unwrap()` on potentially `None` values can crash the app
- **Solution:** Use proper error handling with `?` operator or `.unwrap_or_default()`

### 5. [ ] Add Database Transactions
- **Location:** `src-tauri/src/lib.rs:110-125`
- **Issue:** Multi-step operations like `record_usage` can leave orphan data if partially fails
- **Solution:** Wrap related operations in transactions

---

## Medium Priority (Performance/UX)

### 6. [ ] Reduce Polling Frequency
- **Location:** `src/App.tsx:18`
- **Issue:** Refreshes all data every 10 seconds (7 API calls), wasteful when idle
- **Solution:** 
  - Increase interval to 30-60 seconds
  - Implement visibility-based refresh (pause when window minimized)
  - Consider event-driven updates from backend using Tauri events

### 7. [ ] Add User Error Feedback (Toast Notifications)
- **Location:** `src/store/useAppStore.ts` (multiple locations)
- **Issue:** Errors only logged to console, users never see feedback
- **Solution:** 
  - Install `sonner` toast library (works well with Shadcn/UI)
  - Show success/error toasts for user actions
  - Display connection errors prominently

### 8. [ ] Memoize Expensive Dashboard Computations
- **Location:** `src/components/Dashboard.tsx:83-111`
- **Issue:** `weeklyData`, `pieData`, `categoryData` recalculated on every render
- **Solution:** Wrap computations with `useMemo()`:
  ```typescript
  const weeklyData = useMemo(() => {
    // calculation
  }, [weeklyStats]);
  ```

### 9. [ ] Implement Data Retention Policy
- **Location:** `src-tauri/src/database.rs`
- **Issue:** Old usage sessions never deleted, database grows indefinitely
- **Solution:** 
  - Add cleanup function to delete data older than configurable period (default 90 days)
  - Run cleanup on app startup or daily

### 10. [ ] Fix N+1 Query in get_blocked_apps
- **Location:** `src-tauri/src/lib.rs:175-192`
- **Issue:** Loops through limits and queries database for each one
- **Solution:** Single JOIN query to get all blocked apps at once

### 11. [ ] Add Confirmation Dialogs for Destructive Actions
- **Location:** `src/components/AppLimits.tsx`
- **Issue:** Deleting limits happens immediately without confirmation
- **Solution:** Add Shadcn AlertDialog before removing limits

### 12. [ ] Add Dark Mode Toggle
- **Location:** `src/components/Settings.tsx`
- **Issue:** Dark mode CSS exists but no UI toggle to switch
- **Solution:** 
  - Add theme toggle switch in Settings
  - Persist preference to localStorage or theme.json
  - Apply `dark` class to document root

---

## Lower Priority (Code Quality)

### 13. [ ] Split Dashboard Component
- **Location:** `src/components/Dashboard.tsx` (466 lines)
- **Issue:** Component violates single responsibility principle, hard to maintain
- **Solution:** Extract into smaller components:
  - `components/dashboard/StatsCards.tsx`
  - `components/dashboard/UsageCharts.tsx`
  - `components/dashboard/AppBreakdownChart.tsx`
  - `components/dashboard/AppUsageList.tsx`

### 14. [ ] Remove Duplicate formatTime Function
- **Location:** `src/components/Sidebar.tsx:12-17`
- **Issue:** Duplicates `formatDuration` from `src/utils/formatters.ts`
- **Solution:** Import and use shared `formatDuration` function

### 15. [ ] Remove Dead Code
- **Location:** `src-tauri/src/commands.rs:26-99`
- **Issue:** Entire `Commands` struct and impl block is unused
- **Solution:** Remove or refactor to actually use this abstraction

### 16. [ ] Add Missing Database Indexes
- **Location:** `src-tauri/src/database.rs`
- **Issue:** Missing indexes on frequently queried columns
- **Solution:** Add indexes:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_apps_name ON apps(name);
  CREATE INDEX IF NOT EXISTS idx_apps_category ON apps(category);
  ```

### 17. [ ] Implement Proper Rust Error Types
- **Location:** Throughout `src-tauri/src/`
- **Issue:** All errors are `String` type, no structured error handling
- **Solution:** 
  - Create error enum with `thiserror` crate
  - Implement proper error variants for different failure modes

### 18. [ ] Add Logging Framework
- **Location:** Throughout `src-tauri/src/`
- **Issue:** Uses `println!` and `eprintln!` for logging
- **Solution:** 
  - Add `tracing` crate
  - Configure log levels and output
  - Add structured logging for debugging

### 19. [ ] Refactor Hardcoded App Name Mappings
- **Location:** `src-tauri/src/window_tracker.rs:98-169`
- **Issue:** 40+ if-else chains for normalizing app names
- **Solution:** Use HashMap loaded from config file

### 20. [ ] Add Database Migration System
- **Location:** `src-tauri/src/database.rs:116-119`
- **Issue:** Uses inline ALTER TABLE with ignored errors
- **Solution:** Implement proper migrations with `refinery` or `sqlx-migrate`

---

## Testing (Currently None)

### 21. [ ] Add Frontend Unit Tests
- **Framework:** Vitest + React Testing Library
- **Coverage:**
  - `src/utils/formatters.ts` - all formatting functions
  - `src/lib/utils.ts` - cn() utility
  - `src/store/useAppStore.ts` - store actions

### 22. [ ] Add Frontend Component Tests
- **Framework:** Vitest + React Testing Library
- **Coverage:**
  - Component rendering
  - User interactions
  - State updates

### 23. [ ] Add Rust Unit Tests
- **Coverage:**
  - Database operations
  - Window tracking logic
  - App name normalization

### 24. [ ] Add Integration Tests
- **Framework:** Playwright or WebdriverIO
- **Coverage:**
  - Full user flows
  - Tauri command integration

---

## Feature Requests

### 25. [ ] Data Export
- Export usage data as CSV or JSON
- Allow selecting date range
- Include all apps or filtered

### 26. [ ] Historical Analysis View
- View past weeks/months
- Trend charts over time
- Compare periods

### 27. [ ] Break Reminders
- Pomodoro-style break notifications
- Configurable work/break intervals
- Option to enforce breaks

### 28. [ ] Focus Mode
- Proactively block distracting apps
- Scheduled focus sessions
- Quick toggle from system tray

### 29. [ ] Goal Setting
- Set daily screen time goals (not just limits)
- Track progress toward goals
- Celebrate achievements

### 30. [ ] Multiple Profiles
- Separate work/personal profiles
- Different limits per profile
- Auto-switch based on time/day

### 31. [ ] Undo for Destructive Actions
- Undo limit removal
- Undo category changes
- Temporary "trash" for deleted items

### 32. [ ] System Tray Integration
- Minimize to tray
- Quick stats in tray menu
- Quick actions (focus mode, etc.)

### 33. [ ] Keyboard Accessibility Improvements
- Full keyboard navigation
- Focus indicators
- Screen reader support

### 34. [ ] Notification Customization
- Configure notification thresholds (currently hardcoded 80%, 100%)
- Choose notification sound
- Do not disturb schedule

---

## DevOps/Infrastructure

### 35. [ ] Add CI/CD Pipeline
- **Platform:** GitHub Actions
- **Jobs:**
  - Lint (ESLint, Clippy)
  - Type check (TypeScript, Rust)
  - Test (Vitest, Cargo test)
  - Build (multi-platform)
  - Release automation

### 36. [ ] Add Pre-commit Hooks
- **Tool:** Husky + lint-staged
- **Checks:**
  - ESLint
  - Prettier
  - TypeScript
  - Cargo fmt

### 37. [ ] Create PKGBUILD for Arch Linux
- AUR package for easy installation
- Include desktop file and icons

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

1. [ ] Remove dead code in `commands.rs`
2. [ ] Fix duplicate `formatTime` in Sidebar
3. [ ] Increase refresh interval to 30s
4. [ ] Add `useMemo` to Dashboard computations
5. [ ] Add dark mode toggle in Settings
6. [ ] Add database indexes
7. [ ] Enable CSP in tauri.conf.json

---

## Notes

- Priority levels are suggestions; security issues should always be addressed first
- Some improvements may require breaking changes - consider versioning
- Test thoroughly after each change, especially security-related ones
- Consider user feedback when prioritizing feature requests

---

*Last updated: 2026-01-12*
