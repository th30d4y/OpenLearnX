from datetime import datetime
from typing import List, Optional, Dict
from pydantic import BaseModel

class UserStats(BaseModel):
    user_id: str
    total_points: int = 0
    current_streak: int = 0
    longest_streak: int = 0
    rank: int = 999
    total_courses: int = 0
    completed_courses: int = 0
    total_quizzes: int = 0
    total_coding_challenges: int = 0
    created_at: datetime = datetime.now()
    updated_at: datetime = datetime.now()

class UserProfile(BaseModel):
    user_id: str
    name: str
    bio: str = ""
    profile_pic: str = "/default-avatar.png"
    join_date: datetime = datetime.now()
    badges: List[str] = []
    social_links: Dict[str, str] = {}

class ActivityRecord(BaseModel):
    user_id: str
    activity_type: str  # 'course', 'quiz', 'coding', 'achievement'
    title: str
    score: Optional[int] = None
    points_earned: int = 0
    date: datetime = datetime.now()
    blockchain_hash: Optional[str] = None

class BlockchainTransaction(BaseModel):
    tx_hash: str
    amount: float
    transaction_type: str  # 'reward', 'certificate', 'achievement'
    description: str
    timestamp: datetime = datetime.now()
    confirmed: bool = False
