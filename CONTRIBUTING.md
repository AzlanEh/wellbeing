# Contributing to Digital Wellbeing

Thank you for your interest in contributing to Digital Wellbeing! This document provides guidelines and information for contributors.

## Code of Conduct

Please be respectful and constructive in all interactions. We aim to create a welcoming environment for everyone.

## Getting Started

### Prerequisites

- Node.js v18 or later
- Rust (latest stable)
- Git

### Development Setup

1. **Fork the repository** on GitHub

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/digital-wellbeing.git
   cd digital-wellbeing
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Start development server**
   ```bash
   npm run tauri dev
   ```

## Development Workflow

### Branch Naming

Use descriptive branch names:
- `feature/add-weekly-goals` - New features
- `fix/crash-on-startup` - Bug fixes
- `docs/update-readme` - Documentation
- `refactor/cleanup-database` - Code refactoring
- `test/add-history-tests` - Tests

### Commit Messages

Follow conventional commits format:

```
type(scope): short description

Longer description if needed.

Fixes #123
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting (no code change)
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance

Examples:
```
feat(goals): add weekly goal tracking
fix(limits): prevent crash when removing active limit
docs(readme): add installation instructions
```

### Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature
   ```

2. **Make your changes**
   - Write clean, documented code
   - Add tests for new functionality
   - Update documentation if needed

3. **Run checks locally**
   ```bash
   # Frontend checks
   npm run lint
   npm run typecheck
   npm run test:run
   
   # Rust checks
   cd src-tauri
   cargo fmt --check
   cargo clippy
   cargo test
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat(scope): description"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature
   ```
   Then open a Pull Request on GitHub.

6. **Address review feedback**
   - Respond to comments
   - Make requested changes
   - Push updates to the same branch

## Code Style

### TypeScript/React

- Use TypeScript strict mode
- Follow ESLint configuration
- Use functional components with hooks
- Prefer `const` over `let`
- Use meaningful variable names

```typescript
// Good
const handleLimitRemoval = async (appName: string) => {
  const removedData = await removeAppLimit(appName);
  if (removedData) {
    toast(`Limit removed for ${removedData.appName}`);
  }
};

// Avoid
const f = async (n: string) => {
  let x = await removeAppLimit(n);
  if (x) toast(`done`);
};
```

### Rust

- Run `cargo fmt` before committing
- Address all `cargo clippy` warnings
- Use meaningful error messages
- Document public functions

```rust
// Good
/// Removes the usage limit for the specified application.
/// Returns the removed limit data for potential undo operations.
pub fn remove_app_limit(app_name: &str) -> Result<RemovedLimit, WellbeingError> {
    // ...
}

// Avoid
pub fn rem(n: &str) -> Result<(), String> { /* ... */ }
```

### CSS/Styling

- Use Tailwind CSS utilities
- Follow component-based styling
- Use CSS variables for theming
- Maintain dark mode support

## Testing

### Unit Tests (Vitest)

Location: `src/**/*.test.{ts,tsx}`

```typescript
import { describe, it, expect } from 'vitest';

describe('formatDuration', () => {
  it('should format seconds correctly', () => {
    expect(formatDuration(3600)).toBe('1h 0m');
  });
});
```

Run: `npm run test`

### E2E Tests (Playwright)

Location: `e2e/*.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test('should navigate to settings', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Settings');
  await expect(page.locator('h2')).toHaveText('Settings');
});
```

Run: `npm run test:e2e`

### Rust Tests

Location: `src-tauri/src/*.rs`

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize_app_name() {
        assert_eq!(normalize_app_name("Firefox-esr"), "Firefox");
    }
}
```

Run: `cd src-tauri && cargo test`

## Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # Shadcn/UI primitives
│   └── dashboard/      # Dashboard sub-components
├── hooks/              # Custom hooks
├── services/           # API layer
├── store/              # State management
├── types/              # Type definitions
└── utils/              # Utilities

src-tauri/src/
├── lib.rs              # Entry point, commands
├── database.rs         # SQLite operations
├── window_tracker.rs   # X11 tracking
└── ...                 # Feature modules
```

## Adding New Features

### Frontend Feature

1. Create component in `src/components/`
2. Add types to `src/types/index.ts`
3. Add API methods to `src/services/api.ts`
4. Update store if needed in `src/store/`
5. Add tests

### Backend Feature

1. Create module in `src-tauri/src/`
2. Add to `lib.rs` mod declarations
3. Create Tauri commands
4. Register commands in `run()` function
5. Add tests

### Adding Tauri Commands

```rust
// In src-tauri/src/lib.rs

#[tauri::command]
async fn my_new_command(
    state: tauri::State<'_, AppState>,
    arg: String,
) -> CmdResult<ReturnType> {
    // Implementation
}

// Register in run():
.invoke_handler(tauri::generate_handler![
    // ... existing commands
    my_new_command,
])
```

```typescript
// In src/services/api.ts
async myNewCommand(arg: string): Promise<ReturnType> {
  return invoke<ReturnType>('my_new_command', { arg });
}
```

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions
- Check existing issues before creating new ones

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
