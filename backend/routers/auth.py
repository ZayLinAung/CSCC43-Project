from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from database.db import get_conn

router = APIRouter(
    prefix="/users",
    tags=["users"]
)

class User(BaseModel):
    username: str
    password: str

class UserOut(BaseModel):
    username: str

@router.post("/signup", response_model=UserOut)
def sign_up(user: User, request: Request):
    conn = get_conn()
    try:
        cur = conn.cursor()

        cur.execute("SELECT username FROM users WHERE username=%s;", (user.username,))
        existing_user = cur.fetchone()

        if existing_user:
            raise HTTPException(status_code=400, detail=f"User {user.username} already exists")

        cur.execute("INSERT into users (username, password) VALUES (%s, %s) RETURNING username;", (user.username, user.password))
        created_username = cur.fetchone()["username"]
        conn.commit()
        cur.close()

        if not created_username:
            raise HTTPException(status_code=404, detail="User could not be created")

        request.session["user"] = {"username": created_username}
        return {"username": created_username}

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        conn.close()


@router.post("/login")
def login(user: User, request: Request):
    conn = get_conn()
    print("Login attempt for user:", user.username)
    try:
        cur = conn.cursor()

        cur.execute("SELECT username FROM users WHERE username=%s AND password=%s;", (user.username, user.password))
        db_user = cur.fetchone()

        if not db_user:
            raise HTTPException(status_code=400, detail="Invalid username or password")
        cur.close()
        
        request.session["user"] = {"username": db_user["username"]}
        return {"message": "Login successful", "user": {"username": db_user["username"]}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


def get_current_user(request: Request):
    user_session = request.session.get("user")
    if not user_session or "username" not in user_session:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user_session["username"]


@router.get("/me", response_model=UserOut)
def read_users_me(current_user: str = Depends(get_current_user)):
    return {"username": current_user}


@router.get("/friends")
def get_friends_list(current_user: str = Depends(get_current_user), page: int = 1, limit: int = 10):
    print("Here")
    conn = get_conn()
    try:
        cur = conn.cursor()
        offset = (page - 1) * limit

        cur.execute("SELECT COUNT(*) FROM friends WHERE username = %s AND status = 'accepted';", (current_user,))
        total_count_result = cur.fetchone()
        total_count = total_count_result['count'] if total_count_result else 0


        cur.execute("SELECT friendname FROM friends WHERE username = %s AND status = 'accepted' ORDER BY friendname LIMIT %s OFFSET %s;", (current_user, limit, offset))

        results = cur.fetchall()
        cur.close()

        return {"users": [x["friendname"] for x in results], "total": total_count}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        conn.close()

@router.get("/friends/pending", tags=["friends"])
def get_pending_requests(current_user: str = Depends(get_current_user), page: int = 1, limit: int = 10):
    conn = get_conn()
    try:
        cur = conn.cursor()
        offset = (page - 1) * limit

        cur.execute("SELECT COUNT(*) FROM friends WHERE username = %s AND status = 'pending';", (current_user,))
        total_count = cur.fetchone()['count']

        cur.execute("SELECT friendname FROM friends WHERE username = %s AND status = 'pending' ORDER BY friendname LIMIT %s OFFSET %s;", (current_user, limit, offset))
        
        results = cur.fetchall()
        cur.close()

        return {"users": [x["friendname"] for x in results], "total": total_count}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        conn.close()

@router.get("/friends/sent", tags=["friends"])
def get_sent_requests(current_user: str = Depends(get_current_user), page: int = 1, limit: int = 10):
    conn = get_conn()
    try:
        cur = conn.cursor()
        offset = (page - 1) * limit

        cur.execute("SELECT COUNT(*) FROM friends WHERE username = %s AND status = 'sent';", (current_user,))
        total_count = cur.fetchone()['count']

        cur.execute("SELECT friendname FROM friends WHERE username = %s AND status = 'sent' ORDER BY friendname LIMIT %s OFFSET %s;", (current_user, limit, offset))
        
        results = cur.fetchall()
        cur.close()

        return {"users": [x["friendname"] for x in results], "total": total_count}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        conn.close()


@router.get("/all")
def search_users_all(current_user: str = Depends(get_current_user), page: int = 1, limit: int = 50):
    conn = get_conn()
    try:
        cur = conn.cursor()
        offset = (page - 1) * limit

        # Query for total count
        cur.execute("(SELECT COUNT(*) FROM users WHERE username <> %s " \
                    "AND username NOT IN (SELECT friendname FROM friends WHERE username = %s))", 
                    (current_user, current_user))
        total_count = cur.fetchone()['count']

        # Query for paginated results
        cur.execute("(SELECT username FROM users WHERE username <> %s " \
                    "AND username NOT IN (SELECT friendname FROM friends WHERE username = %s)) " \
                    "ORDER BY username LIMIT %s OFFSET %s", 
                    (current_user, current_user, limit, offset))

        results = cur.fetchall()
        cur.close()

        return {"users": [x["username"] for x in results], "total": total_count}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        conn.close()


@router.get("/{user_id}")
def search_users_by_id(user_id: str, current_user: str = Depends(get_current_user), page: int = 1, limit: int = 50):
    conn = get_conn()
    try:
        cur = conn.cursor()
        offset = (page - 1) * limit
        search_pattern = f"%{user_id}%"

        # Query for total count
        cur.execute("(SELECT COUNT(*) FROM users WHERE username LIKE %s " \
                    "AND username <> %s AND username NOT IN (SELECT friendname FROM friends WHERE username = %s))", 
                    (search_pattern, current_user, current_user))
        total_count = cur.fetchone()['count']

        # Query for paginated results
        cur.execute("(SELECT username FROM users WHERE username LIKE %s " \
                    "AND username <> %s AND username NOT IN (SELECT friendname FROM friends WHERE username = %s)) " \
                    "ORDER BY username LIMIT %s OFFSET %s", 
                    (search_pattern, current_user, current_user, limit, offset))
        
        results = cur.fetchall()
        cur.close()

        return {"users": [x["username"] for x in results], "total": total_count}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        conn.close()