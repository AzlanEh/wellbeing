# Digital Wellbeing

A cross-platform desktop application for tracking and managing your digital habits. Built with Tauri, React, and TypeScript.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Linux-lightgrey.svg)

## Features

### Core Functionality
- **Usage Tracking** - Automatic tracking of application usage time with session detection
- **App Limits** - Set daily time limits for applications with optional hard blocking
- **Focus Mode** - Proactively block distracting apps with scheduled focus sessions
- **Break Reminders** - Pomodoro-style notifications to encourage healthy breaks
- **Goal Setting** - Set screen time goals and track progress with achievements

### Analytics & History
- **Dashboard** - Real-time overview of today's usage with charts and statistics
- **Historical Analysis** - View past weeks/months with trend charts and period comparisons
- **Category Tracking** - Organize apps into categories (Work, Social, Entertainment, etc.)
- **Data Export** - Export usage data as CSV or JSON with date range selection

### User Experience
- **Dark Mode** - Light, dark, and system theme options
- **System Tray** - Minimize to tray with quick actions
- **Keyboard Shortcuts** - Full keyboard navigation support
- **Notifications** - Customizable notification thresholds with Do Not Disturb

## Screenshots

<details>
<summary>Click to view screenshots</summary>

### Dashboard
![Dashboard](docs/images/dashboard.png)

### App Limits
![App Limits](docs/images/limits.png)

### Focus Mode
![Focus Mode](docs/images/focus.png)

</details>

## Installation

### Arch Linux (AUR)

```bash
# Using yay
yay -S digital-wellbeing

# Or using paru
paru -S digital-wellbeing
```

### From Source

#### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- System dependencies:
  ```bash
  # Ubuntu/Debian
  sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
  
  # Arch Linux
  sudo pacman -S webkit2gtk-4.1 base-devel curl wget file xdotool openssl libayatana-appindicator librsvg
  ```

#### Build Steps

```bash
# Clone the repository
git clone https://github.com/yourusername/digital-wellbeing.git
cd digital-wellbeing

# Install dependencies
npm install

# Development mode
npm run tauri dev

# Production build
npm run tauri build
```

The built application will be in `src-tauri/target/release/bundle/`.

## Usage

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+1` | Dashboard |
| `Ctrl+2` | History |
| `Ctrl+3` | Goals |
| `Ctrl+4` | App Limits |
| `Ctrl+5` | Settings |
| `Ctrl+R` | Refresh data |

### Setting App Limits

1. Navigate to **App Limits** (Ctrl+4)
2. Click **Add New Limit**
3. Select an app from the list or enter a custom name
4. Set the daily time limit
5. Optionally enable **Hard Block** to force-quit apps when the limit is reached

### Focus Mode

1. Navigate to **Focus Mode** via the sidebar
2. Add apps to your block list
3. Start a focus session with a set duration
4. Optionally schedule recurring focus sessions

### Exporting Data

1. Go to **Settings** (Ctrl+5)
2. Scroll to **Export Data**
3. Select your date range
4. Choose CSV or JSON format
5. Click **Export** and select save location

## Architecture

```
digital-wellbeing/
├── src/                    # Frontend (React + TypeScript)
│   ├── components/         # UI components
│   │   ├── dashboard/      # Dashboard sub-components
│   │   └── ui/            # Shadcn/UI components
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API service layer
│   ├── store/             # Zustand state management
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
│
├── src-tauri/             # Backend (Rust)
│   └── src/
│       ├── lib.rs         # Main entry, Tauri commands
│       ├── database.rs    # SQLite database operations
│       ├── window_tracker.rs # X11 window tracking
│       ├── focus_mode.rs  # Focus session management
│       ├── break_reminder.rs # Break reminder system
│       ├── goals.rs       # Goals and achievements
│       └── ...
│
├── e2e/                   # Playwright E2E tests
└── pkg/                   # Packaging (PKGBUILD, etc.)
```

### Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Shadcn/UI, Recharts
- **Backend**: Rust, Tauri 2.0
- **Database**: SQLite (via rusqlite)
- **State Management**: Zustand
- **Testing**: Vitest (unit), Playwright (E2E)

## Development

### Available Scripts

```bash
# Start development server
npm run dev

# Run frontend type checking
npm run typecheck

# Run ESLint
npm run lint

# Run unit tests
npm run test

# Run E2E tests
npm run test:e2e

# Run Rust tests
cd src-tauri && cargo test

# Build for production
npm run tauri build
```

### Project Structure

| Directory | Description |
|-----------|-------------|
| `src/components/` | React components |
| `src/hooks/` | Custom React hooks |
| `src/store/` | Zustand store |
| `src/services/` | Tauri API wrappers |
| `src-tauri/src/` | Rust backend |
| `e2e/` | Playwright tests |

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm run test && npm run lint`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Style

- TypeScript/React follows ESLint configuration
- Rust code uses `cargo fmt` and `cargo clippy`
- Pre-commit hooks are enabled via Husky

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Tauri](https://tauri.app/) - Framework for building desktop apps
- [Shadcn/UI](https://ui.shadcn.com/) - UI component library
- [Recharts](https://recharts.org/) - Charting library
- [Lucide Icons](https://lucide.dev/) - Icon set
