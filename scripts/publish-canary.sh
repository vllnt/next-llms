#!/usr/bin/env bash
# Manual canary publish for @vllnt/next-llms — bootstrap / local fallback.
#
# Normal path: the GitHub Actions `publish.yml` canary job publishes on every push
# to main via OIDC trusted publishing (no token, with provenance). Use THIS script
# only to:
#   1. bootstrap the FIRST canary, before the npm trusted publisher is configured
#      (CI OIDC publish needs a package that already exists), or
#   2. publish a canary locally as a fallback.
#
# Requires: `npm whoami` == the maintainer. npm 2FA needs a one-time password.
#
# Usage:
#   bash scripts/publish-canary.sh [--otp=123456] [--dry-run]
#
# Version scheme mirrors publish.yml: <base>-canary.<short-sha>, where <base> is
# package.json's version, patch-bumped if that version is already published stable
# (so the canary always sorts ABOVE the last release). Published under the @canary
# dist-tag only — @latest is never moved. package.json is restored afterwards.
set -euo pipefail
cd "$(dirname "$0")/.."

OTP_ARG=""
DRY_RUN=""
for arg in "$@"; do
  case "$arg" in
    --otp=*) OTP_ARG="--otp=${arg#--otp=}" ;;
    --dry-run) DRY_RUN="--dry-run" ;;
    *) echo "Unknown argument: $arg" >&2; exit 2 ;;
  esac
done

PKG=$(node -p "require('./package.json').name")
BASE=$(node -p "require('./package.json').version")

# If package.json's version is already a published stable, this canary is work
# toward the NEXT version — bump the patch so it sorts above the release.
if [ -n "$(npm view "${PKG}@${BASE}" version 2>/dev/null || true)" ]; then
  BASE=$(node -e "const v=require('./package.json').version.split('.').map(Number);console.log(v[0]+'.'+v[1]+'.'+(v[2]+1))")
fi

SHA=$(git rev-parse --short=7 HEAD)
CANARY="${BASE}-canary.${SHA}"

echo "Package:  $PKG"
echo "Canary:   $CANARY  (tag: canary)"
[ -n "$DRY_RUN" ] && echo "Mode:     DRY RUN (no publish)"

if [ -z "$DRY_RUN" ]; then
  npm whoami >/dev/null 2>&1 || { echo "Not logged in to npm — run: npm login" >&2; exit 1; }
fi

pnpm build

# Restore package.json on exit so the canary version is never committed.
trap 'git checkout -- package.json 2>/dev/null || true' EXIT

npm version "$CANARY" --no-git-tag-version --ignore-scripts >/dev/null
npm publish --tag canary --access public --ignore-scripts $DRY_RUN $OTP_ARG

if [ -z "$DRY_RUN" ]; then
  echo "Published $PKG@$CANARY"
  echo "Install:  npm i $PKG@canary"
fi
