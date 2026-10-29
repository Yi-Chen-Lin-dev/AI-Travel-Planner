# Database Setup Guide

## 1. Overview

The AI Travel Planner V2 backend uses PostgreSQL to store users, trips, preferences, points of interest (POIs), regions, recommendations, and itineraries.

This version integrates the updated database schema provided by William.

The database initialization script is located at `backend/database/planner.sql`.

The V2 schema contains 23 tables with 32 foreign key constraints.

The original V1 database schema is preserved in the `feature/fastapi-backend` branch.

## 2. Requirements

- PostgreSQL 17
- pgAdmin 4 or another PostgreSQL SQL client
- A PostgreSQL user with permission to create databases and tables

## 3. Create the Database

1. Open pgAdmin 4.
2. Connect to your PostgreSQL server.
3. Right-click **Databases** and select **Create → Database**.
4. Enter the database name: `ai_travel_planner`.
5. Save the new database.

## 4. Initialize the Tables

1. Select the new `ai_travel_planner` database.
2. Open **Query Tool**.
3. Open `backend/table.sql`.
4. Execute the SQL script.
5. Confirm that the script finishes without errors.

**Important:** The initialization script is intended for a new, empty database. Do not rerun it against an existing database without reviewing the current schema.

## 5. Verify the Database

Run the following SQL:

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

Expected result:

| table_count | foreign_key_count |
|---|---|
| 11 | 17 |

## 6. Backend Connection

The backend reads its database configuration from environment variables.

| Variable | Purpose | Default |
|---|---|---|
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `ai_travel_planner` |
| `DB_USER` | PostgreSQL username | `postgres` |
| `DB_PASSWORD` | PostgreSQL password | Required |

Do not commit passwords, `.env` files, or other secrets to GitHub.

## 7. Start the Backend

From the project root, configure the database password in your local environment and run:

```cmd
python -m uvicorn backend.api.main:app --reload
```

Open the API documentation at `http://127.0.0.1:8000/docs`.

## 8. Current Limitations

- This SQL file initializes a new database; it is not a versioned migration system.
- The script does not import POI datasets or sample user records.
- A successful schema initialization does not automatically verify all API functions.
- Database credentials must be configured separately for each development environment.

## 9. Verification Record

The initialization script was tested on October 25, 2026, using a separate database named `ai_travel_planner_test`.

Results:

- SQL execution: Passed
- Tables created: 11
- Foreign key constraints: 17

The original development database was not modified during this initialization test.
