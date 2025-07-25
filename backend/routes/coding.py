from flask import Blueprint, jsonify, request, current_app
import requests
from bson import ObjectId
from datetime import datetime

bp = Blueprint('coding', __name__)
PISTON_API_URL = "https://emkc.org/api/v2/piston/execute"

@bp.route("/problems", methods=["GET"])
async def get_problems():
    mongo = current_app.config['MONGO_SERVICE']
    problems = await mongo.db.coding_problems.find().to_list(100)
    for p in problems:
        p['_id'] = str(p['_id'])
    return jsonify(problems)

@bp.route("/problems/<problem_id>", methods=["GET"])
async def get_problem(problem_id):
    mongo = current_app.config['MONGO_SERVICE']
    prob = await mongo.db.coding_problems.find_one({"_id": ObjectId(problem_id)})
    if not prob:
        return jsonify({"error": "Problem not found"}), 404
    prob['_id'] = str(prob['_id'])
    return jsonify(prob)

@bp.route("/run", methods=["POST"])
async def run_code():
    data = request.json
    problem_id = data.get("problem_id")
    code = data.get("code")
    language = data.get("language")

    mongo = current_app.config['MONGO_SERVICE']
    problem = await mongo.db.coding_problems.find_one({"_id": ObjectId(problem_id)})
    if not problem:
        return jsonify({"error": "Problem not found"}), 404

    # Concatenate all test case inputs
    input_data = '\n'.join([tc['input'] for tc in problem['test_cases']])

    try:
        resp = requests.post(
            PISTON_API_URL,
            json={
                "language": language,
                "source": code,
                "input": input_data
            },
            timeout=10,
        )
        resp.raise_for_status()
        result = resp.json()
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    # Compare output against expected (simple line-by-line check)
    output_lines = result.get("output", "").strip().split('\n')
    expected_outputs = [tc['expected_output'].strip() for tc in problem['test_cases']]
    correct = output_lines == expected_outputs

    return jsonify({
        "output": result.get("output"),
        "error": result.get("stderr"),
        "runtime": result.get("stats", {}).get("duration"),
        "correct": correct,
    })

@bp.route("/submit", methods=["POST"])
async def submit_solution():
    # Same as run_code, but can mark problem as solved
    user = await get_authenticated_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    # Run the code first
    result = await run_code()
    jres = result.get_json()

    if jres.get("correct"):
        mongo = current_app.config['MONGO_SERVICE']
        # Record that user solved problem
        await mongo.db.user_solutions.update_one(
            {"user_id": user['_id'], "problem_id": jres.get('problem_id')},
            {"$set": {"solved": True, "solved_at": datetime.utcnow()}},
            upsert=True
        )
    return jsonify(jres)
``
