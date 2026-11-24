import os
import psycopg


def get_connection():
    """Connect to the explicitly configured DB; never embed credentials in source.

    DB_PASSWORD is optional for local PostgreSQL setups using passwordless auth.
    Production and remote connections should use a secure credential mechanism.
    """
    config = {
        "host": os.getenv("DB_HOST", "localhost"),
        "port": int(os.getenv("DB_PORT", "5432")),
        "dbname": os.getenv("DB_NAME", "planner"),
        "user": os.getenv("DB_USER", "postgres"),
    }
    password = os.getenv("DB_PASSWORD")
    if password:
        config["password"] = password
    return psycopg.connect(**config)
