from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from database.db import get_conn
from routers.auth import get_current_user


class Stocklist(BaseModel):
    name: str
    visibility: str


class Stock(BaseModel):
    symbol: str
    quantity: int


router = APIRouter(
    prefix="/stocklists",
    tags=["stocklists"]
)

@router.get("/self")
def get_own_stocklists(current_user: str = Depends(get_current_user)):
    
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM stocklists WHERE username = %s;", (current_user,))
        stocklists = cur.fetchall()
        cur.close()
        return {"stocklists": stocklists}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.post("/create")
def create_stocklist(stocklist: Stocklist, 
                     current_user: str = Depends(get_current_user)):

    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("INSERT INTO stocklists (username, title, visibility) " \
        "VALUES (%s, %s, %s) RETURNING stocklist_id;", (current_user, stocklist.name, stocklist.visibility))
        stocklist_id = cur.fetchone()["stocklist_id"]
        conn.commit()
        cur.close()
        return {"stocklist_id": stocklist_id, "name": stocklist.name}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.delete("/delete/{stocklist_id}")
def delete_stocklist(stocklist_id: int, current_user: str = Depends(get_current_user)):
    
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM stocklists WHERE stocklist_id = %s " \
        "AND username = %s RETURNING *;", (stocklist_id, current_user))
        deleted = cur.fetchone()
        conn.commit()
        cur.close()
        if deleted:
            return {"detail": "Stocklist deleted"}
        else:
            raise HTTPException(status_code=404, detail="Stocklist not found")
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.post("/{stocklist_id}/add-stock")
def add_stock_to_stocklist(stocklist_id: int,
                            stock: Stock, current_user: str = Depends(get_current_user)):
    
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM slitems NATURAL JOIN stocklists WHERE " \
        "stocklist_id = %s AND symbol = %s AND username = %s;", 
        (stocklist_id, stock.symbol, current_user))
        items = cur.fetchone()

        cur.execute("SELECT * FROM stocks WHERE symbol = %s AND" \
        " timestamp < NOW() ORDER BY timestamp DESC;", (stock.symbol,))
        stock_data = cur.fetchone()

        if not stock_data:
            raise HTTPException(status_code=404, detail="Stock data not found")

        if items:
            cur.execute("UPDATE slitems SET shares = " \
            "shares + %s WHERE stocklist_id = %s AND symbol = %s AND timestamp = %s;",
                (stock.quantity, stocklist_id, stock.symbol, stock_data["timestamp"]))
        else:
            cur.execute("INSERT INTO slitems "
            "(stocklist_id, symbol, shares, timestamp) VALUES (%s, %s, %s, %s);",
                     (stocklist_id, stock.symbol, stock.quantity, stock_data["timestamp"]))

        conn.commit()
        cur.close()
        return {"items": items}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.patch("/{stocklist_id}/sell-stock")
def remove_stock_from_stocklist(stocklist_id: int, stock: Stock, 
                                current_user: str = Depends(get_current_user)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM slitems NATURAL JOIN stocklists WHERE" \
        " stocklist_id = %s AND symbol = %s AND username = %s;", 
        (stocklist_id, stock.symbol, current_user))
        items = cur.fetchone()

        if not items:
            raise HTTPException(status_code=404, detail="Stock not found in stocklist")
        
        if items["shares"] > stock.quantity:
            cur.execute("UPDATE slitems SET shares = %s WHERE " \
            "stocklist_id = %s AND symbol = %s;",
            (items["shares"] - stock.quantity, stocklist_id, stock.symbol))

        else:
            cur.execute("DELETE FROM slitems WHERE " \
            "stocklist_id = %s AND symbol = %s;",
                         (stocklist_id, stock.symbol))

        conn.commit()
        cur.close()

        return {"detail": "Stock removed from stocklist"}

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        conn.close()


@router.get("/{stocklist_id}/items")
def get_stocklist_items(stocklist_id: int, current_user: str = Depends(get_current_user)):
    conn = get_conn()
    print(current_user)
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM stocklists WHERE stocklist_id = %s;", (stocklist_id,))
        stocklist_info = cur.fetchone()
        print(stocklist_info)
        if not stocklist_info or stocklist_info["visibility"] == "private" and stocklist_info["username"] != current_user:
            raise HTTPException(status_code=403, detail="You do not have permission to view this stocklist")
        if stocklist_info["visibility"] == "friends":
            cur.execute("SELECT * FROM shared WHERE stocklist_id = %s AND friendname = %s;",
                        (stocklist_id, current_user))
            cur_result = cur.fetchone()
            if not cur_result:
                raise HTTPException(status_code=403, detail="You do not have permission to view this stocklist")

        cur.execute("""SELECT symbol, shares FROM slitems NATURAL JOIN stocklists
                     WHERE stocklist_id = %s;""",
                    (stocklist_id,))

        items = cur.fetchall()
        cur.execute("SELECT * FROM stocklists WHERE stocklist_id = %s;", (stocklist_id,))
        stocklist = cur.fetchone()
        cur.close()
        return {"items": items, "title": stocklist["title"], "username": stocklist["username"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/friends")
def get_friends_stocklists(current_user: str = Depends(get_current_user)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT * FROM stocklists 
            WHERE stocklist_id IN (
                SELECT stocklist_id FROM shared WHERE friendname = %s
            ) AND visibility = 'friends';
        """, (current_user,))
        stocklists = cur.fetchall()
        cur.close()
        return {"stocklists": stocklists}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.post("/{stocklist_id}/share")
def share_stocklist(stocklist_id: int, friend: dict, current_user: str = Depends(get_current_user)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM friends WHERE username = %s AND friendname = %s " \
        "AND status = 'accepted';", (current_user, friend["friendname"]))
        if not cur.fetchone():
            raise HTTPException(status_code=403, detail="You are not friends with this user")

        cur.execute("INSERT INTO shared (stocklist_id, friendname) VALUES (%s, %s);",
                    (stocklist_id, friend["friendname"]))
        cur.execute("UPDATE stocklists SET visibility = 'friends' WHERE stocklist_id = %s;", (stocklist_id,))

        conn.commit()
        return {"message": "Stocklist shared with friends"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/public")
def get_public_stocklists():
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM stocklists WHERE visibility = 'public';")
        stocklists = cur.fetchall()
        cur.close()
        return {"stocklists": stocklists}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/{stocklist_id}/reviews")
def get_stocklist_reviews(stocklist_id: int, current_user: str = Depends(get_current_user)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT * FROM reviews WHERE stocklist_id = %s;
        """, (stocklist_id,))
        reviews = cur.fetchall()
        cur.close()
        return {"reviews": reviews}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

