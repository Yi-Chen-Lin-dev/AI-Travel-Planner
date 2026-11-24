#!/usr/bin/env bash
# Read-only local diagnostics. Does not connect to remote databases or alter files.
set -u
printf 'AI Travel Planner local integration prerequisite check\n'
printf '==================================================\n'
printf 'Git checkout: '; git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'not a Git checkout'
printf 'Python: '; if command -v python3 >/dev/null 2>&1; then python3 --version; else echo 'MISSING'; fi
printf 'Node: '; if command -v node >/dev/null 2>&1; then node --version; else echo 'MISSING'; fi
printf 'npm: '; if command -v npm >/dev/null 2>&1; then npm --version; else echo 'MISSING'; fi
printf 'psql: '; if command -v psql >/dev/null 2>&1; then psql --version; else echo 'MISSING (needed for PostgreSQL setup)'; fi
printf 'pg_isready: '; if command -v pg_isready >/dev/null 2>&1; then pg_isready -h 127.0.0.1 || true; else echo 'MISSING'; fi
printf 'DB_HOST: %s\n' "${DB_HOST:-[not set]}"
printf 'DB_NAME: %s\n' "${DB_NAME:-[not set]}"
printf 'DB_USER: %s\n' "${DB_USER:-[not set]}"
if [[ -n "${DB_PASSWORD:-}" ]]; then echo 'DB_PASSWORD: [set; not printed]'; else echo 'DB_PASSWORD: [not set]'; fi
printf 'Backend preview opt-in: %s\n' "${ENABLE_PREVIEW_ITINERARIES:-off}"
printf 'Estimated routing opt-in: %s\n' "${ENABLE_ESTIMATED_TRAVEL:-off}"
for file in ai/optimizer.py ai/poi_adapter.py ai/mvp_pipeline.py backend/api/main.py backend/api/itineraries.py backend/database/planner.sql frontend/package.json; do
  if [[ -f "$file" ]]; then printf 'Found: %s\n' "$file"; else printf 'MISSING FILE: %s\n' "$file"; fi
done
printf '\nThis check is read-only. Review docs/INTEGRATION_20261124.md before any database writes.\n'
