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
            "mentor": "5t4l1n",
            "video_url": "https://youtu.be/SsH8GJlqUIg?si=cK7KW_sM0uf95lEp",
            "modules": [
                {
                    "id": "python-basics",
                    "title": "Python Fundamentals", 
                    "lessons": [
                        {"id": "variables", "title": "Variables and Data Types", "type": "video", "video_url": "https://youtu.be/SsH8GJlqUIg?si=cK7KW_sM0uf95lEp"},
                        {"id": "functions", "title": "Functions and Modules", "type": "code"},
                        {"id": "turtle-graphics", "title": "Python Turtle Graphics", "type": "video", "video_url": "https://youtu.be/SsH8GJlqUIg?si=cK7KW_sM0uf95lEp"}
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
            "mentor": "5t4l1n",
            "video_url": "https://youtu.be/SsH8GJlqUIg?si=cK7KW_sM0uf95lEp",
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
            "mentor": "5t4l1n",
            "video_url": "https://youtu.be/cDnX0vyNTaE?si=ZXNI4hv2HlWN7eCS",
            "modules": [
                {
                    "id": "recon",
                    "title": "Reconnaissance and Information Gathering",
                    "lessons": [
                        {"id": "footprinting", "title": "Footprinting Techniques", "type": "video", "video_url": "https://youtu.be/cDnX0vyNTaE?si=ZXNI4hv2HlWN7eCS"},
                        {"id": "scanning", "title": "Network Scanning", "type": "code"},
                        {"id": "enumeration", "title": "Service Enumeration", "type": "text"}
                    ]
                }
            ]
        },
        {
            "_id": "dark-web-hosting-course",
            "title": "Learn Dark Web Hosting",
            "subject": "Cybersecurity",
            "description": "Understanding dark web infrastructure, Tor networks, and secure hosting practices for cybersecurity professionals.",
            "difficulty": "Expert",
            "mentor": "5t4l1n", 
            "video_url": "https://youtu.be/Z4_USAMVhYs?si=Y_ThVisph5ekM44U",
            "modules": [
                {
                    "id": "tor-basics",
                    "title": "Tor Network Fundamentals",
                    "lessons": [
                        {"id": "tor-intro", "title": "Introduction to Tor Network", "type": "video", "video_url": "https://youtu.be/Z4_USAMVhYs?si=Y_ThVisph5ekM44U"},
                        {"id": "onion-services", "title": "Setting Up Onion Services", "type": "code"},
                        {"id": "security-practices", "title": "Security Best Practices", "type": "text"}
                    ]
                },
                {
                    "id": "hosting-setup",
                    "title": "Dark Web Hosting Setup",
                    "lessons": [
                        {"id": "server-config", "title": "Server Configuration", "type": "code"},
                        {"id": "anonymity", "title": "Maintaining Anonymity", "type": "text"}
                    ]
                }
            ]
        }
    ]
    
    try:
        # Clear existing courses first
        await mongo_service.db.courses.delete_many({})
        # Insert updated courses
        await mongo_service.db.courses.insert_many(courses)
        print("✅ Courses with mentor and video links seeded successfully!")
    except Exception as e:
        print(f"❌ Error seeding courses: {e}")

if __name__ == "__main__":
    asyncio.run(seed_courses())
