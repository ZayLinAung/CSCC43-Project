from fastapi import APIRouter
from . import users, stocklist, reviews  # import all submodules

router = APIRouter()
router.include_router(users.router)
router.include_router(stocklist.router)
router.include_router(reviews.router)
# router.include_router(settings.router)  # add more as needed
