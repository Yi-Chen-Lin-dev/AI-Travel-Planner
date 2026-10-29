# Database Setup Guide

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

The SQL script creates the database structure but does not automatically populate countries, regions, or POIs with production data.
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

## 6.Expected result for the V2 database:

| table_count | foreign_key_count |
|---|---|
| 23 | 32 |

The expected counts are based on the V2 schema imported into
the local `planner` database.

This verification checks the database structure only.
It does not confirm that all API endpoints work correctly.

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
