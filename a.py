from pymongo import MongoClient
db = MongoClient("mongodb://localhost:27017").openlearnx
exam = db.exams.find_one({"_id": ObjectId("6884f04c6ca73cc9032deaf9")})
print(exam["exam_code"])      # this is what participants must type
