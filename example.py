import psycopg2
import dotenv
import os
dotenv.load_dotenv()

conn = psycopg2.connect(
    dbname=os.getenv("DB_NAME"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    host=os.getenv("DB_HOST"),
    port=os.getenv("DB_PORT")
)
cursor = conn.cursor()

cursor.execute("SELECT * FROM stocks")

# cursor.execute("CREATE TABLE User(username VARCHAR PRIMARY KEY, password VARCHAR);", (50000,))
rows = cursor.fetchall()

for row in rows:
    print(row)

conn.commit()
conn.close()
    