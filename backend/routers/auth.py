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
    user = request.session.get("user")["username"]
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


@router.get("/me", response_model=UserOut)
def read_users_me(current_user: dict = Depends(get_current_user)):
    return {"username": current_user}


@router.get("/{user_id}")
def search_users(user_id: str, current_user: dict = Depends(get_current_user)):
    conn = get_conn()
    try:
        cur = conn.cursor()

        cur.execute("(SELECT username FROM users WHERE username LIKE %s) " \
        "EXCEPT (SELECT username FROM users WHERE username = %s);", 
        (f"%{user_id}%", current_user))
        
        results = cur.fetchall()
        cur.close()

        return {"users": [x["username"] for x in results]}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        conn.close()