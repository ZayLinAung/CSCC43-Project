import sys
from db import get_connection, release_connection

def run_sql_file(file_path):
    """Run all SQL statements from a .sql file using a connection from the pool."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        with open(file_path, 'r') as f:
            sql = f.read()
            cursor.execute(sql)  # Execute all statements at once
        conn.commit()
        print(f"Successfully ran {file_path}")
    except Exception as e:
        conn.rollback()
        print(f"Error running {file_path}: {e}")
    finally:
        cursor.close()
        release_connection(conn)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python loadata.py <path_to_sql_file>")
        sys.exit(1)

    sql_file = sys.argv[1]
    run_sql_file(sql_file)
