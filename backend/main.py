from routers import auth, stocklist, users
from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware

app = FastAPI()

# Add session middleware
app.add_middleware(SessionMiddleware, secret_key="your-secret-key")

app.include_router(auth.router)
app.include_router(stocklist.router)
app.include_router(users.router)

@app.get("/test")
def read_test():
    return {"message": "Welcome to FastAPI"}
