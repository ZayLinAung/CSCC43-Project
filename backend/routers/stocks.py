from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from database.db import execute_query
from datetime import date

router = APIRouter(
    prefix="/stocks",
    tags=["stock"]
)

class StockRequest(BaseModel):
    timestamp: str
    symbol: str

class StockAdd(BaseModel):
    timestamp: str
    symbol: str
    open: float
    high: float
    low: float
    close: float
    volume: int


# Endpoint to get stocks by symbol
@router.get("/{symbol}")
def get_stocks_by_symbol(symbol: str, request: Request):
    query = ("SELECT * FROM stocks WHERE symbol=%s;")
    results = execute_query(query, (symbol))

    if not results:
        raise HTTPException(status_code=404, detail=f"No stocks found for symbol '{symbol}'")

    return {"result": results}


# Endpoint to add stocks 
@router.post("")
def add_stock(stock: StockAdd):
    query = """
        INSERT INTO stocks VALUES (%s, %s, %s, %s, %s, %s, %s)
    """

    try:
        execute_query(
            query,
            (
                stock.timestamp,
                stock.open,
                stock.high,
                stock.low,
                stock.close,
                stock.volume,
                stock.symbol,
            ),
            fetch=False
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database insert error: {str(e)}"
        )

    return {"message": "Stock added successfully"}
