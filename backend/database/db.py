from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
import os

# Load environment variables from .env
load_dotenv()

# Fetch variables
USER = os.getenv("DB_USER")
PASSWORD = os.getenv("DB_PASSWORD")
HOST = os.getenv("DB_HOST")
PORT = os.getenv("DB_PORT")
DBNAME = os.getenv("DB_NAME")

db_pool = pool.SimpleConnectionPool(
    1, 10,  # min and max connections
    host=HOST,
    database=DBNAME,
    user=USER,
    password=PASSWORD,
    cursor_factory=RealDictCursor
)

def get_connection():
    return db_pool.getconn()

def release_connection(conn):
    db_pool.putconn(conn)

def execute_query(query, params=None, fetch=True):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(query, params or ())
        if fetch:
            return cursor.fetchall()
        else:
            conn.commit()
    finally:
        cursor.close()
        release_connection(conn)

