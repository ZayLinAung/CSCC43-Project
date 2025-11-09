from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from database.db import execute_query
from routers.auth import get_current_user

router = APIRouter(
    prefix="/{stocklist_id}/reviews",
    tags=["users-reviews"]
)

@router.get("/")
def get_stocklist_reviews(stocklist_id: int, current_user: str = Depends(get_current_user)):

    stocklist = execute_query("""
        SELECT * FROM stocklists WHERE stocklist_id = %s;
    """, (stocklist_id,))


    if stocklist["username"] == current_user or stocklist["visibility"] == "public":
        reviews = execute_query(""" SELECT * FROM reviews WHERE stocklist_id = %s;""", (stocklist_id,))
    else:
        reviews = execute_query(""" SELECT * FROM reviews WHERE stocklist_id = %s AND 
                               username = %s;""", (stocklist_id, current_user))
        if len(reviews) == 0:
            raise HTTPException(status_code=403, detail="You do not have access to view reviews for this stocklist.")

    return {"reviews": reviews}

@router.post("/add")
def add_stocklist_review(stocklist_id: int, review: dict, current_user: str = Depends(get_current_user)):

    existing_review = execute_query("""
        SELECT * FROM reviews WHERE stocklist_id = %s AND username = %s;
    """, (stocklist_id, current_user))

    if existing_review:
        raise HTTPException(status_code=400, detail="You have already reviewed this stocklist.")
    
    stocklist = execute_query("""
        SELECT * FROM stocklists LEFT JOIN shared ON 
        stocklists.stocklist_id = shared.stocklist_id WHERE stocklist_id = %s;
    """, (stocklist_id,))

    if stocklist["username"] != current_user and (stocklist["friendname"] != current_user):
        raise HTTPException(status_code=403, detail="You do not have permission to review this stocklist.")


    execute_query("""
        INSERT INTO reviews (stocklist_id, username, content) 
        VALUES (%s, %s, %s);
    """, (stocklist_id, current_user, review.content))

    return {"message": "Review added successfully."}




@router.delete("/{review_id}/delete")
def delete_stocklist_review(review_id: int, current_user: str = Depends(get_current_user)):

    review = execute_query("""
        SELECT * FROM reviews WHERE review_id = %s;
    """, (review_id,))

    if not review:
        raise HTTPException(status_code=404, detail="Review not found.")

    stocklist = execute_query("""
        SELECT * FROM stocklists WHERE stocklist_id = %s;
    """, (review["stocklist_id"],))

    if stocklist["username"] != current_user and (review["username"] != current_user):
        raise HTTPException(status_code=403, detail="You do not have permission to delete this review.")

    execute_query("""
        DELETE FROM reviews WHERE review_id = %s;
    """, (review_id,))

    return {"message": "Review deleted successfully."}

@router.patch("/{review_id}/edit")
def edit_stocklist_review(review_id: int, updated_review: dict, current_user: str = Depends(get_current_user)):

    review = execute_query("""
        SELECT * FROM reviews WHERE review_id = %s;
    """, (review_id,))

    if not review:
        raise HTTPException(status_code=404, detail="Review not found.")

    if review["username"] != current_user:
        raise HTTPException(status_code=403, detail="You do not have permission to edit this review.")

    execute_query("""
        UPDATE reviews SET content = %s WHERE review_id = %s;
    """, (updated_review.content, review_id))

    return {"message": "Review updated successfully."}