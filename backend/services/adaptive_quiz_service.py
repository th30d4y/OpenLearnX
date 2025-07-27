import tensorflow as tf
import pickle
import json
import numpy as np
import random
import os
from tensorflow.keras.preprocessing.sequence import pad_sequences
from datetime import datetime
from bson import ObjectId

class AdaptiveQuizMasterLLM:
    def __init__(self, models_path="./models/"):
        """
        Intelligent Quiz Master with optional model loading
        """
        self.models_path = models_path
        self.model_available = False
        
        # Try to load model components
        try:
            # Check if model files exist
            model_file = f'{models_path}improved_cnn_model.h5'
            tokenizer_file = f'{models_path}tokenizer.pickle'
            label_encoder_file = f'{models_path}label_encoder.pickle'
            data_file = f'{models_path}processed_commonsenseqa_data.json'
            
            if all(os.path.exists(f) for f in [model_file, tokenizer_file, label_encoder_file, data_file]):
                # Load model with compatibility handling
                try:
                    self.model = tf.keras.models.load_model(model_file)
                    self.model_available = True
                    print("✅ CNN Model loaded successfully")
                except Exception as model_error:
                    print(f"⚠️ Model loading failed: {model_error}")
                    print("🔄 Continuing without AI predictions...")
                    self.model = None
                    self.model_available = False
                
                # Load other components
                with open(tokenizer_file, 'rb') as f:
                    self.tokenizer = pickle.load(f)
                
                with open(label_encoder_file, 'rb') as f:
                    self.label_encoder = pickle.load(f)
                
                with open(data_file, 'r') as f:
                    self.quiz_data = json.load(f)
                    
            else:
                print("⚠️ Model files not found. Using fallback quiz data...")
                self.model = None
                self.tokenizer = None
                self.label_encoder = None
                self.quiz_data = self._get_fallback_questions()
                self.model_available = False
        
        except Exception as e:
            print(f"⚠️ Model initialization failed: {e}")
            print("🔄 Using fallback mode...")
            self.model = None
            self.tokenizer = None
            self.label_encoder = None
            self.quiz_data = self._get_fallback_questions()
            self.model_available = False
        
        # Separate questions by difficulty
        self.questions_by_difficulty = {
            'easy': [q for q in self.quiz_data if q.get('difficulty') == 'easy'],
            'medium': [q for q in self.quiz_data if q.get('difficulty') == 'medium'],
            'hard': [q for q in self.quiz_data if q.get('difficulty') == 'hard']
        }
        
        print("🤖 Adaptive Quiz Master LLM initialized!")
        print(f"📊 Model Available: {self.model_available}")
        print(f"📊 Questions: Easy({len(self.questions_by_difficulty['easy'])}), Medium({len(self.questions_by_difficulty['medium'])}), Hard({len(self.questions_by_difficulty['hard'])})")
    
    def _get_fallback_questions(self):
        """
        Fallback questions when model files are not available
        """
        return [
            {
                "question": "What is the capital of France?",
                "incorrect_answers": ["London", "Berlin", "Madrid"],
                "correct_answer": "Paris",
                "difficulty": "easy"
            },
            {
                "question": "Which programming language is known for its simplicity and readability?",
                "incorrect_answers": ["C++", "Assembly", "Java"],
                "correct_answer": "Python",
                "difficulty": "easy"
            },
            {
                "question": "What does API stand for?",
                "incorrect_answers": ["Advanced Programming Interface", "Automated Program Integration", "Applied Programming Instructions"],
                "correct_answer": "Application Programming Interface",
                "difficulty": "medium"
            },
            {
                "question": "In machine learning, what does 'overfitting' mean?",
                "incorrect_answers": ["Model performs well on all data", "Model is too simple", "Model trains too quickly"],
                "correct_answer": "Model memorizes training data but fails on new data",
                "difficulty": "medium"
            },
            {
                "question": "What is the time complexity of binary search?",
                "incorrect_answers": ["O(n)", "O(n²)", "O(n log n)"],
                "correct_answer": "O(log n)",
                "difficulty": "hard"
            },
            {
                "question": "Which design pattern ensures a class has only one instance?",
                "incorrect_answers": ["Factory", "Observer", "Strategy"],
                "correct_answer": "Singleton",
                "difficulty": "hard"
            }
        ]
    
    def create_session(self, user_id):
        """
        Create new adaptive quiz session
        """
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
        """
        Get next question based on current difficulty level
        """
        current_difficulty = session_data['current_difficulty']
        available_questions = self.questions_by_difficulty[current_difficulty]
        
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
            'difficulty': current_difficulty,
            'explanation': f"The correct answer is {question_data['correct_answer']}."
        }
        
        return question_obj
    
    def get_llm_prediction(self, question_text, choices):
        """
        Use trained model to predict answer (with fallback)
        """
        if not self.model_available or not self.model:
            # Fallback: Random prediction with low confidence
            import random
            fallback_prediction = random.choice(['A', 'B', 'C', 'D'])
            return {
                'llm_prediction': fallback_prediction,
                'confidence': 0.25,  # Random confidence
                'model_accuracy': 25.0,  # Random accuracy
                'fallback_mode': True
            }
        
        try:
            # Format question for model prediction
            formatted_question = f"Difficulty: medium\nQuestion: {question_text}\n"
            formatted_question += f"A) {choices['A']}\n"
            formatted_question += f"B) {choices['B']}\n"
            formatted_question += f"C) {choices['C']}\n"
            formatted_question += f"D) {choices['D']}\n"
            
            # Tokenize and predict using your trained model
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
                'fallback_mode': False
            }
            
        except Exception as e:
            print(f"⚠️ Prediction error: {e}")
            # Fallback on error
            import random
            fallback_prediction = random.choice(['A', 'B', 'C', 'D'])
            return {
                'llm_prediction': fallback_prediction,
                'confidence': 0.25,
                'model_accuracy': 25.0,
                'fallback_mode': True,
                'error': str(e)
            }
    
    def evaluate_answer(self, session_data, question_data, user_answer):
        """
        Evaluate user answer and adjust difficulty according to your rules
        """
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
        
        # Apply your exact difficulty adjustment rules
        new_difficulty = self._adjust_difficulty(session_data, is_correct)
        
        # Record question in history
        question_record = {
            'question_id': question_data['question_id'],
            'question_text': question_data['question_text'],
            'user_answer': user_answer,
            'correct_answer': question_data['correct_answer'],
            'is_correct': is_correct,
            'difficulty': current_difficulty,
            'timestamp': datetime.utcnow()
        }
        session_data['question_history'].append(question_record)
        
        # Get LLM prediction for comparison
        llm_result = self.get_llm_prediction(question_data['question_text'], question_data['choices'])
        
        result = {
            'is_correct': is_correct,
            'correct_answer': question_data['correct_answer'],
            'explanation': question_data['explanation'],
            'difficulty_changed': new_difficulty != current_difficulty,
            'previous_difficulty': current_difficulty,
            'new_difficulty': new_difficulty,
            'consecutive_correct': session_data['consecutive_correct'][current_difficulty],
            'llm_prediction': llm_result,
            'session_stats': {
                'total_questions': session_data['total_questions'],
                'total_correct': session_data['total_correct'],
                'accuracy': round((session_data['total_correct'] / session_data['total_questions']) * 100, 1)
            }
        }
        
        session_data['current_difficulty'] = new_difficulty
        return result
    
    def _adjust_difficulty(self, session_data, is_correct):
        """
        Your exact difficulty adjustment rules:
        - 3 consecutive correct: Easy→Medium→Hard
        - 1 incorrect: Hard→Medium→Easy (stay on Easy if already there)
        """
        current_difficulty = session_data['current_difficulty']
        consecutive = session_data['consecutive_correct']
        
        if is_correct:
            # Move up after 3 consecutive correct answers
            if consecutive[current_difficulty] >= 3:
                if current_difficulty == 'easy':
                    # Reset consecutive count for easy, start fresh for medium
                    session_data['consecutive_correct']['easy'] = 0
                    return 'medium'
                elif current_difficulty == 'medium':
                    # Reset consecutive count for medium, start fresh for hard
                    session_data['consecutive_correct']['medium'] = 0
                    return 'hard'
                # If already hard, stay hard
        else:
            # Move down immediately after 1 wrong answer
            if current_difficulty == 'hard':
                return 'medium'
            elif current_difficulty == 'medium':
                return 'easy'
            # If already easy, stay easy
        
        return current_difficulty
    
    def get_session_stats(self, session_data):
        """
        Get comprehensive session statistics
        """
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
            'status': session_data['status']
        }
