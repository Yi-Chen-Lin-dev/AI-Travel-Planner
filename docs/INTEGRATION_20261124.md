# AI Travel Planner — 2026-11-24 Integration Workbench (DRAFT)

**Branch:** `integration/mvp-20261124-review`. **Status:** staged for team review; **not merged, approved, or end-to-end verified**.

## Sources and ownership

- Fah: Next.js Frontend from `feature/preference-api`. The old `backend/app/` in that branch is an **in-memory prototype**; **do not run it** for the integrated MVP.
- Allen: V2 FastAPI in `backend/api/` and PostgreSQL schema in `backend/database/planner.sql`, copied from `feature/fastapi-backend-v2`.
- Yi-Chen: `ai/optimizer.py`, offline demo, tests and v0.1 docs from `feature/optimizer-mvp-w7`.
- William: **95-record sample only** in `data/attractions_final_20261020_130555.json` from `William`. **Not normalized / not imported**. This file does not represent the user's unshared Mac Downloads/world data.

These are copied/staged without merging any teammate's source PR. Review of each owner's original work remains required.

## What the integration branch actually does

1. Allen's `POST /trips/` has a **review-proposed backwards-compatible extension** to store `destination`, `start_date`, `end_date`; `title` is limited to the SQL column's 150 chars. It still requires an existing `user_id`.
2. Fah's `frontend/app/page.tsx` submits those trip fields to Allen's API. `NEXT_PUBLIC_TEST_USER_ID` may override the fixed local demo UUID. This is **not authentication**.
3. The development-only `POST /dev/optimizer-smoke` calls the real `optimize_itinerary()` Python function and converts input validation errors to HTTP 422.
4. Optimizer unit tests and an adapter test can be run offline without live PostgreSQL.
5. The dev-only endpoint is **disabled by default**. Never turn it on in a public/production deployment.

**NOT connected:** William's Recommendation Engine, data normalization, real travel-time matrix or mapping provider, persistent itineraries, and Fah's hard-coded `simulatedDays` itinerary/map UI. Therefore this is **not** a completed November MVP.

## Local setup from the project root

Requirements: Mac/Linux/Windows with Python >=3.10, Node >=20.9, and (for DB-enabled tests only) PostgreSQL.

```sh
git clone --branch integration/mvp-20261124-review https://github.com/Yi-Chen-Lin-dev/AI-Travel-Planner.git ATP-Integration-1124
cd ATP-Integration-1124
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r backend/requirements-integration.txt
python3 -m unittest discover -s tests -p 'test_optimizer*.py' -v
python3 ai/demo_optimizer.py
```

Start the **correct** V2 backend (not `backend/app/main.py`):

```sh
ENABLE_DEV_OPTIMIZER_SMOKE=1 python3 -m uvicorn backend.api.main:app --reload --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000/docs`. This server and the /dev smoke call do not need PostgreSQL if you do not invoke DB-backed endpoints.

In a second terminal:

```sh
cd ATP-Integration-1124
PYTHONPATH=ai python3 -c 'import json; from demo_optimizer import sample; print(json.dumps(sample))' > /tmp/atp-optimizer-golden.json
curl -X POST http://127.0.0.1:8000/dev/optimizer-smoke -H 'Content-Type: application/json' --data-binary @/tmp/atp-optimizer-golden.json
```

Expected **synthetic** output: `status=partial`; 2 scheduled, 1 unscheduled; 35 travel minutes. This is **not actual travel time**, and does not demonstrate recommendation/DB/front-end completion.

For Fah's frontend in another terminal:

```sh
cd ATP-Integration-1124/frontend
npm ci
npm run dev
```

Visit `http://localhost:3000`. `npm ci` needs network access. As of the code review, the **itinerary result and map are mocked**, not produced by the optimizer.

## Optional PostgreSQL integration — only use an empty LOCAL test database

