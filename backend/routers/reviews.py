from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from database.db import get_conn
from routers.auth import get_current_user

router = APIRouter(
    prefix="/{stocklist_id}/reviews",
    tags=["users-reviews"]
)


class ReviewPayload(BaseModel):
    content: str


@router.get("/")
def get_stocklist_reviews(stocklist_id: int, current_user: str = Depends(get_current_user)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        # fetch stocklist to check visibility/ownership
        cur.execute("SELECT * FROM stocklists WHERE stocklist_id = %s;", (stocklist_id,))
        stocklist = cur.fetchone()

        if stocklist and (stocklist["username"] == current_user or stocklist["visibility"] == "public"):
            cur.execute("SELECT * FROM reviews WHERE stocklist = %s;", (stocklist_id,))
            reviews = cur.fetchall()
        else:
            cur.execute("SELECT * FROM reviews WHERE stocklist = %s AND username = %s;",
                        (stocklist_id, current_user))
            reviews = cur.fetchall()
            if not reviews:
                raise HTTPException(status_code=403, detail="You do not have access to view reviews for this stocklist.")

        cur.close()
        return {"reviews": reviews}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/self")
def get_stocklist_reviews(stocklist_id: int, current_user: str = Depends(get_current_user)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        # fetch stocklist to check visibility/ownership
        cur.execute("SELECT * FROM reviews WHERE stocklist = %s AND username = %s;",
                        (stocklist_id, current_user))
        review = cur.fetchone()
        if not review:
            raise HTTPException(status_code=403, detail="You do not have access to view reviews for this stocklist.")

        cur.close()
        return {"review": review}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()



@router.post("/add")
def add_stocklist_review(stocklist_id: int, review: ReviewPayload, current_user: str = Depends(get_current_user)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        # check existing review
        cur.execute("SELECT * FROM reviews WHERE stocklist = %s AND username = %s;", (stocklist_id, current_user))
        existing = cur.fetchone()
        if existing:
            raise HTTPException(status_code=400, detail="You have already reviewed this stocklist.")

        # check permissions: owner or shared
        cur.execute("SELECT * FROM stocklists WHERE stocklist_id = %s;", (stocklist_id,))

        permission = cur.fetchone()
        if permission and permission["visibility"] == "public" or permission["username"] == current_user:
            cur.execute("INSERT INTO reviews (stocklist, username, content) VALUES (%s, %s, %s) RETURNING review_id;",
                    (stocklist_id, current_user, review.content))
        else:
            cur.execute("SELECT * FROM stocklists JOIN shared ON stocklists.stocklist_id = shared.stocklist_id WHERE stocklists.stocklist_id = %s;",
                        (stocklist_id,))
            stocklist = cur.fetchone()
            if not stocklist or (stocklist["username"] != current_user and stocklist.get("friendname") != current_user):
                raise HTTPException(status_code=403, detail="You do not have permission to review this stocklist.")
            cur.execute("INSERT INTO reviews (stocklist, username, content) VALUES (%s, %s, %s) RETURNING review_id;",
                    (stocklist_id, current_user, review.content))
    
        new_row = cur.fetchone()
        conn.commit()
        cur.close()
        return {"message": "Review added successfully.", "review_id": new_row.get("review_id") if new_row else None}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.delete("/{review_id}/delete")
def delete_stocklist_review(review_id: int, current_user: str = Depends(get_current_user)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM reviews WHERE review_id = %s;", (review_id,))
        review = cur.fetchone()
        if not review:
            raise HTTPException(status_code=404, detail="Review not found.")

        # resolve stocklist id (support different column names if present)
        stocklist_id = review.get("stocklist")
        cur.execute("SELECT * FROM stocklists WHERE stocklist_id = %s;", (stocklist_id,))
        stocklist = cur.fetchone()

        if stocklist and (stocklist["username"] != current_user and review["username"] != current_user):
            raise HTTPException(status_code=403, detail="You do not have permission to delete this review.")

        cur.execute("DELETE FROM reviews WHERE review_id = %s;", (review_id,))
        conn.commit()
        cur.close()
        return {"message": "Review deleted successfully."}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.patch("/{review_id}/edit")
def edit_stocklist_review(review_id: int, updated_review: ReviewPayload, current_user: str = Depends(get_current_user)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM reviews WHERE review_id = %s;", (review_id,))
        review = cur.fetchone()
        if not review:
            raise HTTPException(status_code=404, detail="Review not found.")

        if review["username"] != current_user:
            raise HTTPException(status_code=403, detail="You do not have permission to edit this review.")

        cur.execute("UPDATE reviews SET content = %s WHERE review_id = %s;", (updated_review.content, review_id))
        conn.commit()
        cur.close()
        return {"message": "Review updated successfully."}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()