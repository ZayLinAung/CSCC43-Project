from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from database.db import execute_query
from datetime import date
from auth import get_current_user

router = APIRouter(
    prefix="/portfolio",
    tags=["stock"]
)

class StockRequest(BaseModel):
    timestamp: str
    stock_symbol: str

class StockAdd(BaseModel):
    timestamp: str
    stock_symbol: str
    open: float
    high: float
    low: float
    close: float
    volume: int

class Transaction(BaseModel):
    cash: float
    stock_symbol: str
    type: str
    timestamp: str
    shares: int


#Create Portfolio
@router.post("/create")
def create_portfolio(current_user: str = Depends(get_current_user)):

    #Create new portfolio in portfolio table
    query = "INSERT INTO portfolio DEFAULT VALUES;"
    result = execute_query(query)

    if not result:
        raise HTTPException(status_code=404, detail=f"Cannot create portfolio")
    
    portfolio_id = result[0]["portfolio_id"]
    
    #Insert into portfolio_owned table
    query = "INSERT INTO portfolio_owned (%s, %s)"
    execute_query(query, (portfolio_id, current_user))

# Endpoint to get all owned portfolios
@router.get("")
def get_allOwned_portfolio(current_user: str = Depends(get_current_user)):

    query = """
        SELECT * FROM portfolio NATURAL JOIN portfolio_owned
        WHERE username = %s;
    """
    
    results = execute_query(query, (current_user))

    if not results:
        raise HTTPException(status_code=404, detail=f"No portfolio found")

    return {"result": results}


@router.post("/{portfolio_id}/transcation")
def portfolio_transcation(transaction: Transaction, current_user: str = Depends(get_current_user)):

    queries = []
    params = []

    today = date.today().strftime("%Y-%m-%d")

    # Handle transaction types
    if transaction.type == "cash_deposit":
        queries.append("UPDATE portfolio SET cash = cash + %s WHERE portfolio_id = %s;")
        params.append((transaction.cash, '{portfolio_id}'))

        queries.append("""
            INSERT INTO transaction (amount, type, date, portfolio_id, username)
            VALUES (%s, %s, %s, %s, %s);
        """)
        params.append((transaction.cash, "cash_deposit", today, '{portfolio_id}', current_user))

    elif transaction.type == 'cash_withdraw':
        queries.append("UPDATE portfolio SET cash = cash - %s WHERE portfolio_id = %s;")
        params.append((transaction.cash, '{portfolio_id}'))

        queries.append("""
            INSERT INTO transaction (amount, type, date, portfolio_id, username)
            VALUES (%s, %s, %s, %s, %s);
        """)
        params.append((-transaction.cash, "cash_withdraw", today, '{portfolio_id}', current_user))

    elif transaction.type == 'stock_buy':

        price_query = "SELECT close FROM stocks WHERE symbol = %s ORDER BY date DESC LIMIT 1;"
        price_result = execute_query(price_query, (transaction.stock_symbol,), fetch=True)

        if not price_result or "close" not in price_result[0]:
                raise HTTPException(status_code=404, detail=f"No price found for {transaction.stock_symbol}")

        price = price_result[0]["close"]
        total_cost = transaction.shares * price
        
        queries.append("UPDATE portfolio SET cash = cash - %s WHERE portfolio_id = %s;")
        params.append((total_cost, '{portfolio_id}'))

        queries.append("""
            INSERT INTO portfolio_holdings VALUES (%s, %s, %s)
            ON CONFLICT (portfolio_id, stock_symbol)
            DO UPDATE SET
                shares = portfolio_holdings.shares + EXCLUDED.shares
        """)
        params.append(('{portfolio_id}', transaction.stock_symbol, transaction.shares))

        queries.append("""
            INSERT INTO transaction 
            VALUES (%s, %s, %s, %s, %s, %s, %s);
        """)
        params.append((-total_cost, "stock_buy", today, '{portfolio_id}', current_user,
                       transaction.stock_symbol, transaction.shares))
    # else:


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



# Endpoint to get stocks in a portfolio
@router.get("/{portfolio_id}")
def get_stocks_in_portfolio(current_user: str = Depends(get_current_user)):

    query = """
        SELECT * FROM portfolio NATURAL JOIN portfolio_owned
        WHERE username = %s;
    """
    
    results = execute_query(query, (current_user))

    if not results:
        raise HTTPException(status_code=404, detail=f"No portfolio found")

    return {"result": results}