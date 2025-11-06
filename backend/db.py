import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
import os

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
