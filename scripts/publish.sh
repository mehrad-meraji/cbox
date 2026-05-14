#!/usr/bin/env bash
set -e

VERSION=$(node -p "require('./package.json').version")

echo "Publishing v${VERSION}..."

# Sync pages version badge to current package.json version
sed -i '' "s/v[0-9]\+\.[0-9]\+\.[0-9]\+/v${VERSION}/" public/index.html

bun run build
npm publish --access public

git add public/index.html
git commit -m "chore: publish v${VERSION}" --allow-empty
git push origin main

echo "v${VERSION} published to npm — CI will deploy GitLab Pages."
