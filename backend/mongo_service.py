from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ServerSelectionTimeoutError
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

class MongoService:
    def __init__(self, uri: str):
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

    # ... rest of your existing methods remain the same
