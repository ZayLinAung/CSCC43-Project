from psycopg2 import pool
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
import os
from fastapi import HTTPException

load_dotenv()

USER = os.getenv("DB_USER")
PASSWORD = os.getenv("DB_PASSWORD")
HOST = os.getenv("DB_HOST")
PORT = os.getenv("DB_PORT")
DBNAME = os.getenv("DB_NAME")

def get_conn():
    return psycopg2.connect(
        host=HOST,
        port=PORT,
        database=DBNAME,
        user=USER,
        password=PASSWORD,
        cursor_factory=RealDictCursor,
        sslmode="require"
    )

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
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        release_connection(conn)
