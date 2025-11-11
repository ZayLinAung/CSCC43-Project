from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database.db import get_conn, release_conn



router = APIRouter(
    prefix="/{username}/stocklists",
    tags=["users"]
)

@router.get("/")
def get_stocklists(username: str):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM stocklists NATURAL JOIN userstocklists WHERE user_name = %s;", (username,))
        stocklists = cur.fetchall()
        cur.close()
        return {"stocklists": stocklists}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        release_conn(conn)
