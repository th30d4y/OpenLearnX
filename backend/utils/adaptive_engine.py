def choose_next_question(current_difficulty: int, last_answer_correct: bool) -> int:
    """
    Simplified adaptive engine logic adjusting difficulty for next question.
    """
    if last_answer_correct:
        return min(current_difficulty + 1, 3)  # max difficulty = 3
    else:
        return max(current_difficulty - 1, 1)  # min difficulty = 1
