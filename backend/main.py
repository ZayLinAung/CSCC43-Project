from routers import stocks, users, portfolio
from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware

app = FastAPI()

# Add session middleware
app.add_middleware(SessionMiddleware, secret_key="your-secret-key")

app.include_router(users.router)
app.include_router(stocks.router)
app.include_router(portfolio.router)
