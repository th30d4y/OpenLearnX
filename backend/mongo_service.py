from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ServerSelectionTimeoutError
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any


class MongoService:
    def __init__(self, uri: str):
        self.uri = uri  # Store URI for sync operations
        try:
            # Simple connection without custom SSL context
            self.client = AsyncIOMotorClient(
                uri,
                serverSelectionTimeoutMS=30000,
                connectTimeoutMS=30000,
                socketTimeoutMS=30000
            )
            print("MongoDB client initialized successfully")
        except Exception as e:
            print(f"MongoDB connection failed: {e}")
            # Fallback to basic connection
            self.client = AsyncIOMotorClient(uri)
        
        self.db = self.client.openlearnx
        # Collections
        self.users = self.db.users
        self.questions = self.db.questions
        self.test_sessions = self.db.test_sessions
        self.certificates = self.db.certificates
        self.peer_reviews = self.db.peer_reviews

    async def init_db(self):
        """Initialize database with indexes and sample data"""
        try:
            # Test connection first
            await self.client.admin.command('ping')
            print("MongoDB connection successful!")
            
            # Create indexes
            await self.users.create_index("wallet_address", unique=True)
            await self.users.create_index("email", unique=True, sparse=True)
            await self.questions.create_index("subject")
            await self.questions.create_index("difficulty")
            await self.test_sessions.create_index("user_id")
            await self.test_sessions.create_index("created_at")
            await self.certificates.create_index("user_id")
            await self.certificates.create_index("token_id", unique=True)
            
            # Insert sample questions if none exist
            if await self.questions.count_documents({}) == 0:
                await self.insert_sample_questions()
                print("Sample questions inserted successfully")
                
        except ServerSelectionTimeoutError as e:
            print(f"Failed to connect to MongoDB: {e}")
            print("Continuing without database initialization...")
        except Exception as e:
            print(f"Database initialization error: {e}")
            print("Continuing without database initialization...")

    async def get_user_by_wallet(self, wallet_address: str):
        """Get user by wallet address"""
        return await self.users.find_one({"wallet_address": wallet_address.lower()})

    async def create_user(self, wallet_address: str):
        """Create a new user"""
        now = datetime.utcnow()
        user = {
            "wallet_address": wallet_address.lower(),
            "created_at": now,
            "last_login": now,
            "total_tests": 0,
            "certificates": []
        }
        result = await self.users.insert_one(user)
        user["_id"] = result.inserted_id
        return user

    async def update_user_login(self, wallet_address: str):
        """Update user's last login time"""
        await self.users.update_one(
            {"wallet_address": wallet_address.lower()},
            {"$set": {"last_login": datetime.utcnow()}}
        )

    async def insert_sample_questions(self):
        """Insert sample questions - implement based on your needs"""
        # You'll need to implement this method based on your question structure
        sample_questions = [
            {
                "subject": "Python",
                "difficulty": "beginner",
                "question": "What is a variable in Python?",
                "options": ["A storage location", "A function", "A loop", "A condition"],
                "correct_answer": 0,
                "created_at": datetime.utcnow()
            },
            # Add more sample questions as needed
        ]
        await self.questions.insert_many(sample_questions)

    async def close_connection(self):
        """Close the database connection"""
        if self.client:
            self.client.close()
            print("MongoDB connection closed")

    def create_user_sync(self, wallet_address: str):
        """Synchronous user creation using pymongo instead of motor"""
        import pymongo
        
        # Create a synchronous connection for this operation only
        client = pymongo.MongoClient(self.uri)
        db = client.openlearnx
        users = db.users
        
        try:
            # Check if user exists
            user = users.find_one({"wallet_address": wallet_address.lower()})
            
            if not user:
                # Create new user
                new_user = {
                    "wallet_address": wallet_address.lower(),
                    "created_at": datetime.utcnow(),
                    "last_login": datetime.utcnow(),
                    "total_tests": 0,
                    "certificates": []
                }
                result = users.insert_one(new_user)
                new_user["_id"] = result.inserted_id
                return new_user
            else:
                # Update last login
                users.update_one(
                    {"wallet_address": wallet_address.lower()},
                    {"$set": {"last_login": datetime.utcnow()}}
                )
                return user
        finally:
            # Always close the connection
            client.close()