- Follow `backend/DATABASE_SETUP.md`. Do **not** initialize William's remote database or any production database.
- Example on a local PostgreSQL installation with appropriate privileges:
```sh
createdb atp_mvp_1124
psql -v ON_ERROR_STOP=1 -d atp_mvp_1124 -f backend/database/planner.sql
```
- The schema creates tables, **not** country/region or POI data. It requires valid `region_id` for all POIs. Do not pretend raw William JSON can be imported directly as `--import-json`: the uploader expects an export with `schema_version=3` and regional hierarchy.
- For the specific temporary local demo user expected by Fah's default test UUID, **after verifying this is a disposable local test database**:
```sh
psql -d atp_mvp_1124 -c "INSERT INTO public.users(user_id,display_name) VALUES ('50048c95-b993-4a00-b13e-8e82262d7ec8','Local MVP Tester') ON CONFLICT(user_id) DO NOTHING"
```
- In the shell that starts the backend, set `DB_HOST=localhost`, `DB_PORT=5432` (if that is your local port), `DB_NAME=atp_mvp_1124`, `DB_USER` to your local database user, and `DB_PASSWORD` to your local database password. **Do not commit credentials** and do not paste them in chat.
- Test `GET /db-check`, `POST /trips/`, `POST /preferences/`, `GET /preferences/{trip_id}`. Do not claim the complete API flow is validated until you actually test it.

## Ownership / immediate blockers

| Owner | Must finish | Why |
|---|---|---|
| William | Canonical POIs, opening hours/duration, deterministic ranked POIs + reasons | Raw 95 records and importer are not yet recommendation-ready |
| Allen | Reviewed DB adapter, date write/read, `POST /itineraries/generate`, real travel matrix + persistence | This branch only exposes a synthetic /dev optimizer smoke route |
| Fah | Replace `simulatedDays`, display actual itinerary and map, error/empty handling | Current UI uses mock POIs, static map coordinates and mock weather |
| Yi-Chen | Verify real optimizer input from DB/recommendation, run E2E tests and lead review | Developer-reported unit tests and review-branch tests are not proof of live E2E integration |

## Reviews and safety

**Nobody (including the assistant) has approved or merged PR #36, #37, #39 or #40.** This branch is for inspection and testing, not an automatic substitute for the original PRs. Do not merge it without code review, data contract reconciliation, and real tests. In particular, `docs/DATA_CONTRACT.md` (shared MVP) and `backend/DATA_CONTRACT.md` (V2 draft) have different scopes; team sign-off is still required.


---

## 2026-11-24 follow-up: first complete local **preview** vertical slice (UNVERIFIED)

New code now exists in this review branch:

