# AI Travel Planner

> **Integration review workbench (2026-11-24):** This branch stages Fah's Next.js frontend, Allen's FastAPI V2 + DB schema, Yi-Chen's optimizer, and William's sample POI data. It is **NOT a completed November MVP**, and **no teammate PR has been approved or merged**. See [local runbook and known blockers](docs/INTEGRATION_20261124.md). Use `backend.api.main:app`; the legacy `backend/app/` is not the integrated backend.


AI-powered personalized travel planning and itinerary optimization system.

## Status
Graduate project — repository setup. Application features are not implemented yet.

## Structure
- `frontend/`: web interface and API integration
- `backend/`: APIs, business logic, and database integration
- `ai/`: recommendations, itinerary optimization, and evaluation
- `data/`: small, non-sensitive sample data and data documentation
- `tests/`: automated tests
- `docs/`: architecture, API contracts, and teamwork documentation

## Getting started
```sh
git clone https://github.com/Yi-Chen-Lin-dev/AI-Travel-Planner.git
cd AI-Travel-Planner
```
Runtime installation and application startup instructions will be added when the team selects and implements the initial stack.

Read [the collaboration guide](CONTRIBUTING.md) before your first change.

## Project board
Track work on the [private project board](https://github.com/users/Yi-Chen-Lin-dev/projects/4): Todo → In Progress → Review → Done. Six initial planning and setup issues are included; owners and dates remain for the team to agree.

## Workflow
Issue → feature branch → implementation and tests → commit → push → pull request → teammate review → merge.

Keep `main` usable. Unfinished work can be pushed to a feature branch and shared through a draft pull request.

## Configuration
Use local `.env` files for secrets; never commit real credentials or private data. `.env.example` may contain placeholder variable names only.

## License
No license has been selected. This repository does not grant an open-source license.
