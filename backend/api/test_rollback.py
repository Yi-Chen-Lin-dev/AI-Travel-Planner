from .database import get_connection


def test_rollback():
    trip_id = "4ba34888-d60a-4075-b965-e878782046b9"

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                # Temporarily update the trip preference
                cur.execute(
                    """
                    UPDATE public.trip_preferences
                    SET budget_level = %s
                    WHERE trip_id = %s
                    """,
                    ("low", trip_id)
                )

                if cur.rowcount != 1:
                    raise RuntimeError("Test trip preference not found")

                print("Temporary update completed.")

                # Simulate an error before transaction commit
                raise RuntimeError("Simulated database operation failure")

    except RuntimeError as error:
        print(f"Expected error: {error}")

    # Verify that the original value was restored
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT budget_level
                FROM public.trip_preferences
                WHERE trip_id = %s
                """,
                (trip_id,)
            )

            result = cur.fetchone()

    if result is None:
        raise RuntimeError("Test preference not found")

    print(f"Budget after rollback: {result[0]}")

    assert result[0] == "high", "Rollback verification failed"
    print("ROLLBACK TEST PASSED")


if __name__ == "__main__":
    test_rollback()