- \`ai/recommendation_baseline.py\`: explainable deterministic *rule-based* interest scoring (NOT William's final ML recommendation).
- \`ai/poi_adapter.py\`: converts explicit opening periods and visit duration, preserves unknown values as unknown.
- \`ai/travel_matrix.py\`: explicitly approximate straight-line-scaled travel minutes, NOT a routing API.
- \`ai/mvp_pipeline.py\`: recommendations -> estimated matrix -> existing optimizer with reasons and data-provenance warnings.
- \`backend/api/itineraries.py\`: a **local-only, opt-in** \`POST /itineraries/generate\` and \`GET /itineraries/{trip_id}\`; saves a first itinerary, rankings and unscheduled reasons to PostgreSQL. Regeneration of the same trip currently returns HTTP 409 (create another trip for a new test).
- \`frontend/app/result/page.tsx\`: displays actual returned days, ordered stops, times, explanations, an OpenStreetMap view of the selected POI and a link to Google Maps directions. All POIs are plotted on OpenStreetMap tiles with numbered order and dashed schematic connectors; these are **not** real route legs.
- \`scripts/seed_mvp_local.py\`: dry-run by default; can seed qualifying records from William's 95 raw Taipei samples, **only** in a guarded disposable local database.
- \`tests/test_recommendation_baseline.py\` and \`tests/test_mvp_pipeline.py\`: standalone verification of mapping, ranking changes and scheduling input.

### Database setup for the explicit local preview

**Never point these steps at William's remote database or any database containing important data.**

First create a NEW empty LOCAL PostgreSQL test database and apply the schema:

\`\`\`sh
cd ATP-Integration-1124
createdb atp_mvp_1124
psql -v ON_ERROR_STOP=1 -d atp_mvp_1124 -f backend/database/planner.sql
\`\`\`

You must use a PostgreSQL role with suitable local privileges. \`createdb\` will fail if the database already exists; do not re-run the schema against existing tables.

Set the environment variables for **your own local** PostgreSQL instance. \`DB_PASSWORD\` is optional when your local PostgreSQL setup uses passwordless authentication; otherwise set it privately in your terminal. Never commit or share credentials. You can enter it privately in your shell, rather than saving it in a file:

\`\`\`sh
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=atp_mvp_1124
export DB_USER=postgres
read -rs "DB_PASSWORD?Local PostgreSQL password: "
export DB_PASSWORD
echo
\`\`\`

Change \`DB_USER\` if your local PostgreSQL user is not \`postgres\`. If your local DB uses passwordless authentication, leave DB_PASSWORD unset. Do not paste or commit credentials.

Run the seed audit **without writing**, then explicitly seed the local disposable database:

\`\`\`sh
python3 scripts/seed_mvp_local.py
ALLOW_TEST_DB_SEED=1 python3 scripts/seed_mvp_local.py --apply
\`\`\`

The seed only includes real Taipei source records with positive stay duration and at least one parseable opening period. Most of William's sample has incomplete weekday hours; use **Tuesday, 2026-12-01** as the integration demonstration date. The underlying POI source may be outdated; a successful technical preview does not verify current opening hours.

Create the disposable test user matching Fah's default \`NEXT_PUBLIC_TEST_USER_ID\`:

\`\`\`sh
psql -d atp_mvp_1124 -c "INSERT INTO public.users(user_id,display_name) VALUES ('50048c95-b993-4a00-b13e-8e82262d7ec8','Local MVP Tester') ON CONFLICT(user_id) DO NOTHING"
\`\`\`

Start the preview backend **in the same terminal containing your DB_* variables**:

\`\`\`sh
ENABLE_PREVIEW_ITINERARIES=1 ENABLE_ESTIMATED_TRAVEL=1 \
  python3 -m uvicorn backend.api.main:app --reload --host 127.0.0.1 --port 8000
\`\`\`

In a second terminal, start Fah's real frontend and open \`http://localhost:3000\`:

\`\`\`sh
cd ATP-Integration-1124/frontend
npm ci
npm run dev
\`\`\`

Create a **Taipei** trip covering Tuesday 2026-12-01, choose **Culture** or **Nature**, save the preferences, then use the preview page's explicit estimate-consent button. It should call:

\`\`\`text
Frontend POST /trips/ -> POST /preferences/
  -> GET /itineraries/{trip_id} (404 initially)
  -> POST /itineraries/generate (explicit estimate consent)
  -> PostgreSQL POIs -> rule-based Recommendation -> Optimizer
  -> PostgreSQL itinerary/recommendations/unscheduled reasons
  -> Frontend result + selected POI map -> GET saved result after refresh
\`\`\`

**Critical limitations:** This first local demo uses heuristic transport times, has no real routing/transit model, no current hours verification, no authentication, no itinerary edit/regeneration, no production map route overlay, and no fully finished William recommendation model. Do not deploy the preview endpoints publicly. The server explicitly rejects remote/non-test databases for these endpoints. It may still fail until locally executed and debugged; no E2E execution has yet been confirmed.

**Verification checklist before claiming it works:** Python tests pass, frontend typecheck/build pass, DB schema/seed succeed, API POST/GET are correct, ranked POIs change with preferences, dates and stored itinerary survive a refresh, and the map uses POI coordinates. Log any failures with exact error text. No PR approval or merge is allowed without team review.
