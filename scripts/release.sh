#!/usr/bin/env bash
# scripts/release.sh — bump version across all manifests and create a git tag
# Usage: ./scripts/release.sh <version>
# Example: ./scripts/release.sh 0.2.0

set -euo pipefail

VERSION="${1:-}"

if [[ -z "$VERSION" ]]; then
    echo "Usage: $0 <version>"
    echo "Example: $0 0.2.0"
    exit 1
fi

if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Error: version must be in semver format (e.g. 0.2.0)"
    exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Ensure working tree is clean
if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "Error: working tree has uncommitted changes. Commit or stash them first."
    exit 1
fi

echo "Bumping version to $VERSION..."

# 1. package.json
sed -i "s/\"version\": \".*\"/\"version\": \"${VERSION}\"/" package.json

# 2. package-lock.json (top-level version field only)
sed -i "0,/\"version\": \".*\"/{s/\"version\": \".*\"/\"version\": \"${VERSION}\"/}" package-lock.json

# 3. src-tauri/Cargo.toml
sed -i "s/^version = \".*\"/version = \"${VERSION}\"/" src-tauri/Cargo.toml

# 4. src-tauri/tauri.conf.json
sed -i "s/\"version\": \".*\"/\"version\": \"${VERSION}\"/" src-tauri/tauri.conf.json 2>/dev/null || true

# 5. pkg/linux/arch/PKGBUILD
sed -i "s/^pkgver=.*/pkgver=${VERSION}/" pkg/linux/arch/PKGBUILD

echo "Updated files:"
git diff --stat

# Commit and tag
git add package.json package-lock.json src-tauri/Cargo.toml src-tauri/tauri.conf.json pkg/linux/arch/PKGBUILD
git commit -m "chore: bump version to ${VERSION}"
git tag "v${VERSION}"

echo ""
echo "Done. To push and trigger the release workflow:"
echo "  git push origin main && git push origin v${VERSION}"
