from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from database.db import get_conn
from routers.auth import get_current_user

router = APIRouter(
    prefix="/users/{username}",
    tags=["users-detail"]
)

class User(BaseModel):
    username: str
    password: str


@router.get("/stocklists")
def get_user_stocklists(username: str, current_user: str = Depends(get_current_user)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        if username == current_user:
            cur.execute("SELECT * FROM stocklists WHERE username = %s;", (username,))
        else:
            cur.execute("SELECT * FROM friends WHERE username = %s AND friendname = %s;", (username, current_user))
            friendship = cur.fetchone()
            if friendship and friendship["status"] == "accepted":
                cur.execute("SELECT * FROM stocklists WHERE username = %s AND (visibility = 'friends' OR visibility = 'public');", (username,))
            else:
                cur.execute("SELECT * FROM stocklists WHERE username = %s AND visibility = 'public';", (username,))
            stocklists = cur.fetchall()
            cur.close()
            return {"stocklists": stocklists}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.post("/send-friend-request")
def add_friend(username: str, current_user: str = Depends(get_current_user)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("INSERT INTO friends (username, friendname, status) VALUES (%s, %s, 'sent');", (current_user, username))
        cur.execute("INSERT INTO friends (username, friendname, status) VALUES (%s, %s, 'pending');", (username, current_user))

        conn.commit()
        return {"message": "Friend request sent"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.delete("/remove-friend")
def remove_friend(username: str, current_user: str = Depends(get_current_user)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM friends WHERE username = %s AND friendname = %s;", (current_user, username))
        conn.commit()
        return {"message": "Friend removed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.patch("/accept-request")
def accept_friend(username: str, current_user: str = Depends(get_current_user)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        # Check if the request exists and is pending
        cur.execute("SELECT * FROM friends WHERE username = %s AND friendname = %s AND status = 'pending';", (current_user, username))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Friend request not found or not pending")

        cur.execute("""UPDATE friends SET status = 'accepted' 
                    WHERE (username = %s AND friendname = %s) OR (username = %s AND friendname = %s);""",
          (username, current_user, current_user, username))
        conn.commit()
        return {"message": "Friend request accepted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.patch("/reject-request")
def reject_friend(username: str, current_user: str = Depends(get_current_user)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        # Check if the request exists and is pending
        cur.execute("SELECT * FROM friends WHERE username = %s AND friendname = %s AND status = 'pending';", (current_user, username))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Friend request not found or not pending")

        cur.execute("""DELETE FROM friends
                    WHERE (username = %s AND friendname = %s)
                     OR (username = %s AND friendname = %s);""",
          (username, current_user, current_user, username))
        conn.commit()
        return {"message": "Friend request rejected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
