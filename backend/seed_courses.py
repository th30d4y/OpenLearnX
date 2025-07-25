import asyncio
from mongo_service import MongoService
import os
from dotenv import load_dotenv

load_dotenv()

async def seed_courses():
    mongo_service = MongoService(os.getenv('MONGODB_URI'))
    
    courses = [
        {
            "_id": "python-course",
            "title": "Python Programming Mastery",
            "subject": "Programming",
            "description": "Learn Python from basics to advanced concepts including web development, data science, and automation.",
            "difficulty": "Beginner to Advanced",
            "modules": [
                {
                    "id": "python-basics",
                    "title": "Python Fundamentals",
                    "lessons": [
                        {"id": "variables", "title": "Variables and Data Types", "type": "text"},
                        {"id": "functions", "title": "Functions and Modules", "type": "code"}
                    ]
                }
            ]
        },
        {
            "_id": "java-course", 
            "title": "Java Development Bootcamp",
            "subject": "Programming",
            "description": "Master Java programming with object-oriented concepts, Spring framework, and enterprise development.",
            "difficulty": "Intermediate",
            "modules": [
                {
                    "id": "java-oop",
                    "title": "Object-Oriented Programming in Java",
                    "lessons": [
                        {"id": "classes", "title": "Classes and Objects", "type": "code"},
                        {"id": "inheritance", "title": "Inheritance and Polymorphism", "type": "text"}
                    ]
                }
            ]
        },
        {
            "_id": "ethical-hacking-course",
            "title": "Ethical Hacking & Cybersecurity",
            "subject": "Cybersecurity", 
            "description": "Learn ethical hacking techniques, penetration testing, and cybersecurity fundamentals to protect systems.",
            "difficulty": "Advanced",
            "modules": [
                {
                    "id": "recon",
                    "title": "Reconnaissance and Information Gathering",
                    "lessons": [
                        {"id": "footprinting", "title": "Footprinting Techniques", "type": "text"},
                        {"id": "scanning", "title": "Network Scanning", "type": "code"}
                    ]
                }
            ]
        }
    ]
    
    try:
        await mongo_service.db.courses.insert_many(courses)
        print("✅ Courses seeded successfully!")
    except Exception as e:
        print(f"❌ Error seeding courses: {e}")

if __name__ == "__main__":
    asyncio.run(seed_courses())
