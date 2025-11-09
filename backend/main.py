from routers import auth, stocklist, users, stock, reviews
from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Add session middleware
app.add_middleware(SessionMiddleware, secret_key="your-secret-key")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(stocklist.router)
app.include_router(stock.router)
app.include_router(users.router)
app.include_router(reviews.router)

@app.get("/test")
def read_test():
    return {"message": "Welcome to FastAPI"}
