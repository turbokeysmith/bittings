#!/usr/bin/env bash
# One-command Cloudflare Pages deploy for the PUBLIC WEBSITE (website/site/).
# Reads the API token from .secrets/cloudflare.env (gitignored — never committed).
#
# Usage:
#   ./_deploy-website.sh preview        -> a preview URL; does NOT touch turbokeysmith.com
#   ./_deploy-website.sh prod           -> LIVE on turbokeysmith.com (--branch=main)
#
# Always deploy PROD from the `main` branch (its website/site is the source of truth).
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -f "$HERE/.secrets/cloudflare.env" ]; then
  echo "ERROR: missing $HERE/.secrets/cloudflare.env" >&2
  echo "  Create it with a Pages:Edit token:  CLOUDFLARE_API_TOKEN='cfut_...'" >&2
  echo "  (or run 'npx wrangler login' for OAuth instead)" >&2
  exit 1
fi
# Auto-export every var defined in the secrets file (token AND account id) so the
# wrangler subprocess sees them. Pinning CLOUDFLARE_ACCOUNT_ID is required because
# the Pages-scoped token can't enumerate accounts on its own.
set -a
# shellcheck disable=SC1090
source "$HERE/.secrets/cloudflare.env"
set +a

mode="${1:-preview}"
if [ "$mode" = "prod" ] || [ "$mode" = "main" ]; then
  branch="main"
  cur="$(git -C "$HERE" rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
  if [ "$cur" != "main" ]; then
    echo "REFUSING: production must deploy from the 'main' branch (its website/site is the live" >&2
    echo "  source of truth); you are on '$cur'. Run:  git checkout main  then re-run: ./_deploy-website.sh prod" >&2
    exit 1
  fi
  echo ">> Deploying to PRODUCTION (turbokeysmith.com) from main ..."
else
  # the label IS the preview branch name (default 'preview'); sanitized
  branch="$(printf '%s' "$mode" | tr -cd 'a-z0-9-')"; [ -n "$branch" ] || branch="preview"
  echo ">> Deploying PREVIEW ($branch) — will NOT affect the live domain ..."
fi

npx --yes wrangler pages deploy "$HERE/website/site" \
  --project-name=turbokeysmith --branch="$branch" --commit-dirty=true
