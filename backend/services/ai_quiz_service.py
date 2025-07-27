import tensorflow as tf
import pickle
import json
import numpy as np
import random
import os
from tensorflow.keras.preprocessing.sequence import pad_sequences
from datetime import datetime
from bson import ObjectId
import uuid

class AdaptiveQuizMasterLLM:
    def __init__(self, models_path="./models/"):
        """
        Intelligent Quiz Master with enhanced fallback questions and AI generation
        """
        self.models_path = models_path
        self.model_available = False
        
        try:
            # Try to load model files
            model_file = f'{models_path}improved_cnn_model.h5'
            tokenizer_file = f'{models_path}tokenizer.pickle'
            label_encoder_file = f'{models_path}label_encoder.pickle'
            data_file = f'{models_path}processed_commonsenseqa_data.json'
            
            if all(os.path.exists(f) for f in [model_file, tokenizer_file, label_encoder_file, data_file]):
                try:
                    self.model = tf.keras.models.load_model(model_file)
                    print("✅ CNN Model loaded successfully")
                    self.model_available = True
                except Exception as e:
                    print(f"⚠️ Model loading failed: {e}")
                    self.model = None
                    self.model_available = False
                
                with open(tokenizer_file, 'rb') as f:
                    self.tokenizer = pickle.load(f)
                with open(label_encoder_file, 'rb') as f:
                    self.label_encoder = pickle.load(f)
                with open(data_file, 'r') as f:
                    self.quiz_data = json.load(f)
            else:
                print("⚠️ Model files not found. Using enhanced fallback questions...")
                self.model = None
                self.tokenizer = None
                self.label_encoder = None
                self.quiz_data = self._get_enhanced_fallback_questions()
                self.model_available = False
        
        except Exception as e:
            print(f"⚠️ Model initialization failed: {e}")
            self.model = None
            self.tokenizer = None
            self.label_encoder = None
            self.quiz_data = self._get_enhanced_fallback_questions()
            self.model_available = False
        
        # Distribute questions by difficulty
        self.questions_by_difficulty = {
            'easy': [q for q in self.quiz_data if q.get('difficulty') == 'easy'],
            'medium': [q for q in self.quiz_data if q.get('difficulty') == 'medium'],
            'hard': [q for q in self.quiz_data if q.get('difficulty') == 'hard']
        }
        
        # If no questions are categorized, distribute fallback questions
        if not any(self.questions_by_difficulty.values()):
            self._distribute_fallback_questions()
        
        print("🤖 AdaptiveQuizMasterLLM initialized")
        print(f"📊 Model Available: {self.model_available}")
        print(f"📊 Questions: Easy({len(self.questions_by_difficulty['easy'])}), "
              f"Medium({len(self.questions_by_difficulty['medium'])}), "
              f"Hard({len(self.questions_by_difficulty['hard'])})")

    def _get_enhanced_fallback_questions(self):
        """Enhanced fallback questions with comprehensive coverage"""
        return [
            # ===== EASY QUESTIONS =====
            {
                "id": "easy_1",
                "question": "What is the capital of France?",
                "incorrect_answers": ["London", "Berlin", "Madrid"],
                "correct_answer": "Paris",
                "difficulty": "easy",
                "category": "Geography"
            },
            {
                "id": "easy_2", 
                "question": "Which programming language is known for its simplicity and readability?",
                "incorrect_answers": ["C++", "Assembly", "Java"],
                "correct_answer": "Python",
                "difficulty": "easy",
                "category": "Programming"
            },
            {
                "id": "easy_3",
                "question": "What does HTML stand for?",
                "incorrect_answers": ["High Tech Modern Language", "Home Tool Markup Language", "Hyperlink Text Language"],
                "correct_answer": "HyperText Markup Language",
                "difficulty": "easy",
                "category": "Web Development"
            },
            {
                "id": "easy_4",
                "question": "Which of these is a web browser?",
                "incorrect_answers": ["Microsoft Word", "Adobe Photoshop", "Spotify"],
                "correct_answer": "Google Chrome",
                "difficulty": "easy",
                "category": "Technology"
            },
            {
                "id": "easy_5",
                "question": "What is 2 + 2?",
                "incorrect_answers": ["3", "5", "6"],
                "correct_answer": "4",
                "difficulty": "easy",
                "category": "Mathematics"
            },
            {
                "id": "easy_6",
                "question": "Which planet is closest to the Sun?",
                "incorrect_answers": ["Venus", "Earth", "Mars"],
                "correct_answer": "Mercury",
                "difficulty": "easy",
                "category": "Science"
            },
            {
                "id": "easy_7",
                "question": "What does CSS stand for?",
                "incorrect_answers": ["Computer Style Sheets", "Creative Style Sheets", "Colorful Style Sheets"],
                "correct_answer": "Cascading Style Sheets",
                "difficulty": "easy",
                "category": "Web Development"
            },
            {
                "id": "easy_8",
                "question": "Which company developed the iPhone?",
                "incorrect_answers": ["Google", "Microsoft", "Samsung"],
                "correct_answer": "Apple",
                "difficulty": "easy",
                "category": "Technology"
            },
            {
                "id": "easy_9",
                "question": "What is the largest ocean on Earth?",
                "incorrect_answers": ["Atlantic", "Indian", "Arctic"],
                "correct_answer": "Pacific",
                "difficulty": "easy",
                "category": "Geography"
            },
            {
                "id": "easy_10",
                "question": "Which data type stores whole numbers in programming?",
                "incorrect_answers": ["float", "string", "boolean"],
                "correct_answer": "integer",
                "difficulty": "easy",
                "category": "Programming"
            },
            
            # ===== MEDIUM QUESTIONS =====
            {
                "id": "medium_1",
                "question": "What does API stand for?",
                "incorrect_answers": ["Advanced Programming Interface", "Automated Program Integration", "Applied Programming Instructions"],
                "correct_answer": "Application Programming Interface",
                "difficulty": "medium",
                "category": "Programming"
            },
            {
                "id": "medium_2",
                "question": "In machine learning, what does 'overfitting' mean?",
                "incorrect_answers": ["Model performs well on all data", "Model is too simple", "Model trains too quickly"],
                "correct_answer": "Model memorizes training data but fails on new data",
                "difficulty": "medium",
                "category": "Machine Learning"
            },
            {
                "id": "medium_3",
                "question": "Which HTTP status code indicates 'Not Found'?",
                "incorrect_answers": ["200", "500", "403"],
                "correct_answer": "404",
                "difficulty": "medium",
                "category": "Web Development"
            },
            {
                "id": "medium_4",
                "question": "What is the primary purpose of a database index?",
                "incorrect_answers": ["Store data", "Backup data", "Encrypt data"],
                "correct_answer": "Speed up data retrieval",
                "difficulty": "medium",
                "category": "Database"
            },
            {
                "id": "medium_5",
                "question": "In React, what is a component?",
                "incorrect_answers": ["A CSS framework", "A database table", "A server endpoint"],
                "correct_answer": "A reusable piece of UI",
                "difficulty": "medium",
                "category": "React"
            },
            {
                "id": "medium_6",
                "question": "What does CPU stand for?",
                "incorrect_answers": ["Computer Programming Unit", "Central Program Unit", "Control Program Utility"],
                "correct_answer": "Central Processing Unit",
                "difficulty": "medium",
                "category": "Hardware"
            },
            {
                "id": "medium_7",
                "question": "Which sorting algorithm has the best average time complexity?",
                "incorrect_answers": ["Bubble Sort", "Selection Sort", "Insertion Sort"],
                "correct_answer": "Quick Sort",
                "difficulty": "medium",
                "category": "Algorithms"
            },
            {
                "id": "medium_8",
                "question": "What is the difference between '==' and '===' in JavaScript?",
                "incorrect_answers": ["No difference", "=== is for strings only", "== is deprecated"],
                "correct_answer": "=== checks type and value, == only checks value",
                "difficulty": "medium",
                "category": "JavaScript"
            },
            {
                "id": "medium_9",
                "question": "In SQL, what does JOIN do?",
                "incorrect_answers": ["Creates a new table", "Deletes records", "Updates data"],
                "correct_answer": "Combines rows from multiple tables",
                "difficulty": "medium",
                "category": "Database"
            },
            {
                "id": "medium_10",
                "question": "What is the purpose of version control systems like Git?",
                "incorrect_answers": ["Code compilation", "Database management", "User interface design"],
                "correct_answer": "Track changes in source code",
                "difficulty": "medium",
                "category": "Development Tools"
            },
            
            # ===== HARD QUESTIONS =====
            {
                "id": "hard_1",
                "question": "What is the time complexity of binary search?",
                "incorrect_answers": ["O(n)", "O(n²)", "O(n log n)"],
                "correct_answer": "O(log n)",
                "difficulty": "hard",
                "category": "Algorithms"
            },
            {
                "id": "hard_2",
                "question": "Which design pattern ensures a class has only one instance?",
                "incorrect_answers": ["Factory", "Observer", "Strategy"],
                "correct_answer": "Singleton",
                "difficulty": "hard",
                "category": "Design Patterns"
            },
            {
                "id": "hard_3",
                "question": "In distributed systems, what is the CAP theorem?",
                "incorrect_answers": ["Consistency, Availability, Performance", "Concurrency, Atomicity, Persistence", "Caching, Authentication, Privacy"],
                "correct_answer": "Consistency, Availability, Partition tolerance",
                "difficulty": "hard",
                "category": "Distributed Systems"
            },
            {
                "id": "hard_4",
                "question": "What is the space complexity of merge sort?",
                "incorrect_answers": ["O(1)", "O(log n)", "O(n²)"],
                "correct_answer": "O(n)",
                "difficulty": "hard",
                "category": "Algorithms"
            },
            {
                "id": "hard_5",
                "question": "In functional programming, what is a closure?",
                "incorrect_answers": ["A loop structure", "A data type", "A compilation step"],
                "correct_answer": "A function that captures variables from its scope",
                "difficulty": "hard",
                "category": "Programming Concepts"
            },
            {
                "id": "hard_6",
                "question": "What is the purpose of hash table collision resolution?",
                "incorrect_answers": ["Increase memory usage", "Slow down operations", "Reduce security"],
                "correct_answer": "Handle multiple keys mapping to the same slot",
                "difficulty": "hard",
                "category": "Data Structures"
            },
            {
                "id": "hard_7",
                "question": "In microservices architecture, what is service discovery?",
                "incorrect_answers": ["Database replication", "Load balancing", "Code deployment"],
                "correct_answer": "Mechanism for services to find and communicate with each other",
                "difficulty": "hard",
                "category": "Architecture"
            },
            {
                "id": "hard_8",
                "question": "What is the difference between TCP and UDP?",
                "incorrect_answers": ["UDP is faster but unreliable", "TCP is for web only", "No significant difference"],
                "correct_answer": "TCP is reliable and connection-oriented, UDP is fast but unreliable",
                "difficulty": "hard",
                "category": "Networking"
            },
            {
                "id": "hard_9",
                "question": "In machine learning, what is the curse of dimensionality?",
                "incorrect_answers": ["Too much training data", "Overly complex models", "Hardware limitations"],
                "correct_answer": "Performance degradation as feature dimensions increase",
                "difficulty": "hard",
                "category": "Machine Learning"
            },
            {
                "id": "hard_10",
                "question": "What is eventual consistency in distributed databases?",
                "incorrect_answers": ["Data is always consistent", "Consistency is never achieved", "Only one node has data"],
                "correct_answer": "System will become consistent over time without continuous input",
                "difficulty": "hard",
                "category": "Distributed Systems"
            }
        ]

    def _distribute_fallback_questions(self):
        """Distribute fallback questions into difficulty levels"""
        fallback_data = self._get_enhanced_fallback_questions()
        self.quiz_data = fallback_data
        
        self.questions_by_difficulty = {
            'easy': [q for q in fallback_data if q.get('difficulty') == 'easy'],
            'medium': [q for q in fallback_data if q.get('difficulty') == 'medium'], 
            'hard': [q for q in fallback_data if q.get('difficulty') == 'hard']
        }

    def generate_quiz(self, topic=None, difficulty=None, num_questions=5):
        """
        Generate a quiz compatible with room-based quiz system - FIXED VERSION
        """
        print(f"🤖 Generating quiz: topic={topic}, difficulty={difficulty}, num_questions={num_questions}")
        
        # Filter questions based on topic and difficulty
        filtered = self.quiz_data.copy()
        
        if topic and topic.lower() != 'general':
            filtered = [q for q in filtered if 
                       topic.lower() in q.get('question', '').lower() or 
                       topic.lower() in q.get('category', '').lower()]
            print(f"📝 Filtered by topic '{topic}': {len(filtered)} questions")
        
        if difficulty:
            filtered = [q for q in filtered if q.get('difficulty', 'medium') == difficulty]
            print(f"📝 Filtered by difficulty '{difficulty}': {len(filtered)} questions")
        
        # Ensure we have questions to select from
        if not filtered:
            print("⚠️ No questions match criteria, using all available questions")
            filtered = self.quiz_data[:10]  # Use first 10 as fallback
        
        # Select random questions
        selected = random.sample(filtered, min(num_questions, len(filtered)))
        print(f"📝 Selected {len(selected)} questions from {len(filtered)} filtered questions")
        
        questions = []
        for i, q_data in enumerate(selected):
            choices = q_data['incorrect_answers'] + [q_data['correct_answer']]
            random.shuffle(choices)
            correct_idx = choices.index(q_data['correct_answer'])
            
            questions.append({
                "id": str(uuid.uuid4()),
                "question_number": i + 1,
                "question_text": q_data['question'],
                "options": choices,
                "correct_answer": chr(65 + correct_idx),  # A, B, C, D
                "points": 10 if q_data.get('difficulty') == 'easy' else 15 if q_data.get('difficulty') == 'medium' else 20,
                "explanation": f"The correct answer is {q_data['correct_answer']}.",
                "difficulty": q_data.get('difficulty', 'medium'),
                "category": q_data.get('category', 'General')
            })

        quiz_result = {
            "id": str(uuid.uuid4()),
            "title": f"AI Generated Quiz{(' - ' + topic) if topic and topic.lower() != 'general' else ''}",
            "description": f"Quiz generated by AI. Topic: {topic or 'General'}, Difficulty: {difficulty or 'Mixed'}",
            "difficulty": difficulty or "mixed",
            "questions": questions,
            "created_at": datetime.now().isoformat(),
            "generated_by": "AI",
            "total_points": sum(q['points'] for q in questions)
        }
        
        print(f"✅ Quiz generated successfully: {len(questions)} questions, {quiz_result['total_points']} total points")
        return quiz_result

    def create_session(self, user_id):
        """Create new adaptive quiz session"""
        session_id = str(ObjectId())
        session_data = {
            'session_id': session_id,
            'user_id': user_id,
            'current_difficulty': 'easy',  # Always start with easy
            'consecutive_correct': {'easy': 0, 'medium': 0, 'hard': 0},
            'total_questions': 0,
            'total_correct': 0,
            'question_history': [],
            'created_at': datetime.utcnow(),
            'status': 'active'
        }
        return session_data
    
    def get_adaptive_question(self, session_data):
        """Get next question based on current difficulty level"""
        current_difficulty = session_data['current_difficulty']
        available_questions = self.questions_by_difficulty[current_difficulty].copy()
        
        # Avoid repeating questions
        asked_questions = [q['question_id'] for q in session_data.get('question_history', [])]
        available_questions = [q for q in available_questions 
                             if q.get('id', str(hash(q['question']))) not in asked_questions]
        
        if not available_questions:
            # Fallback to any difficulty if current level exhausted
            all_available = [q for q in self.quiz_data 
                           if q.get('id', str(hash(q['question']))) not in asked_questions]
            available_questions = all_available[:10] if all_available else self.quiz_data[:5]
        
        # Select random question
        question_data = random.choice(available_questions)
        
        # Create formatted question with shuffled choices
        choices = question_data['incorrect_answers'] + [question_data['correct_answer']]
        random.shuffle(choices)
        
        # Find correct answer position
        correct_position = choices.index(question_data['correct_answer'])
        correct_letter = chr(65 + correct_position)
        
        question_obj = {
            'question_id': question_data.get('id', str(hash(question_data['question']))),
            'question_text': question_data['question'],
            'choices': {
                'A': choices[0],
                'B': choices[1], 
                'C': choices[2],
                'D': choices[3]
            },
            'correct_answer': correct_letter,
            'correct_answer_text': question_data['correct_answer'],
            'difficulty': current_difficulty,
            'category': question_data.get('category', 'General'),
            'explanation': f"The correct answer is {question_data['correct_answer']}."
        }
        
        return question_obj
    
    def get_llm_prediction(self, question_text, choices):
        """Use trained model to predict answer (with intelligent fallback)"""
        if not self.model_available or not self.model:
            # Intelligent fallback with pattern matching
            question_lower = question_text.lower()
            choice_keys = list(choices.keys()) if isinstance(choices, dict) else ['A', 'B', 'C', 'D']
            choice_texts = [choices[key].lower() if isinstance(choices, dict) else choices[i].lower() 
                          for i, key in enumerate(choice_keys)]
            
            # Enhanced pattern matching
            if 'capital' in question_lower and 'france' in question_lower:
                for i, choice in enumerate(choice_texts):
                    if 'paris' in choice:
                        return {
                            'llm_prediction': choice_keys[i],
                            'confidence': 0.9,
                            'model_accuracy': 90.0,
                            'fallback_mode': True,
                            'reason': 'Pattern matching - France capital'
                        }
            
            if 'html' in question_lower and 'stand' in question_lower:
                for i, choice in enumerate(choice_texts):
                    if 'hypertext markup' in choice:
                        return {
                            'llm_prediction': choice_keys[i],
                            'confidence': 0.85,
                            'model_accuracy': 85.0,
                            'fallback_mode': True,
                            'reason': 'Pattern matching - HTML definition'
                        }
            
            # Default random fallback
            fallback_prediction = random.choice(choice_keys)
            return {
                'llm_prediction': fallback_prediction,
                'confidence': 0.25,
                'model_accuracy': 25.0,
                'fallback_mode': True,
                'reason': 'Random selection'
            }
        
        try:
            # Format question for model prediction
            formatted_question = f"Question: {question_text}\n"
            if isinstance(choices, dict):
                for key, choice in choices.items():
                    formatted_question += f"{key}) {choice}\n"
            else:
                for i, choice in enumerate(choices):
                    formatted_question += f"{chr(65+i)}) {choice}\n"
            
            # Tokenize and predict using trained model
            sequence = self.tokenizer.texts_to_sequences([formatted_question])
            padded = pad_sequences(sequence, maxlen=400, padding='post')
            
            prediction = self.model.predict(padded, verbose=0)
            predicted_class = np.argmax(prediction[0])
            predicted_letter = self.label_encoder.inverse_transform([predicted_class])[0]
            confidence = float(prediction[0][predicted_class])
            
            return {
                'llm_prediction': predicted_letter,
                'confidence': confidence,
                'model_accuracy': 33.1,  # Your model's test accuracy
                'fallback_mode': False,
                'reason': 'CNN model prediction'
            }
            
        except Exception as e:
            print(f"⚠️ Model prediction error: {e}")
            # Fallback on error
            fallback_prediction = random.choice(['A', 'B', 'C', 'D'])
            return {
                'llm_prediction': fallback_prediction,
                'confidence': 0.25,
                'model_accuracy': 25.0,
                'fallback_mode': True,
                'error': str(e),
                'reason': 'Error fallback'
            }
    
    def evaluate_answer(self, session_data, question_data, user_answer):
        """Evaluate user answer and adjust difficulty"""
        is_correct = (user_answer.upper() == question_data['correct_answer'])
        current_difficulty = session_data['current_difficulty']
        
        # Update session stats
        session_data['total_questions'] += 1
        if is_correct:
            session_data['total_correct'] += 1
            session_data['consecutive_correct'][current_difficulty] += 1
        else:
            # Reset consecutive count for current difficulty
            session_data['consecutive_correct'][current_difficulty] = 0
        
        # Apply difficulty adjustment rules
        new_difficulty = self._adjust_difficulty(session_data, is_correct)
        
        # Record question in history
        question_record = {
            'question_id': question_data['question_id'],
            'question_text': question_data['question_text'],
            'user_answer': user_answer,
            'correct_answer': question_data['correct_answer'],
            'correct_answer_text': question_data['correct_answer_text'],
            'is_correct': is_correct,
            'difficulty': current_difficulty,
            'category': question_data.get('category', 'General'),
            'timestamp': datetime.utcnow()
        }
        session_data['question_history'].append(question_record)
        
        # Get LLM prediction for comparison
        llm_result = self.get_llm_prediction(question_data['question_text'], question_data['choices'])
        
        result = {
            'is_correct': is_correct,
            'correct_answer': question_data['correct_answer'],
            'correct_answer_text': question_data['correct_answer_text'],
            'explanation': question_data['explanation'],
            'difficulty_changed': new_difficulty != current_difficulty,
            'previous_difficulty': current_difficulty,
            'new_difficulty': new_difficulty,
            'consecutive_correct': session_data['consecutive_correct'][current_difficulty],
            'llm_prediction': llm_result,
            'llm_agrees': llm_result['llm_prediction'] == question_data['correct_answer'],
            'session_stats': {
                'total_questions': session_data['total_questions'],
                'total_correct': session_data['total_correct'],
                'accuracy': round((session_data['total_correct'] / session_data['total_questions']) * 100, 1)
            }
        }
        
        session_data['current_difficulty'] = new_difficulty
        return result
    
    def _adjust_difficulty(self, session_data, is_correct):
        """Difficulty adjustment rules: 3 correct up, 1 wrong down"""
        current_difficulty = session_data['current_difficulty']
        consecutive = session_data['consecutive_correct']
        
        if is_correct:
            # Move up after 3 consecutive correct answers
            if consecutive[current_difficulty] >= 3:
                if current_difficulty == 'easy':
                    session_data['consecutive_correct']['easy'] = 0
                    return 'medium'
                elif current_difficulty == 'medium':
                    session_data['consecutive_correct']['medium'] = 0
                    return 'hard'
        else:
            # Move down immediately after 1 wrong answer
            if current_difficulty == 'hard':
                return 'medium'
            elif current_difficulty == 'medium':
                return 'easy'
        
        return current_difficulty
    
    def get_session_stats(self, session_data):
        """Get comprehensive session statistics"""
        total_questions = session_data['total_questions']
        total_correct = session_data['total_correct']
        accuracy = (total_correct / total_questions * 100) if total_questions > 0 else 0
        
        difficulty_stats = {}
        for difficulty in ['easy', 'medium', 'hard']:
            questions_at_level = [q for q in session_data['question_history'] if q['difficulty'] == difficulty]
            correct_at_level = sum(1 for q in questions_at_level if q['is_correct'])
            difficulty_stats[difficulty] = {
                'questions': len(questions_at_level),
                'correct': correct_at_level,
                'accuracy': round((correct_at_level / len(questions_at_level) * 100), 1) if questions_at_level else 0
            }
        
        return {
            'session_id': session_data['session_id'],
            'current_difficulty': session_data['current_difficulty'],
            'total_questions': total_questions,
            'total_correct': total_correct,
            'overall_accuracy': round(accuracy, 1),
            'consecutive_correct': session_data['consecutive_correct'],
            'difficulty_breakdown': difficulty_stats,
            'status': session_data['status'],
            'model_available': self.model_available
        }

# Export the class for backward compatibility
AIQuizService = AdaptiveQuizMasterLLM
