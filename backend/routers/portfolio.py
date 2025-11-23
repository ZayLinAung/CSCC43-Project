from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from database.db import execute_query
from datetime import date
from routers.auth import get_current_user
import pandas as pd
from collections import defaultdict


router = APIRouter(
    prefix="/portfolio",
    tags=["portfolio"]
)

class StockRequest(BaseModel):
    timestamp: str
    stock_symbol: str

class Transaction(BaseModel):
    cash: float
    stock_symbol: str
    type: str
    shares: int


#Create Portfolio
@router.post("/create")
def create_portfolio(current_user: str = Depends(get_current_user)):
    # Create new portfolio and RETURN portfolio_id + cash
    query = """
        INSERT INTO portfolio DEFAULT VALUES 
        RETURNING portfolio_id, cash;
    """
    result = execute_query(query)

    if not result:
        raise HTTPException(status_code=500, detail="Cannot create portfolio")

    portfolio_id = result[0]["portfolio_id"]
    cash = result[0]["cash"]

    # Insert into portfolio_owned table
    ownership_query = """
        INSERT INTO portfolio_owned (portfolio_id, username)
        VALUES (%s, %s)
    """
    execute_query(ownership_query, (portfolio_id, current_user), fetch=False)

    # Return response
    return {
        "portfolio_id": portfolio_id,
        "cash": cash
    }

@router.get("/get-variance/{portfolio_id}")
def get_variance_portfolio(portfolio_id: int):

    prices = execute_query("""
        SELECT symbol, VAR_SAMP(r) as var_samp, AVG(r) as avg_r
        FROM (
            SELECT symbol, close/LAG(close) OVER (PARTITION BY symbol ORDER BY timestamp)-1 AS r
            FROM stocks
            WHERE symbol IN (SELECT stock_symbol FROM portfolio_holdings WHERE portfolio_id = %s)
        ) t
        GROUP BY symbol
    """, (portfolio_id,))
    
    result = {p['symbol']: p['var_samp'] / p['avg_r'] for p in prices}
    return result


@router.get("/get-beta/{portfolio_id}")
def get_beta_portfolio(portfolio_id: int):

    stock_returns = execute_query("""
        WITH per_stock_returns AS (
            SELECT
                timestamp,
                symbol,
                close / LAG(close) OVER (PARTITION BY symbol ORDER BY timestamp) - 1 AS r
            FROM stocks
            WHERE symbol IN (SELECT stock_symbol FROM portfolio_holdings WHERE portfolio_id = %s)
        )
        SELECT *
        FROM per_stock_returns
        WHERE r IS NOT NULL
        ORDER BY symbol, timestamp
    """, (portfolio_id,))

    market_returns = execute_query("""
        WITH per_stock_returns AS (
            SELECT
                timestamp,
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
        SELECT *
        FROM market
        ORDER BY timestamp
    """)

    if not stock_returns or not market_returns:
        raise HTTPException(status_code=404, detail=f"No returns found for portfolio '{portfolio_id}' or market")

    market_dict = {r['timestamp']: r['market_r'] for r in market_returns}


    betas = {}
    grouped = defaultdict(list)
    for row in stock_returns:
        if row['timestamp'] in market_dict:
            grouped[row['symbol']].append((row['r'], market_dict[row['timestamp']]))

    for symbol, data in grouped.items():
        n = len(data)
        stock_rs = [r[0] for r in data]
        market_rs = [r[1] for r in data]
        mean_stock = sum(stock_rs) / n
        mean_market = sum(market_rs) / n

        cov = sum((stock_rs[i] - mean_stock) * (market_rs[i] - mean_market) for i in range(n)) / (n - 1)
        var_market = sum((market_rs[i] - mean_market) ** 2 for i in range(n)) / (n - 1)

        betas[symbol] = cov / var_market if var_market != 0 else None

    return betas


