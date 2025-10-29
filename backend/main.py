from backend.routers.users import users
from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware
from routers import items  # import routers

app = FastAPI()

# Add session middleware
app.add_middleware(SessionMiddleware, secret_key="your-secret-key")

app.include_router(items.router)
app.include_router(users.router)

@app.get("/test")
def read_test():
    return {"message": "Welcome to FastAPI"}
