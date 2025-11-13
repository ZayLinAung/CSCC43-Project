from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from database.db import execute_query
from datetime import date
from routers.auth import get_current_user

router = APIRouter(
    prefix="/portfolio/{username}",
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
        SELECT * FROM portfolio NATURAL JOIN portfolio_holdings
        WHERE portfolio_id = %s;
    """
    
    results = execute_query(query, (current_user, portfolio_id))

    if not results:
        raise HTTPException(status_code=404, detail=f"No portfolio found")

    return {"result": results}


@router.post("/{portfolio_id}/transcation")
def portfolio_transcation(portfolio_id: int, transaction: Transaction, current_user: str = Depends(get_current_user)):

    queries = []
    params = []

    today = date.today().strftime("%Y-%m-%d")

    # Handle transaction types
    if transaction.type == "cash_deposit":
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
        price_query = "SELECT close FROM stocks WHERE symbol = %s ORDER BY timestamp DESC LIMIT 1;"
        price_result = execute_query(price_query, (transaction.stock_symbol,), fetch=True)

        if not price_result or "close" not in price_result[0]:
                raise HTTPException(status_code=404, detail=f"No price found for {transaction.stock_symbol}")

        price = price_result[0]["close"]
        total_cost = transaction.shares * price
        
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