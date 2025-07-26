from bson import ObjectId
from datetime import datetime
from pymongo.collection import Collection

class UserModel:
    def __init__(self, collection: Collection):
        self.collection = collection
    
    async def get_by_wallet(self, wallet_address: str):
        return await self.collection.find_one({"wallet_address": wallet_address.lower()})

    async def create_user(self, wallet_address: str):
        now = datetime.utcnow()
        user = {
            "wallet_address": wallet_address.lower(),
            "created_at": now,
            "last_login": now,
            "total_tests": 0,
            "certificates": []
        }
        result = await self.collection.insert_one(user)
        user["_id"] = result.inserted_id
        return user
    
    async def update_last_login(self, wallet_address: str):
        now = datetime.utcnow()
        await self.collection.update_one(
            {"wallet_address": wallet_address.lower()},
            {"$set": {"last_login": now}}
        )
