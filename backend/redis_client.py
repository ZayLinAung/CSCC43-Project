import redis.asyncio as redis
import os


REDIS_HOST = os.getenv("CACHE_HOST")
REDIS_PORT = int(os.getenv("CACHE_PORT"))

redis_client = redis.Redis(
    host=REDIS_HOST,
    port=REDIS_PORT,
    decode_responses=True 
)
