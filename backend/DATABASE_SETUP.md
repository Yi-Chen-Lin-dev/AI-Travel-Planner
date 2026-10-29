# Database Setup Guide — V2

## 1. Overview

The AI Travel Planner V2 backend uses PostgreSQL to store users, trips, preferences, points of interest (POIs), regions, recommendations, and itineraries.

This version integrates the updated database schema provided by William.

The database initialization script is located at `backend/database/planner.sql`.

The V2 schema contains 23 tables with 32 foreign key constraints.

The original V1 database schema is preserved in the `feature/fastapi-backend` branch.

## 2. Requirements

- PostgreSQL 17 or 18
- pgAdmin 4 or another PostgreSQL SQL client
- A PostgreSQL user with permission to create databases and tables
- The V2 database initialization script: `backend/database/planner.sql`
- Python and the required backend dependencies

The V2 schema has been imported into a local PostgreSQL 17 environment.

William's development environment uses PostgreSQL 18.

## 3. Create the Database

1. Open pgAdmin 4.
2. Connect to your PostgreSQL server.
3. Right-click **Databases** and select **Create > Database**.
4. Enter the database name: `planner`.
5. Save the new database.

The V1 database (`ai_travel_planner`) should be kept separately for rollback and compatibility testing.

## 4. Initialize the Tables

1. Select the new `planner` database.
2. Open **Query Tool**.
3. Open `backend/database/planner.sql`.
4. Execute the SQL script.
5. Confirm that the script finishes without errors.

**Important:** Run the initialization script against a new, empty database. Do not execute it against the existing V1 database.

The SQL script initializes the database structure but does not automatically populate countries, regions, or POIs with production data.

## 5. Verify the Database

Run the following SQL in the `planner` database:

```sql
SELECT
    (
        SELECT COUNT(*)
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
    ) AS table_count,
    (
        SELECT COUNT(*)
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND constraint_type = 'FOREIGN KEY'
    ) AS foreign_key_count;
```

Expected result for the V2 database:

| table_count | foreign_key_count |
|---|---|
| 23 | 32 |

The expected counts are based on the V2 schema imported into the local `planner` database.

This verification checks the database structure only. It does not confirm that all API endpoints work correctly.

## 6. Backend Connection

The backend reads its database configuration from environment variables.

| Variable | Purpose | V2 Local Configuration |
|---|---|---|
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `planner` |
| `DB_USER` | PostgreSQL username | `postgres` |
| `DB_PASSWORD` | PostgreSQL password | Required |

**Important:** The V2 backend must connect to the `planner` database instead of the V1 `ai_travel_planner` database.

The values above describe the local development environment. Remote database connection settings may differ.

Do not commit passwords, `.env` files, or other secrets to GitHub.

## 7. Start the Backend

From the project root, configure the database environment variables before starting the backend.

For Windows PowerShell:

```powershell
$env:DB_HOST = "localhost"
$env:DB_PORT = "5432"
$env:DB_NAME = "planner"
$env:DB_USER = "postgres"
$env:DB_PASSWORD = "<your-local-database-password>"

python -m uvicorn backend.api.main:app --reload
```

Replace `<your-local-database-password>` with your actual local PostgreSQL password.

Open the API documentation at:

`http://127.0.0.1:8000/docs`

## 8. API Verification

The following API endpoints have been tested against the local V2 `planner` database:

| Endpoint | Purpose | Verification |
|---|---|---|
| `POST /trips/` | Create a trip | Passed |
| `GET /trips/` | Retrieve trips | Passed |
| `POST /preferences/` | Save trip preferences | Passed |
| `GET /pois/` | Retrieve public POIs | Passed |
| `GET /regions/` | Search and filter regions | Passed |
| `GET /countries/` | Search countries | Passed |

The Countries and Regions APIs were tested using temporary records.

The temporary test records were removed after verification.

**Note:** These tests confirm basic API and database operations. They do not represent complete integration, security, or production-readiness testing.

## 9. Current Limitations

- The SQL initialization script is not a versioned database migration system.
- The database does not yet contain the complete production country, region, or POI datasets.
- The API endpoints have not undergone comprehensive integration testing.
- Authentication and authorization must be verified before production deployment.
- Database credentials must be configured separately for each development environment.
- The V1 and V2 database schemas are not interchangeable.
- Switching Git branches does not automatically switch the connected PostgreSQL database.
- The backend is currently tested using a local PostgreSQL environment. Integration with William's remote database remains a separate task.

## 10. Verification Record

### V2 Database Verification

Database: `planner`

Environment: Local PostgreSQL 17

Results:

- V2 schema import: Passed
- Tables created: 23
- Foreign key constraints: 32
- Countries API basic search: Passed
- Regions API basic search: Passed
- Temporary test data cleanup: Completed

The V2 database was created separately from the original V1 development database.

### V1 Database Preservation

The original V1 database schema remains available in the `feature/fastapi-backend` branch.

V1 database:

`ai_travel_planner`

V1 schema:

- Tables: 11
- Foreign key constraints: 17

The V1 database was not replaced by the V2 schema.

## 11. Version Management

The project maintains separate Git branches for different development purposes.

| Branch | Purpose |
|---|---|
| `main` | Team-approved stable code |
| `feature/fastapi-backend` | V1 FastAPI backend |
| `feature/fastapi-backend-v2` | V2 FastAPI backend |
| `feature/line-bot-setup` | Independent LINE Bot development |

The V2 backend uses William's updated database schema.

The LINE Bot implementation is maintained separately until the team decides whether to integrate it.

Before merging V2 into `main`, review the Pull Request changes, database compatibility, and API dependencies.

## 12. Future Development

Planned development tasks include:

1. Importing production country, region, and POI datasets.
2. Expanding POI search and filtering capabilities.
3. Implementing AI-based POI recommendations.
4. Integrating route optimization and itinerary generation.
5. Supporting itinerary versioning and rollback.
6. Integrating the backend with a lightweight web interface.
7. Evaluating LINE Bot integration.
8. Testing the system against the shared development database.
