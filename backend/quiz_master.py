import tensorflow as tf
import pickle
import json
import numpy as np
import random
from tensorflow.keras.preprocessing.sequence import pad_sequences

class AdaptiveQuizMasterAPI:
    def __init__(self, models_path="./models/"):
        """
        Initialize the adaptive quiz master for web deployment
        """
        self.models_path = models_path
        
        # Load model components
        self.model = tf.keras.models.load_model(f'{models_path}improved_cnn_model.h5')
        
        with open(f'{models_path}tokenizer.pickle', 'rb') as f:
            self.tokenizer = pickle.load(f)
        
        with open(f'{models_path}label_encoder.pickle', 'rb') as f:
            self.label_encoder = pickle.load(f)
        
        with open(f'{models_path}processed_commonsenseqa_data.json', 'r') as f:
            self.quiz_data = json.load(f)
        
        # Separate questions by difficulty
        self.questions_by_difficulty = {
            'easy': [q for q in self.quiz_data if q['difficulty'] == 'easy'],
            'medium': [q for q in self.quiz_data if q['difficulty'] == 'medium'],
            'hard': [q for q in self.quiz_data if q['difficulty'] == 'hard']
        }
        
        print(f"✅ Quiz Master API initialized!")
        print(f"📊 Questions: Easy({len(self.questions_by_difficulty['easy'])}), Medium({len(self.questions_by_difficulty['medium'])}), Hard({len(self.questions_by_difficulty['hard'])})")
    
    def get_question(self, difficulty='easy'):
        """
        Get a random question of specified difficulty
        """
        available_questions = self.questions_by_difficulty.get(difficulty, self.quiz_data)
        
        if not available_questions:
            available_questions = self.quiz_data
        
        question_data = random.choice(available_questions)
        
        # Create formatted question with shuffled choices
        choices = question_data['incorrect_answers'] + [question_data['correct_answer']]
        random.shuffle(choices)
        
        # Find correct answer position
        correct_position = choices.index(question_data['correct_answer'])
        correct_letter = chr(65 + correct_position)
        
        return {
            'question': question_data['question'],
            'choices': {
                'A': choices[0],
                'B': choices[1], 
                'C': choices[2],
                'D': choices[3]
            },
            'correct_answer': correct_letter,
            'difficulty': difficulty,
            'original_question': question_data['question']
        }
    
    def predict_answer(self, question_text, choices):
        """
        Use AI model to predict the answer
        """
        # Format question for model prediction
        formatted_question = f"Difficulty: medium\nQuestion: {question_text}\n"
        formatted_question += f"A) {choices['A']}\n"
        formatted_question += f"B) {choices['B']}\n"
        formatted_question += f"C) {choices['C']}\n"
        formatted_question += f"D) {choices['D']}\n"
        
        # Tokenize and predict
        sequence = self.tokenizer.texts_to_sequences([formatted_question])
        padded = pad_sequences(sequence, maxlen=400, padding='post')
        
        prediction = self.model.predict(padded, verbose=0)
        predicted_class = np.argmax(prediction[0])
        predicted_letter = self.label_encoder.inverse_transform([predicted_class])[0]
        confidence = float(prediction[0][predicted_class])
        
        return {
            'prediction': predicted_letter,
            'confidence': confidence,
            'all_probabilities': {
                'A': float(prediction[0][0]),
                'B': float(prediction[0][1]),
                'C': float(prediction[0][2]),
                'D': float(prediction[0][3])
            }
        }
    
    def adjust_difficulty(self, current_difficulty, consecutive_correct, is_correct):
        """
        Adjust difficulty based on performance
        """
        if is_correct:
            consecutive_correct += 1
            
            # Move up after 3 consecutive correct
            if consecutive_correct >= 3:
                if current_difficulty == 'easy':
                    return 'medium', 0
                elif current_difficulty == 'medium':
                    return 'hard', 0
                    
        else:
            consecutive_correct = 0
            
            # Move down after 1 wrong answer
            if current_difficulty == 'hard':
                return 'medium', 0
            elif current_difficulty == 'medium':
                return 'easy', 0
        
        return current_difficulty, consecutive_correct
