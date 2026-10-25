\# Database Setup Guide



\## 1. Overview



The AI Travel Planner backend uses PostgreSQL to store users, trips, preferences, points of interest (POIs), and itineraries.



The database initialization script is located at:



`backend/table.sql`



The script creates 11 tables with 17 foreign key constraints.



\## 2. Requirements



\- PostgreSQL 17

\- pgAdmin 4 or another PostgreSQL SQL client

\- A PostgreSQL user with permission to create databases and tables



\## 3. Create the Database



1\. Open pgAdmin 4.

2\. Connect to your PostgreSQL server.

3\. Right-click \*\*Databases\*\* and select \*\*Create → Database\*\*.

4\. Enter the database name: `ai\_travel\_planner`.

5\. Save the new database.



\## 4. Initialize the Tables



1\. Select the new `ai\_travel\_planner` database.

2\. Open \*\*Query Tool\*\*.

3\. Open `backend/table.sql`.

4\. Execute the SQL script.

5\. Confirm that the script finishes without errors.



\*\*Important:\*\* The initialization script is intended for a new, empty database. Do not rerun it against an existing database without reviewing the current schema.



\## 5. Verify the Database



Run the following SQL:



```sql

SELECT

&#x20;   (

&#x20;       SELECT COUNT(\*)

&#x20;       FROM information\_schema.tables

&#x20;       WHERE table\_schema = 'public'

&#x20;         AND table\_type = 'BASE TABLE'

&#x20;   ) AS table\_count,

&#x20;   (

&#x20;       SELECT COUNT(\*)

&#x20;       FROM information\_schema.table\_constraints

&#x20;       WHERE table\_schema = 'public'

&#x20;         AND constraint\_type = 'FOREIGN KEY'

&#x20;   ) AS foreign\_key\_count;

```



Expected result:



| table\_count | foreign\_key\_count |

|---|---|

| 11 | 17 |



\## 6. Backend Connection



The backend reads its database configuration from environment variables.



| Variable | Purpose | Default |

|---|---|---|

| `DB\_HOST` | PostgreSQL host | `localhost` |

| `DB\_PORT` | PostgreSQL port | `5432` |

| `DB\_NAME` | Database name | `ai\_travel\_planner` |

| `DB\_USER` | PostgreSQL username | `postgres` |

| `DB\_PASSWORD` | PostgreSQL password | Required |



Do not commit passwords, `.env` files, or other secrets to GitHub.



\## 7. Start the Backend



From the project root, configure the database password in your local environment and run:



```cmd

python -m uvicorn backend.api.main:app --reload

```



Open the API documentation:



`http://127.0.0.1:8000/docs`



\## 8. Current Limitations



\- This SQL file initializes a new database; it is not a versioned migration system.

\- The script does not import POI datasets or sample user records.

\- A successful schema initialization does not automatically verify all API functions.

\- Database credentials must be configured separately for each development environment.



\## 9. Verification Record



The initialization script was tested on October 25, 2026, using a separate database named `ai\_travel\_planner\_test`.



Results:



\- SQL execution: Passed

\- Tables created: 11

\- Foreign key constraints: 17



The original development database was not modified during this initialization test.

