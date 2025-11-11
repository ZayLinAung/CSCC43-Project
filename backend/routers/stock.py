from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from database.db import execute_query

router = APIRouter(
    prefix="/stocks",
    tags=["stock"]
)

class StockRequest(BaseModel):
    timestamp: str
    symbol: str


# Endpoint to get stocks by symbol
@router.get("/{symbol}")
def get_stocks_by_symbol(symbol: str, request: Request):
    print(symbol)
    query = ("SELECT * FROM stocks WHERE symbol=%s;")
    results = execute_query(query, (symbol))

    if not results:
        raise HTTPException(status_code=404, detail=f"No stocks found for symbol '{symbol}'")

    return {"result": results}
