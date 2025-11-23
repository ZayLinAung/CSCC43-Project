from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from database.db import execute_query
from datetime import date
import requests, os
import pandas as pd
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from datetime import timedelta
from datetime import date
import json
from redis_client import redis_client

class PredictionResponse(BaseModel):
    symbol: str
    history: list
    prediction: list

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
    query = ("SELECT * FROM stocks WHERE symbol=%s ORDER BY timestamp ASC;")
    results = execute_query(query, (symbol,))

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


@router.get("/{symbol}/predict", response_model=PredictionResponse)
async def predict_stock(symbol: str, days: int = 30):
    """
    Predict future close prices using Holt-Winters Exponential Smoothing.
    """

    cache_key = f"prediction:{symbol}:{days}"

    cached = await redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    query = """
        SELECT timestamp, close
        FROM stocks
        WHERE symbol = %s
        ORDER BY timestamp ASC;
    """
    rows = execute_query(query, (symbol,))

    if not rows or len(rows) < 10:
        raise HTTPException(status_code=400, detail="Not enough data to predict.")

    df = pd.DataFrame(rows, columns=["timestamp", "close"])
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df.set_index("timestamp", inplace=True)

    model = ExponentialSmoothing(
        df["close"],
        trend="add",
        seasonal=None,
        initialization_method="estimated"
    ).fit()

    forecast = model.forecast(days)
    last_date = pd.Timestamp(date.today())
    future_dates = [(last_date + timedelta(days=i+1)).strftime("%Y-%m-%d") for i in range(days)]

    prediction = [
        {"date": str(future_dates[i]), "predicted_close": float(forecast.iloc[i])}
        for i in range(days)
    ]

    history = [
        {"date": str(idx.date()), "close": float(row.close)}
        for idx, row in df.iterrows()
    ]

    result = {
        "symbol": symbol,
        "history": history,
        "prediction": prediction
    }

    await redis_client.set(cache_key, json.dumps(result), ex=6 * 3600)

    return result
