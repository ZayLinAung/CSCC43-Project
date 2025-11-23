from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from database.db import execute_query
from datetime import date
import requests, os
import pandas as pd

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


@router.get("/get-variance/{symbol}")
def get_variance(symbol:str):
    print(symbol)
    prices = execute_query("""
        SELECT VAR_SAMP(r), AVG(r)
        FROM (SELECT close/LAG(close)OVER(ORDER BY timestamp)-1 r FROM stocks WHERE symbol=%s) t
    """, (symbol,))

    print(prices)
    if not prices:
        raise HTTPException(status_code=404, detail=f"No stocks found for symbol '{symbol}'")
    return {"COV": prices[0]['var_samp'] / prices[0]['avg']}


@router.get("/get-beta/{symbol}")
def get_beta(symbol:str):
    stock_returns = execute_query("""
        SELECT close/LAG(close)OVER(ORDER BY timestamp)-1 r
        FROM stocks
        WHERE symbol=%s
    """, (symbol,))

    market_returns = execute_query("""
        WITH per_stock_returns AS (
            SELECT
                timestamp,
                symbol,
                close / LAG(close) OVER (PARTITION BY symbol ORDER BY timestamp) - 1 AS r
            FROM stocks
        ),
        market AS (
            SELECT
                timestamp,
                AVG(r) AS market_r
            FROM per_stock_returns
            WHERE r IS NOT NULL
            GROUP BY timestamp
        )
        SELECT market_r
        FROM market
        ORDER BY timestamp;
    """)

    if not stock_returns or not market_returns:
        raise HTTPException(status_code=404, detail=f"No stocks found for symbol '{symbol}' or market index")

    n = min(len(stock_returns), len(market_returns))
    print(n)
    stock_returns = [stock_returns[i]['r'] for i in range(1, n)]
    market_returns = [market_returns[i]['market_r'] for i in range(1, n)]
    print(len(stock_returns), len(market_returns))


    cov = sum((stock_returns[i] - sum(stock_returns)/n) * (market_returns[i] - sum(market_returns)/n) for i in range(n - 1)) / (n - 2)
    var_market = sum((market_returns[i] - sum(market_returns)/(n - 1)) ** 2 for i in range(n - 1)) / (n - 2)

    beta = cov / var_market

    return {"beta": beta}


@router.get("/get-cov-corr/{portfolio}")
def get_cov_corr(portfolio):

    rows = execute_query("""
        WITH all_returns AS (
            SELECT
                stocks.timestamp,
                stocks.symbol,
                close / LAG(close) OVER (
                    PARTITION BY stocks.symbol ORDER BY stocks.timestamp
                ) - 1 AS r
            FROM stocks JOIN portfolio_holdings ON stocks.symbol = portfolio_holdings.stock_symbol
            WHERE portfolio_holdings.portfolio_id = %s
        )
        SELECT timestamp, symbol, r
        FROM all_returns
        WHERE r IS NOT NULL
        ORDER BY timestamp, symbol;
    """, (portfolio))

    df = pd.DataFrame(rows)
    print(df)
    pivot = df.pivot(index="timestamp", columns="symbol", values="r").dropna()

    cov_matrix = pivot.cov()
    corr_matrix = pivot.corr()

    return cov_matrix, corr_matrix
