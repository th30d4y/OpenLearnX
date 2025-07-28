from datetime import datetime, timedelta
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

class DashboardService:
    def __init__(self, db):
        self.db = db
    
    async def calculate_user_rank(self, user_id: str) -> int:
        """Calculate user's global rank based on total points"""
        try:
            user_stats = self.db.user_stats.find_one({"user_id": user_id})
            user_points = user_stats.get("total_points", 0) if user_stats else 0
            
            # Count users with higher points
            higher_ranked = self.db.user_stats.count_documents({
                "total_points": {"$gt": user_points}
            })
            
            return higher_ranked + 1
            
        except Exception as e:
            logger.error(f"Error calculating user rank: {e}")
            return 999
    
    async def update_user_points(self, user_id: str, points_to_add: int, activity_type: str):
        """Add points to user's total and update rank"""
        try:
            # Update user stats
            self.db.user_stats.update_one(
                {"user_id": user_id},
                {
                    "$inc": {"total_points": points_to_add},
                    "$set": {"last_updated": datetime.now()}
                },
                upsert=True
            )
            
            # Recalculate rank
            new_rank = await self.calculate_user_rank(user_id)
            self.db.user_stats.update_one(
                {"user_id": user_id},
                {"$set": {"rank": new_rank}}
            )
            
            logger.info(f"Added {points_to_add} points to user {user_id} for {activity_type}")
            
        except Exception as e:
            logger.error(f"Error updating user points: {e}")
    
    def get_leaderboard(self, limit: int = 100) -> List[Dict]:
        """Get global leaderboard"""
        try:
            return list(self.db.user_stats.find(
                {},
                {"user_id": 1, "total_points": 1, "rank": 1}
            ).sort("total_points", -1).limit(limit))
            
        except Exception as e:
            logger.error(f"Error fetching leaderboard: {e}")
            return []
