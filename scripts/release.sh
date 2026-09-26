#!/usr/bin/env bash
set -e

VERSION=$1

if [ -z "$VERSION" ]; then
  echo "Usage: ./scripts/release.sh <version>  (e.g. 0.1.4)"
  exit 1
fi

# Strip leading 'v' if provided
VERSION=${VERSION#v}

echo "Releasing v${VERSION}..."

# Bump package.json
node -e "
  const fs = require('fs');
  const p = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  p.version = '$VERSION';
  fs.writeFileSync('package.json', JSON.stringify(p, null, 2) + '\n');
"

# Bump version in Pages site
sed -i '' "s/v[0-9]\+\.[0-9]\+\.[0-9]\+/v${VERSION}/" public/index.html

git add package.json public/index.html
git commit -m "chore: bump version to ${VERSION}"
git push origin main
git tag "v${VERSION}"
git push origin "v${VERSION}"

echo "v${VERSION} tagged and pushed — GitHub Actions will publish to npm and Docker Hub."
