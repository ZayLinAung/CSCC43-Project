from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from database.db import execute_query
from datetime import date
import requests, os

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


@router.get("")
def list_allStocks_bySymbol():
    query = ("SELECT symbol FROM stocks GROUP BY symbol ORDER BY symbol")
    results = execute_query(query)

    if not results:
        raise HTTPException(status_code=404, detail=f"No stocks found")

    return {"result": results}

# Endpoint to get stocks by symbol
@router.get("/{symbol}")
def get_stocks_by_symbol(symbol: str, request: Request):
    query = ("SELECT * FROM stocks WHERE symbol=%s;")
    results = execute_query(query, (symbol))

    if not results:
        raise HTTPException(status_code=404, detail=f"No stocks found for symbol '{symbol}'")

    return {"result": results}


# Endpoint to update daily stocks information (manual)
@router.post("/update")
def add_stock(stock: StockAdd):
    query = """
        INSERT INTO stocks VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (timestamp, symbol)
        DO UPDATE SET
            open = EXCLUDED.open, close = EXCLUDED.close, high = EXCLUDED.high, low = EXCLUDED.low, volume = EXCLUDED.volume
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

    return {"message": "Stock data updated successfully"}


# Endpoint to update daily stocks information (manual)
@router.post("/update/{symbol}")
def add_stock(symbol: str):

    api_key = os.getenv("AlphaVantageAPI_KEY")

    url = (
        f'https://www.alphavantage.co/query?'
        f'function=TIME_SERIES_DAILY&'
        f'symbol={symbol}&'
        f'apikey={api_key}'
    )
    r = requests.get(url)
    data = r.json()

    dailyData = data["Time Series (Daily)"]

    for date in dailyData:
        query = """
            INSERT INTO stocks VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (timestamp, symbol)
            DO UPDATE SET
                open = EXCLUDED.open, close = EXCLUDED.close, high = EXCLUDED.high, low = EXCLUDED.low, volume = EXCLUDED.volume
        """

        try:
            execute_query(
                query,
                (
                    date,
                    dailyData[date]["1. open"],
                    dailyData[date]["2. high"],
                    dailyData[date]["3. low"],
                    dailyData[date]["4. close"],
                    dailyData[date]["5. volume"],
                    symbol,
                ),
                fetch=False
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Database insert error: {str(e)}"
            )

    return {"message": "Stock data updated successfully"}