@router.get("/get-cov-corr/{portfolio_id}")
def get_cov_corr(portfolio_id: int):
    print('called')
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
    """, (portfolio_id, ))

    df = pd.DataFrame(rows)
    print(df)
    pivot = df.pivot(index="timestamp", columns="symbol", values="r").dropna()

    cov_matrix = pivot.cov()
    corr_matrix = pivot.corr()

    return {"covariance_matrix": cov_matrix.to_dict(), "correlation_matrix": corr_matrix.to_dict()}


# Endpoint to get all owned portfolios
@router.get("")
def get_allOwned_portfolio(current_user: str = Depends(get_current_user)):

    print('called')

    query = """
        SELECT * FROM portfolio NATURAL JOIN portfolio_owned
        WHERE username = %s;
    """
    
    results = execute_query(query, (current_user,))

    if not results:
        raise HTTPException(status_code=404, detail=f"No portfolio found")

    return {"result": results}


# Endpoint to get stocks in a portfolio
@router.get("/{portfolio_id}")
def get_stocks_in_portfolio(portfolio_id: int, current_user: str = Depends(get_current_user)):

    query = """
        SELECT 
        ph.stock_symbol,
        ph.shares,
        s.close AS presentMarketValue
        FROM portfolio p
        JOIN portfolio_owned po 
            ON p.portfolio_id = po.portfolio_id
        JOIN portfolio_holdings ph 
            ON p.portfolio_id = ph.portfolio_id
        JOIN (
            SELECT DISTINCT ON (symbol)
                symbol,
                close,
                timestamp
            FROM stocks
            ORDER BY symbol, timestamp DESC
        ) AS s
            ON s.symbol = ph.stock_symbol
        WHERE p.portfolio_id = %s
        AND po.username = %s;
    """
    
    results = execute_query(query, (portfolio_id, current_user))
    
    cash_query = """
        SELECT cash FROM portfolio WHERE portfolio_id = %s;
    """
    cash_result = execute_query(cash_query, (portfolio_id,))

    cash = cash_result[0]["cash"]

    return {"cash": cash, "results": results}


@router.post("/{portfolio_id}/transcation")
def portfolio_transcation(portfolio_id: int, transaction: Transaction, current_user: str = Depends(get_current_user)):

    queries = []
    params = []

    today = date.today().strftime("%Y-%m-%d")

    # Handle transaction types
    if transaction.type == "cash_deposit":
        print('hi')
        queries.append("UPDATE portfolio SET cash = cash + %s WHERE portfolio_id = %s;")
        params.append((transaction.cash, portfolio_id))

        queries.append("""
            INSERT INTO transaction (amount, type, timestamp, portfolio_id, username) 
            VALUES (%s, %s, %s, %s, %s);
        """)
        params.append((transaction.cash, "cash_deposit", today, portfolio_id, current_user))

    elif transaction.type == 'cash_withdraw':
        # First, check current cash balance
        balance_query = "SELECT cash FROM portfolio WHERE portfolio_id = %s;"
        result = execute_query(balance_query, (portfolio_id,))
        
        if not result:
            raise HTTPException(status_code=404, detail="Portfolio not found")

        current_cash = result[0]['cash']

        if current_cash < transaction.cash:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient funds: current balance is {current_cash}"
            )

        queries.append("""
                UPDATE portfolio SET cash = cash - %s WHERE portfolio_id = %s;
            """)
        params.append((transaction.cash, portfolio_id))

        queries.append("""
            INSERT INTO transaction (amount, type, timestamp, portfolio_id, username)
                VALUES (%s, %s, %s, %s, %s);
            """)
        params.append((-transaction.cash, "cash_withdraw", today, portfolio_id, current_user))


    elif transaction.type == 'stock_buy':
         # First, check current cash balance
        balance_query = "SELECT cash FROM portfolio WHERE portfolio_id = %s;"
        result = execute_query(balance_query, (portfolio_id,))
        
        if not result:
            raise HTTPException(status_code=404, detail="Portfolio not found")

        current_cash = result[0]['cash']

        
        price_query = "SELECT close FROM stocks WHERE symbol = %s ORDER BY timestamp DESC LIMIT 1;"
        price_result = execute_query(price_query, (transaction.stock_symbol,), fetch=True)

        if not price_result or "close" not in price_result[0]:
                raise HTTPException(status_code=404, detail=f"No price found for {transaction.stock_symbol}")

        price = price_result[0]["close"]
        total_cost = transaction.shares * price

        if current_cash < total_cost:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient funds: current balance is {current_cash}"
            )
        
        queries.append("UPDATE portfolio SET cash = cash - %s WHERE portfolio_id = %s;")
        params.append((total_cost, portfolio_id))

        queries.append("""
            INSERT INTO portfolio_holdings (portfolio_id, stock_symbol, shares) VALUES (%s, %s, %s)
            ON CONFLICT (portfolio_id, stock_symbol)
            DO UPDATE SET
                shares = portfolio_holdings.shares + EXCLUDED.shares
        """)
        params.append((portfolio_id, transaction.stock_symbol, transaction.shares))

        queries.append("""
            INSERT INTO transaction (amount, type, timestamp, portfolio_id, username, stock_symbol, shares)
            VALUES (%s, %s, %s, %s, %s, %s, %s);
        """)
        params.append((-total_cost, "stock_buy", today, portfolio_id, current_user,
                       transaction.stock_symbol, transaction.shares))
        
    else:
        price_query = """
            SELECT close 
            FROM stocks 
            WHERE symbol = %s 
            ORDER BY timestamp DESC 
            LIMIT 1;
        """
        price_result = execute_query(price_query, (transaction.stock_symbol,), fetch=True)

        if not price_result or "close" not in price_result[0]:
                raise HTTPException(status_code=404, detail=f"No price found for {transaction.stock_symbol}")

        price = price_result[0]["close"]
        total_cost = transaction.shares * price

        holding_query = """
            SELECT shares FROM portfolio_holdings 
            WHERE portfolio_id = %s AND stock_symbol = %s;
        """
        holding_result = execute_query(holding_query, (portfolio_id, transaction.stock_symbol), fetch=True)

        if not holding_result:
            raise HTTPException(
                status_code=400, 
                detail=f"You don't own any shares of {transaction.stock_symbol} to sell."
            )

        current_shares = holding_result[0]["shares"]

        if current_shares < transaction.shares:
            raise HTTPException(
                status_code=400, 
                detail=f"Not enough shares to sell: you own {current_shares}, tried to sell {transaction.shares}."
            )

        queries.append("UPDATE portfolio SET cash = cash + %s WHERE portfolio_id = %s;")
        params.append((total_cost, portfolio_id))


        if current_shares == transaction.shares:
            queries.append("""
                DELETE FROM portfolio_holdings
                WHERE portfolio_id = %s AND stock_symbol = %s;
            """)
            params.append((portfolio_id, transaction.stock_symbol))

        else:
            queries.append("""
                UPDATE portfolio_holdings
                SET shares = shares - %s
                WHERE portfolio_id = %s AND stock_symbol = %s;
            """)
            params.append((transaction.shares, portfolio_id, transaction.stock_symbol))

      
        queries.append("""
            INSERT INTO transaction (amount, type, timestamp, portfolio_id, username, stock_symbol, shares)
            VALUES (%s, %s, %s, %s, %s, %s, %s);
        """)
        params.append((total_cost, "stock_sell", today, portfolio_id, current_user,
                    transaction.stock_symbol, transaction.shares))

    try:
        for query,para in zip(queries, params):
            execute_query(
                query,
                para,
                fetch=False
            )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database insert error: {str(e)}"
        )

    return {"message": "Transcation successful."}