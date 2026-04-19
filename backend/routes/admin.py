from flask import Blueprint, request, jsonify
from functools import wraps
import uuid
from datetime import datetime
from pymongo import MongoClient
from pymongo import DESCENDING
import os
from bson import ObjectId
import re
import json
import csv
import io
import hashlib
from activity_logger import log_user_activity

bp = Blueprint('admin', __name__)

# MongoDB connection
mongo_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/')
client = MongoClient(mongo_uri)
db = client.openlearnx


def _safe_json_payload():
    """Safely parse JSON body without throwing on malformed input."""
    try:
        return request.get_json(silent=True) or {}
    except Exception:
        return {}


def _client_ip():
    forwarded_for = request.headers.get("X-Forwarded-For", "")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.remote_addr or "unknown"


def _admin_log(event_type, action, status_code=200, severity="info", metadata=None):
    """Write an admin/security log entry for auditability."""
    try:
        request_headers = {}
        for key, value in request.headers.items():
            if key.lower() in {"authorization", "cookie", "set-cookie"}:
                request_headers[key] = "[redacted]"
            else:
                request_headers[key] = value

        request_body = ""
        try:
            request_body = request.get_data(cache=True, as_text=True)[:4000]
        except Exception:
            request_body = ""

        log_doc = {
            "timestamp": datetime.utcnow(),
            "event_type": event_type,
            "action": action,
            "status_code": int(status_code),
            "severity": severity,
            "path": request.path,
            "method": request.method,
            "ip": _client_ip(),
            "user_agent": request.headers.get("User-Agent", ""),
            "metadata": {
                **(metadata or {}),
                "request_body": request_body,
                "request_details": {
                    "query": dict(request.args),
                    "json": _safe_json_payload(),
                    "headers": request_headers,
                    "content_type": request.headers.get("Content-Type", ""),
                },
                "response_details": {
                    "status_code": int(status_code),
                },
            },
            "metadata_text": str(metadata or {})
        }
        db.security_logs.insert_one(log_doc)
    except Exception as log_error:
        print(f"Log write failed: {log_error}")


def _json_safe(value):
    """Convert ObjectId/datetime/nested structures into JSON-safe values."""
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_json_safe(v) for v in value]
    return value


def _to_object_id(value):
    try:
        return ObjectId(value)
    except Exception:
        return None


def _hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            auth_header = request.headers.get('Authorization')
            print(f"Admin auth check - Header: {auth_header}")
            
            if not auth_header:
                print("❌ No Authorization header")
                _admin_log("admin_auth_failed", "missing_authorization_header", status_code=401, severity="warning")
                return jsonify({"error": "No authorization header provided"}), 401
            
            if not auth_header.startswith('Bearer '):
                print("❌ Invalid authorization format")
                _admin_log("admin_auth_failed", "invalid_authorization_format", status_code=401, severity="warning")
                return jsonify({"error": "Invalid authorization format"}), 401
            
            token = auth_header.split(' ')[1] if len(auth_header.split(' ')) > 1 else None
            
            # Check environment variable - no fallback for security
            expected_token = os.getenv('ADMIN_TOKEN')
            if not expected_token:
                print("❌ ADMIN_TOKEN environment variable not set")
                _admin_log("admin_auth_failed", "admin_token_not_configured", status_code=500, severity="error")
                return jsonify({"error": "Server configuration error: ADMIN_TOKEN not configured"}), 500
            
            # Strip any whitespace from both tokens
            if token and expected_token:
                if token.strip() == expected_token.strip():
                    print("✅ Admin authentication successful")
                    _admin_log("admin_auth_success", "token_validated", status_code=200)
                    return f(*args, **kwargs)
            
            print("❌ Token mismatch")
            _admin_log("admin_auth_failed", "token_mismatch", status_code=401, severity="warning")
            return jsonify({"error": "Invalid admin token"}), 401
            
        except Exception as e:
            print(f"❌ Admin auth error: {str(e)}")
            _admin_log("admin_auth_error", "authentication_exception", status_code=500, severity="error", metadata={"error": str(e)})
            return jsonify({"error": "Authentication failed"}), 500
    
    return decorated_function

def serialize_document(doc):
    """Convert MongoDB document to JSON-serializable format"""
    if doc:
        if '_id' in doc:
            doc['_id'] = str(doc['_id'])
        return doc
    return None

def serialize_course(course):
    """Convert MongoDB document to JSON-serializable format"""
    if course:
        if '_id' in course:
            del course['_id']
        return course
    return None

def convert_to_embed_url(youtube_url):
    """Convert YouTube watch URL to embed URL - ENHANCED VERSION"""
    if not youtube_url:
        return None
    
    try:
        if "youtu.be/" in youtube_url:
            video_id = youtube_url.split("youtu.be/")[1].split("?")[0].split("&")[0]
        elif "youtube.com/watch?v=" in youtube_url:
            video_id = youtube_url.split("v=")[1].split("&")[0]
        elif "youtube.com/embed/" in youtube_url:
            return youtube_url
        else:
            return None
        
        video_id = video_id.strip()
        return f"https://www.youtube.com/embed/{video_id}?rel=0&modestbranding=1"
    except Exception as e:
        print(f"Error converting YouTube URL: {e}")
        return None

@bp.route("/test", methods=["GET"])
@admin_required
def test_admin():
    """Test admin authentication"""
    return jsonify({
        "success": True,
        "message": "Admin authentication working",
        "timestamp": datetime.now().isoformat()
    })

@bp.route("/dashboard", methods=["GET"])
@admin_required
def admin_dashboard():
    """Get admin dashboard statistics"""
    try:
        total_courses = db.courses.count_documents({})
        total_lessons = db.lessons.count_documents({})
        total_modules = db.modules.count_documents({})
        total_users = db.users.count_documents({})
        total_logs = db.security_logs.count_documents({})
        active_students = db.users.count_documents({
            "$or": [
                {"status": "active"},
                {"last_login": {"$exists": True}},
                {"login_count": {"$gt": 0}}
            ]
        })

        # Real completion rate from user_courses when available.
        completion_rate = 0
        user_course_docs = list(db.user_courses.find(
            {"completion_percentage": {"$exists": True}},
            {"_id": 0, "completion_percentage": 1}
        ))
        if user_course_docs:
            total_completion = 0.0
            for doc in user_course_docs:
                try:
                    total_completion += float(doc.get("completion_percentage", 0))
                except Exception:
                    total_completion += 0.0
            completion_rate = round(total_completion / len(user_course_docs))

        # Fallback completion estimate from submissions when course progress docs are absent.
        if completion_rate == 0:
            total_submissions = db.user_submissions.count_documents({})
            total_users = max(db.users.count_documents({}), 1)
            if total_submissions > 0:
                completion_rate = min(round((total_submissions / total_users) * 10), 100)
        
        stats = {
            "total_courses": total_courses,
            "total_lessons": total_lessons,
            "total_modules": total_modules,
            "total_users": total_users,
            "total_logs": total_logs,
            "active_students": active_students,
            "completion_rate": completion_rate
        }
        _admin_log("admin_dashboard_view", "fetch_dashboard_stats", status_code=200, metadata=stats)
        return jsonify(stats)
    except Exception as e:
        print(f"Dashboard error: {str(e)}")
        _admin_log("admin_dashboard_error", "fetch_dashboard_stats_failed", status_code=500, severity="error", metadata={"error": str(e)})
        return jsonify({"error": str(e)}), 500


@bp.route("/logs/client-event", methods=["POST"])
@admin_required
def create_client_log_event():
    """Accept explicit frontend events (admin visits, UI actions, etc.)."""
    try:
        data = _safe_json_payload()
        event_type = (data.get("event_type") or "client_event").strip().lower()
        action = (data.get("action") or "unknown_action").strip()
        severity = (data.get("severity") or "info").strip().lower()
        metadata = data.get("metadata") or {}
        _admin_log(event_type, action, status_code=200, severity=severity, metadata=metadata)
        return jsonify({"success": True, "message": "Event logged"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/logs", methods=["GET"])
@admin_required
def get_admin_logs():
    """Query security and activity logs with filters for the admin panel."""
    try:
        event_type = request.args.get("event_type", "").strip()
        severity = request.args.get("severity", "").strip()
        status_code = request.args.get("status_code", "").strip()
        search = request.args.get("search", "").strip()
        from_ts = request.args.get("from", "").strip()
        to_ts = request.args.get("to", "").strip()
        limit = min(max(int(request.args.get("limit", 100)), 1), 500)
        page = max(int(request.args.get("page", 1)), 1)

        query = {}
        if event_type:
            query["event_type"] = event_type
        if severity:
            query["severity"] = severity
        if status_code:
            try:
                query["status_code"] = int(status_code)
            except Exception:
                pass

        ts_filter = {}
        if from_ts:
            try:
                ts_filter["$gte"] = datetime.fromisoformat(from_ts)
            except Exception:
                pass
        if to_ts:
            try:
                ts_filter["$lte"] = datetime.fromisoformat(to_ts)
            except Exception:
                pass
        if ts_filter:
            query["timestamp"] = ts_filter

        if search:
            safe = re.escape(search)
            query["$or"] = [
                {"action": {"$regex": safe, "$options": "i"}},
                {"path": {"$regex": safe, "$options": "i"}},
                {"ip": {"$regex": safe, "$options": "i"}},
                {"event_type": {"$regex": safe, "$options": "i"}},
                {"metadata_text": {"$regex": safe, "$options": "i"}}
            ]

        skip = (page - 1) * limit
        total = db.security_logs.count_documents(query)
        logs = list(db.security_logs.find(query).sort("timestamp", -1).skip(skip).limit(limit))

        for item in logs:
            item["id"] = str(item.get("_id"))
            item.pop("_id", None)
            ts = item.get("timestamp")
            if isinstance(ts, datetime):
                item["timestamp"] = ts.isoformat()

            metadata = item.get("metadata") or {}
            request_details = metadata.get("request_details") or {}
            response_details = metadata.get("response_details") or {}
            usage_details = metadata.get("usage") or {}

            request_body = metadata.get("request_body")
            if request_body in (None, ""):
                request_body = request_details or {"note": "No request body captured", "query": item.get("query", {})}

            response_body = metadata.get("response_body")
            if response_body in (None, ""):
                response_body = response_details or {
                    "note": "No response body captured for this log entry",
                    "status_code": item.get("status_code"),
                    "path": item.get("path"),
                    "method": item.get("method"),
                }

            usage = usage_details or {
                "duration_ms": item.get("duration_ms", 0),
                "note": "Usage metrics not captured for this log entry",
            }

            item["request_body"] = request_body
            item["response_body"] = response_body
            item["usage"] = usage

        return jsonify({
            "success": True,
            "logs": logs,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        })
    except Exception as e:
        print(f"Error getting logs: {str(e)}")
        return jsonify({"error": str(e)}), 500


@bp.route("/users", methods=["GET"])
@admin_required
def get_admin_users():
    """Get users with full details, pagination, and search."""
    try:
        page = max(int(request.args.get("page", 1)), 1)
        limit = min(max(int(request.args.get("limit", 25)), 1), 200)
        search = request.args.get("search", "").strip()
        sort_by = request.args.get("sort_by", "created_at").strip()
        sort_order = request.args.get("sort_order", "desc").strip().lower()

        query = {}
        if search:
            safe = re.escape(search)
            query["$or"] = [
                {"email": {"$regex": safe, "$options": "i"}},
                {"username": {"$regex": safe, "$options": "i"}},
                {"name": {"$regex": safe, "$options": "i"}},
                {"wallet_address": {"$regex": safe, "$options": "i"}}
            ]

        direction = DESCENDING if sort_order != "asc" else 1
        skip = (page - 1) * limit

        total = db.users.count_documents(query)
        docs = list(db.users.find(query).sort(sort_by, direction).skip(skip).limit(limit))
        users = [_json_safe(doc) for doc in docs]

        _admin_log("admin_users_view", "fetch_users", status_code=200, metadata={"page": page, "limit": limit, "total": total})
        return jsonify({
            "success": True,
            "users": users,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        })
    except Exception as e:
        print(f"Error fetching users: {str(e)}")
        return jsonify({"error": str(e)}), 500


@bp.route("/database/overview", methods=["GET"])
@admin_required
def get_database_overview():
    """Get all collection names and counts for admin data explorer."""
    try:
        collection_names = db.list_collection_names()
        collections = []
        total_documents = 0

        for name in sorted(collection_names):
            count = db[name].count_documents({})
            collections.append({"name": name, "count": count})
            total_documents += count

        return jsonify({
            "success": True,
            "database": "openlearnx",
            "collections": collections,
            "summary": {
                "collection_count": len(collections),
                "total_documents": total_documents
            }
        })
    except Exception as e:
        print(f"Error fetching database overview: {str(e)}")
        return jsonify({"error": str(e)}), 500


@bp.route("/database/collections/<collection_name>", methods=["GET"])
@admin_required
def get_collection_documents(collection_name):
    """Get documents for any collection with pagination and text filtering."""
    try:
        if collection_name not in db.list_collection_names():
            return jsonify({"error": "Collection not found"}), 404

        page = max(int(request.args.get("page", 1)), 1)
        limit = min(max(int(request.args.get("limit", 25)), 1), 200)
        search = request.args.get("search", "").strip().lower()

        collection = db[collection_name]
        total = collection.count_documents({})

        # Pull a window and filter in-memory for generic full-document search.
        skip = (page - 1) * limit
        raw_docs = list(collection.find({}).sort("_id", DESCENDING).skip(skip).limit(limit * 3))
        docs = [_json_safe(d) for d in raw_docs]

        if search:
            docs = [d for d in docs if search in json.dumps(d, default=str).lower()]

        docs = docs[:limit]

        _admin_log("admin_database_view", "fetch_collection_documents", status_code=200, metadata={
            "collection": collection_name,
            "page": page,
            "limit": limit,
            "search": bool(search)
        })

        return jsonify({
            "success": True,
            "collection": collection_name,
            "documents": docs,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        })
    except Exception as e:
        print(f"Error fetching collection documents: {str(e)}")
        return jsonify({"error": str(e)}), 500


@bp.route("/database/collections/<collection_name>", methods=["POST"])
@admin_required
def create_collection_document(collection_name):
    """Create a document in a selected collection."""
    try:
        data = _safe_json_payload()
        if not isinstance(data, dict) or len(data) == 0:
            return jsonify({"error": "Request body must be a non-empty JSON object"}), 400

        result = db[collection_name].insert_one(data)
        _admin_log("admin_data_create", "create_collection_document", status_code=201, metadata={"collection": collection_name})
        return jsonify({"success": True, "id": str(result.inserted_id)}), 201
    except Exception as e:
        print(f"Error creating collection document: {str(e)}")
        return jsonify({"error": str(e)}), 500


@bp.route("/database/collections/<collection_name>/<doc_id>", methods=["PUT"])
@admin_required
def update_collection_document(collection_name, doc_id):
    """Update a document in selected collection."""
    try:
        oid = _to_object_id(doc_id)
        if not oid:
            return jsonify({"error": "Invalid document id"}), 400

        data = _safe_json_payload()
        if not isinstance(data, dict) or len(data) == 0:
            return jsonify({"error": "Request body must be a non-empty JSON object"}), 400

        result = db[collection_name].update_one({"_id": oid}, {"$set": data})
        if result.matched_count == 0:
            return jsonify({"error": "Document not found"}), 404

        _admin_log("admin_data_update", "update_collection_document", status_code=200, metadata={"collection": collection_name})
        return jsonify({"success": True, "modified": result.modified_count})
    except Exception as e:
        print(f"Error updating collection document: {str(e)}")
        return jsonify({"error": str(e)}), 500


@bp.route("/database/collections/<collection_name>/<doc_id>", methods=["DELETE"])
@admin_required
def delete_collection_document(collection_name, doc_id):
    """Delete a document in selected collection."""
    try:
        oid = _to_object_id(doc_id)
        if not oid:
            return jsonify({"error": "Invalid document id"}), 400

        result = db[collection_name].delete_one({"_id": oid})
        if result.deleted_count == 0:
            return jsonify({"error": "Document not found"}), 404

        _admin_log("admin_data_delete", "delete_collection_document", status_code=200, metadata={"collection": collection_name})
        return jsonify({"success": True})
    except Exception as e:
        print(f"Error deleting collection document: {str(e)}")
        return jsonify({"error": str(e)}), 500


@bp.route("/users", methods=["POST"])
@admin_required
def create_user_admin():
    """Create user from admin panel."""
    try:
        data = _safe_json_payload()
        email = (data.get("email") or "").strip().lower()
        username = (data.get("username") or "").strip()
        role = (data.get("role") or "student").strip().lower()
        password = (data.get("password") or "ChangeMe123!").strip()

        if not email:
            return jsonify({"error": "Email is required"}), 400

        if db.users.find_one({"email": email}):
            return jsonify({"error": "Email already exists"}), 409

        now = datetime.utcnow()
        user_doc = {
            "email": email,
            "username": username or email.split("@")[0],
            "name": data.get("name") or "",
            "wallet_address": data.get("wallet_address") or "",
            "auth_method": data.get("auth_method") or "email",
            "role": role,
            "status": data.get("status") or "active",
            "password_hash": _hash_password(password),
            "login_count": 0,
            "created_at": now,
            "last_login": now,
            "progress": data.get("progress") or {"courses_completed": 0, "quizzes_completed": 0}
        }
        result = db.users.insert_one(user_doc)
        _admin_log("admin_user_create", "create_user", status_code=201, metadata={"user_id": str(result.inserted_id), "email": email})
        return jsonify({"success": True, "id": str(result.inserted_id)}), 201
    except Exception as e:
        print(f"Error creating user from admin: {str(e)}")
        return jsonify({"error": str(e)}), 500


@bp.route("/users/<user_id>", methods=["PUT"])
@admin_required
def update_user_admin(user_id):
    """Update user profile, role and status from admin panel."""
    try:
        oid = _to_object_id(user_id)
        if not oid:
            return jsonify({"error": "Invalid user id"}), 400

        data = _safe_json_payload()
        allowed = ["email", "username", "name", "wallet_address", "role", "status", "auth_method", "progress"]
        update_data = {k: data[k] for k in allowed if k in data}
        if "email" in update_data:
            update_data["email"] = str(update_data["email"]).strip().lower()
        if len(update_data) == 0:
            return jsonify({"error": "No updatable fields provided"}), 400

        result = db.users.update_one({"_id": oid}, {"$set": update_data})
        if result.matched_count == 0:
            return jsonify({"error": "User not found"}), 404

        _admin_log("admin_user_update", "update_user", status_code=200, metadata={"user_id": user_id})
        return jsonify({"success": True, "modified": result.modified_count})
    except Exception as e:
        print(f"Error updating user from admin: {str(e)}")
        return jsonify({"error": str(e)}), 500


@bp.route("/users/<user_id>", methods=["DELETE"])
@admin_required
def delete_user_admin(user_id):
    """Delete user from admin panel."""
    try:
        oid = _to_object_id(user_id)
        if not oid:
            return jsonify({"error": "Invalid user id"}), 400

        result = db.users.delete_one({"_id": oid})
        if result.deleted_count == 0:
            return jsonify({"error": "User not found"}), 404

        _admin_log("admin_user_delete", "delete_user", status_code=200, metadata={"user_id": user_id})
        return jsonify({"success": True})
    except Exception as e:
        print(f"Error deleting user from admin: {str(e)}")
        return jsonify({"error": str(e)}), 500


@bp.route("/users/<user_id>/status", methods=["POST"])
@admin_required
def update_user_status_admin(user_id):
    """Ban/suspend/restrict/activate a user."""
    try:
        oid = _to_object_id(user_id)
        if not oid:
            return jsonify({"error": "Invalid user id"}), 400

        data = _safe_json_payload()
        status = (data.get("status") or "").strip().lower()
        allowed = {"active", "suspended", "banned", "restricted"}
        if status not in allowed:
            return jsonify({"error": "Invalid status"}), 400

        user = db.users.find_one({"_id": oid})
        if not user:
            return jsonify({"error": "User not found"}), 404
        previous_status = str(user.get("status") or "active").lower()

        result = db.users.update_one({"_id": oid}, {"$set": {"status": status}})
        if result.matched_count == 0:
            return jsonify({"error": "User not found"}), 404

        target_user_id = user.get("wallet_address") or str(user.get("_id"))
        log_user_activity(
            db,
            target_user_id,
            "account_status",
            f"Account status changed to {status}",
            f"Admin updated account status from {previous_status} to {status}",
            {
                "previous_status": previous_status,
                "new_status": status,
                "updated_by": "admin",
            },
        )

        _admin_log("admin_user_status", "update_user_status", status_code=200, metadata={"user_id": user_id, "status": status})
        return jsonify({"success": True, "status": status})
    except Exception as e:
        print(f"Error updating user status: {str(e)}")
        return jsonify({"error": str(e)}), 500


@bp.route("/users/<user_id>/role", methods=["POST"])
@admin_required
def update_user_role_admin(user_id):
    """Assign role to a user (student, instructor, admin)."""
    try:
        oid = _to_object_id(user_id)
        if not oid:
            return jsonify({"error": "Invalid user id"}), 400

        data = _safe_json_payload()
        role = (data.get("role") or "").strip().lower()
        allowed = {"student", "instructor", "admin"}
        if role not in allowed:
            return jsonify({"error": "Invalid role"}), 400

        result = db.users.update_one({"_id": oid}, {"$set": {"role": role}})
        if result.matched_count == 0:
            return jsonify({"error": "User not found"}), 404

        _admin_log("admin_user_role", "update_user_role", status_code=200, metadata={"user_id": user_id, "role": role})
        return jsonify({"success": True, "role": role})
    except Exception as e:
        print(f"Error updating user role: {str(e)}")
        return jsonify({"error": str(e)}), 500


@bp.route("/users/<user_id>/reset-password", methods=["POST"])
@admin_required
def reset_user_password_admin(user_id):
    """Reset user password manually from admin panel."""
    try:
        oid = _to_object_id(user_id)
        if not oid:
            return jsonify({"error": "Invalid user id"}), 400

        data = _safe_json_payload()
        new_password = (data.get("new_password") or "TempPass123!").strip()
        if len(new_password) < 6:
            return jsonify({"error": "Password must be at least 6 characters"}), 400

        result = db.users.update_one({"_id": oid}, {"$set": {"password_hash": _hash_password(new_password)}})
        if result.matched_count == 0:
            return jsonify({"error": "User not found"}), 404

        _admin_log("admin_user_password_reset", "reset_user_password", status_code=200, metadata={"user_id": user_id})
        return jsonify({"success": True, "message": "Password reset successfully"})
    except Exception as e:
        print(f"Error resetting user password: {str(e)}")
        return jsonify({"error": str(e)}), 500


@bp.route("/recent-actions", methods=["GET"])
@admin_required
def get_recent_actions():
    """Get recent admin and security actions."""
    try:
        limit = min(max(int(request.args.get("limit", 20)), 1), 200)
        docs = list(db.security_logs.find({}).sort("timestamp", DESCENDING).limit(limit))
        actions = [_json_safe(d) for d in docs]
        for item in actions:
            item["id"] = str(item.get("_id", item.get("id", "")))
            item.pop("_id", None)
        return jsonify({"success": True, "actions": actions})
    except Exception as e:
        print(f"Error getting recent actions: {str(e)}")
        return jsonify({"error": str(e)}), 500


@bp.route("/alerts", methods=["GET"])
@admin_required
def get_security_alerts():
    """Get suspicious activity alerts for admin monitoring."""
    try:
        limit = min(max(int(request.args.get("limit", 50)), 1), 500)
        query = {
            "$or": [
                {"event_type": "suspicious_payload"},
                {"severity": "warning"},
                {"severity": "error"},
                {"status_code": {"$gte": 400}}
            ]
        }
        docs = list(db.security_logs.find(query).sort("timestamp", DESCENDING).limit(limit))
        alerts = [_json_safe(d) for d in docs]
        for item in alerts:
            item["id"] = str(item.get("_id", item.get("id", "")))
            item.pop("_id", None)

        return jsonify({"success": True, "alerts": alerts, "count": len(alerts)})
    except Exception as e:
        print(f"Error getting alerts: {str(e)}")
        return jsonify({"error": str(e)}), 500


@bp.route("/analytics/activity", methods=["GET"])
@admin_required
def get_activity_analytics():
    """Provide graph-ready activity analytics for admin dashboard."""
    try:
        event_pipeline = [
            {"$group": {"_id": "$event_type", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        status_pipeline = [
            {"$group": {"_id": "$status_code", "count": {"$sum": 1}}},
            {"$sort": {"_id": 1}}
        ]
        method_pipeline = [
            {"$group": {"_id": "$method", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]

        events = list(db.security_logs.aggregate(event_pipeline))
        statuses = list(db.security_logs.aggregate(status_pipeline))
        methods = list(db.security_logs.aggregate(method_pipeline))

        return jsonify({
            "success": True,
            "charts": {
                "events": [{"label": str(x.get("_id") or "unknown"), "value": int(x.get("count", 0))} for x in events],
                "status_codes": [{"label": str(x.get("_id") or 0), "value": int(x.get("count", 0))} for x in statuses],
                "methods": [{"label": str(x.get("_id") or "unknown"), "value": int(x.get("count", 0))} for x in methods]
            }
        })
    except Exception as e:
        print(f"Error getting analytics: {str(e)}")
        return jsonify({"error": str(e)}), 500


@bp.route("/reports/usage", methods=["GET"])
@admin_required
def get_usage_report():
    """Usage report for admin panel."""
    try:
        report = {
            "generated_at": datetime.utcnow().isoformat(),
            "users_total": db.users.count_documents({}),
            "users_active": db.users.count_documents({"status": "active"}),
            "students_total": db.users.count_documents({"role": "student"}),
            "instructors_total": db.users.count_documents({"role": "instructor"}),
            "courses_total": db.courses.count_documents({}),
            "modules_total": db.modules.count_documents({}),
            "lessons_total": db.lessons.count_documents({}),
            "logs_total": db.security_logs.count_documents({})
        }
        return jsonify({"success": True, "report": report})
    except Exception as e:
        print(f"Error getting usage report: {str(e)}")
        return jsonify({"error": str(e)}), 500


@bp.route("/reports/security", methods=["GET"])
@admin_required
def get_security_report():
    """Security report including login attempts and suspicious activity."""
    try:
        login_attempts = db.security_logs.count_documents({"event_type": {"$in": ["signin", "signup", "admin_auth_failed", "admin_auth_success"]}})
        suspicious_events = db.security_logs.count_documents({"event_type": "suspicious_payload"})
        error_events = db.security_logs.count_documents({"status_code": {"$gte": 400}})
        blocked_events = db.security_logs.count_documents({"event_type": "firewall_block"})

        top_ip_pipeline = [
            {"$group": {"_id": "$ip", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        top_ips = list(db.security_logs.aggregate(top_ip_pipeline))

        report = {
            "generated_at": datetime.utcnow().isoformat(),
            "login_attempts": login_attempts,
            "suspicious_events": suspicious_events,
            "error_events": error_events,
            "blocked_events": blocked_events,
            "top_ips": [{"ip": str(x.get("_id") or "unknown"), "count": int(x.get("count", 0))} for x in top_ips]
        }
        return jsonify({"success": True, "report": report})
    except Exception as e:
        print(f"Error getting security report: {str(e)}")
        return jsonify({"error": str(e)}), 500


@bp.route("/reports/export", methods=["GET"])
@admin_required
def export_report_data():
    """Export usage/security/log reports as JSON or CSV."""
    try:
        report_type = (request.args.get("type") or "usage").strip().lower()
        export_format = (request.args.get("format") or "json").strip().lower()

        if report_type not in {"usage", "security", "logs"}:
            return jsonify({"error": "Invalid report type"}), 400
        if export_format not in {"json", "csv"}:
            return jsonify({"error": "Invalid export format"}), 400

        if report_type == "usage":
            report = {
                "users_total": db.users.count_documents({}),
                "users_active": db.users.count_documents({"status": "active"}),
                "students_total": db.users.count_documents({"role": "student"}),
                "instructors_total": db.users.count_documents({"role": "instructor"}),
                "courses_total": db.courses.count_documents({}),
                "modules_total": db.modules.count_documents({}),
                "lessons_total": db.lessons.count_documents({}),
                "logs_total": db.security_logs.count_documents({})
            }
        elif report_type == "security":
            report = {
                "login_attempts": db.security_logs.count_documents({"event_type": {"$in": ["signin", "signup", "admin_auth_failed", "admin_auth_success"]}}),
                "suspicious_events": db.security_logs.count_documents({"event_type": "suspicious_payload"}),
                "error_events": db.security_logs.count_documents({"status_code": {"$gte": 400}}),
                "blocked_events": db.security_logs.count_documents({"event_type": "firewall_block"})
            }
        else:
            event_type = request.args.get("event_type", "").strip()
            severity = request.args.get("severity", "").strip()
            status_code = request.args.get("status_code", "").strip()
            search = request.args.get("search", "").strip()
            from_ts = request.args.get("from", "").strip()
            to_ts = request.args.get("to", "").strip()
            limit = min(max(int(request.args.get("limit", 1000)), 1), 10000)

            query = {}
            if event_type:
                query["event_type"] = event_type
            if severity:
                query["severity"] = severity
            if status_code:
                try:
                    query["status_code"] = int(status_code)
                except Exception:
                    pass

            ts_filter = {}
            if from_ts:
                try:
                    ts_filter["$gte"] = datetime.fromisoformat(from_ts)
                except Exception:
                    pass
            if to_ts:
                try:
                    ts_filter["$lte"] = datetime.fromisoformat(to_ts)
                except Exception:
                    pass
            if ts_filter:
                query["timestamp"] = ts_filter

            if search:
                safe = re.escape(search)
                query["$or"] = [
                    {"action": {"$regex": safe, "$options": "i"}},
                    {"path": {"$regex": safe, "$options": "i"}},
                    {"ip": {"$regex": safe, "$options": "i"}},
                    {"event_type": {"$regex": safe, "$options": "i"}},
                    {"metadata_text": {"$regex": safe, "$options": "i"}}
                ]

            docs = list(db.security_logs.find(query).sort("timestamp", DESCENDING).limit(limit))
            logs = []
            for item in docs:
                clean = _json_safe(item)
                clean["id"] = str(clean.get("_id", clean.get("id", "")))
                clean.pop("_id", None)
                logs.append(clean)

            report = {
                "count": len(logs),
                "logs": logs
            }

        payload = {
            "success": True,
            "report_type": report_type,
            "generated_at": datetime.utcnow().isoformat(),
            "data": report
        }

        if export_format == "json":
            return jsonify(payload)

        output = io.StringIO()
        writer = csv.writer(output)

        if report_type == "logs":
            writer.writerow(["timestamp", "event_type", "action", "status_code", "severity", "method", "ip", "path", "user_agent", "metadata"])
            for row in report.get("logs", []):
                writer.writerow([
                    row.get("timestamp", ""),
                    row.get("event_type", ""),
                    row.get("action", ""),
                    row.get("status_code", ""),
                    row.get("severity", ""),
                    row.get("method", ""),
                    row.get("ip", ""),
                    row.get("path", ""),
                    row.get("user_agent", ""),
                    json.dumps(row.get("metadata", {}), ensure_ascii=True),
                ])
        else:
            writer.writerow(["key", "value"])
            for k, v in report.items():
                writer.writerow([k, v])

        return jsonify({"success": True, "report_type": report_type, "format": "csv", "content": output.getvalue()})
    except Exception as e:
        print(f"Error exporting report data: {str(e)}")
        return jsonify({"error": str(e)}), 500


@bp.route("/firewall/rules", methods=["GET"])
@admin_required
def list_firewall_rules():
    """List manually managed firewall rules."""
    try:
        docs = list(db.firewall_rules.find({}).sort("created_at", DESCENDING))
        rules = [_json_safe(d) for d in docs]
        for item in rules:
            item["id"] = str(item.get("_id", item.get("id", "")))
            item.pop("_id", None)
        return jsonify({"success": True, "rules": rules})
    except Exception as e:
        print(f"Error listing firewall rules: {str(e)}")
        return jsonify({"error": str(e)}), 500


@bp.route("/firewall/rules", methods=["POST"])
@admin_required
def create_firewall_rule():
    """Create manual firewall rule (add only when admin requests)."""
    try:
        data = _safe_json_payload()
        rule = {
            "name": (data.get("name") or f"rule-{uuid.uuid4().hex[:8]}").strip(),
            "ip": (data.get("ip") or "").strip(),
            "method": (data.get("method") or "").strip().upper(),
            "path_pattern": (data.get("path_pattern") or "").strip(),
            "action": (data.get("action") or "block").strip().lower(),
            "enabled": bool(data.get("enabled", True)),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        if rule["action"] not in {"block", "allow"}:
            return jsonify({"error": "action must be block or allow"}), 400
        if not rule["ip"] and not rule["path_pattern"]:
            return jsonify({"error": "Provide ip or path_pattern"}), 400

        result = db.firewall_rules.insert_one(rule)
        _admin_log("firewall_rule_create", "create_firewall_rule", status_code=201, metadata={"rule_id": str(result.inserted_id)})
        return jsonify({"success": True, "id": str(result.inserted_id)}), 201
    except Exception as e:
        print(f"Error creating firewall rule: {str(e)}")
        return jsonify({"error": str(e)}), 500


@bp.route("/firewall/rules/<rule_id>", methods=["DELETE"])
@admin_required
def delete_firewall_rule(rule_id):
    """Delete manual firewall rule."""
    try:
        oid = _to_object_id(rule_id)
        if not oid:
            return jsonify({"error": "Invalid rule id"}), 400

        result = db.firewall_rules.delete_one({"_id": oid})
        if result.deleted_count == 0:
            return jsonify({"error": "Rule not found"}), 404

        _admin_log("firewall_rule_delete", "delete_firewall_rule", status_code=200, metadata={"rule_id": rule_id})
        return jsonify({"success": True})
    except Exception as e:
        print(f"Error deleting firewall rule: {str(e)}")
        return jsonify({"error": str(e)}), 500

@bp.route("/courses", methods=["GET"])
@admin_required
def get_admin_courses():
    """Get all courses for admin management"""
    try:
        print("Fetching courses from database...")
        courses = list(db.courses.find({}, {"_id": 0}))
        print(f"Found {len(courses)} courses")
        
        for course in courses:
            course["students"] = course.get("students", 0)
            course["status"] = "published"
            
        return jsonify(courses)
    except Exception as e:
        print(f"Error fetching courses: {str(e)}")
        return jsonify({"error": str(e)}), 500

@bp.route("/courses", methods=["POST"])
@admin_required
def create_course():
    """Create new course"""
    try:
        data = request.json
        print(f"Creating course with data: {data}")
        
        course_id = data.get('id') or f"{data.get('title', '').lower().replace(' ', '-').replace('&', 'and')}-course"
        
        existing_course = db.courses.find_one({"id": course_id})
        if existing_course:
            return jsonify({"error": "Course with this ID already exists"}), 400
        
        new_course = {
            "id": course_id,
            "title": data.get('title'),
            "subject": data.get('subject'),
            "description": data.get('description'),
            "difficulty": data.get('difficulty'),
            "mentor": data.get('mentor', '5t4l1n'),
            "video_url": data.get('video_url'),
            "embed_url": convert_to_embed_url(data.get('video_url')) if data.get('video_url') else None,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "students": 0,
            "progress": 0,
            "modules": []
        }
        
        result = db.courses.insert_one(new_course)
        print(f"Course created with ID: {result.inserted_id}")
        
        # Remove _id field before returning
        new_course_response = serialize_course(new_course)
        
        return jsonify({"success": True, "course": new_course_response}), 201
        
    except Exception as e:
        print(f"Error creating course: {e}")
        return jsonify({"error": str(e)}), 500

@bp.route("/courses/<course_id>", methods=["PUT"])
@admin_required
def update_course(course_id):
    """Update existing course"""
    try:
        data = request.json
        print(f"Updating course {course_id} with data: {data}")
        
        update_data = {
            "title": data.get('title'),
            "subject": data.get('subject'),
            "description": data.get('description'),
            "difficulty": data.get('difficulty'),
            "mentor": data.get('mentor'),
            "video_url": data.get('video_url'),
            "embed_url": convert_to_embed_url(data.get('video_url')) if data.get('video_url') else None,
            "updated_at": datetime.now().isoformat()
        }
        
        # Remove None values
        update_data = {k: v for k, v in update_data.items() if v is not None}
        print(f"Filtered update data: {update_data}")
        
        result = db.courses.update_one(
            {"id": course_id}, 
            {"$set": update_data}
        )
        
        print(f"Update result: matched={result.matched_count}, modified={result.modified_count}")
        
        if result.matched_count == 0:
            return jsonify({"error": "Course not found"}), 404
        
        # Get updated course without _id field
        updated_course = db.courses.find_one({"id": course_id}, {"_id": 0})
        return jsonify({"success": True, "course": updated_course})
        
    except Exception as e:
        print(f"Error updating course: {e}")
        return jsonify({"error": str(e)}), 500

@bp.route("/courses/<course_id>", methods=["DELETE"])
@admin_required
def delete_course(course_id):
    """Delete course and all related modules and lessons"""
    try:
        print(f"Deleting course: {course_id}")
        
        # Delete related lessons first
        lesson_result = db.lessons.delete_many({"course_id": course_id})
        print(f"Deleted {lesson_result.deleted_count} related lessons")
        
        # Delete related modules
        module_result = db.modules.delete_many({"course_id": course_id})
        print(f"Deleted {module_result.deleted_count} related modules")
        
        # Delete the course
        result = db.courses.delete_one({"id": course_id})
        
        if result.deleted_count == 0:
            return jsonify({"error": "Course not found"}), 404
        
        return jsonify({"success": True, "message": "Course deleted successfully"})
        
    except Exception as e:
        print(f"Error deleting course: {e}")
        return jsonify({"error": str(e)}), 500

# ✅ FIXED: Module Management Endpoints (removed duplicates)
@bp.route("/courses/<course_id>/modules", methods=["GET"])
@admin_required
def get_course_modules(course_id):
    """Get all modules for a specific course"""
    try:
        print(f"Fetching modules for course: {course_id}")
        
        modules = list(db.modules.find({"course_id": course_id}).sort("order", 1))
        
        # Convert ObjectId to string
        for module in modules:
            if '_id' in module:
                module['id'] = str(module['_id'])
                del module['_id']
        
        print(f"Found {len(modules)} modules for course {course_id}")
        return jsonify({"success": True, "modules": modules})
        
    except Exception as e:
        print(f"Error fetching modules: {str(e)}")
        return jsonify({"error": str(e)}), 500

@bp.route("/courses/<course_id>/modules", methods=["POST"])
@admin_required
def create_module(course_id):
    """Create a new module for a course"""
    try:
        data = request.json
        print(f"Creating module for course {course_id} with data: {data}")
        
        # Verify course exists
        course = db.courses.find_one({"id": course_id})
        if not course:
            return jsonify({"error": "Course not found"}), 404
        
        module = {
            "course_id": course_id,
            "title": data.get('title'),
            "description": data.get('description', ''),
            "order": data.get('order', 1),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        result = db.modules.insert_one(module)
        module['id'] = str(result.inserted_id)
        if '_id' in module:
            del module['_id']
        
        print(f"Module created with ID: {result.inserted_id}")
        return jsonify({"success": True, "module": module}), 201
        
    except Exception as e:
        print(f"Error creating module: {str(e)}")
        return jsonify({"error": str(e)}), 500

@bp.route("/modules/<module_id>", methods=["GET"])
@admin_required
def get_module(module_id):
    """Get a specific module by ID"""
    try:
        print(f"Fetching module: {module_id}")
        
        module = db.modules.find_one({"_id": ObjectId(module_id)})
        
        if not module:
            return jsonify({"error": "Module not found"}), 404
            
        # Convert ObjectId to string
        if '_id' in module:
            module['id'] = str(module['_id'])
            del module['_id']
        
        return jsonify({"success": True, "module": module})
        
    except Exception as e:
        print(f"Error fetching module: {str(e)}")
        return jsonify({"error": str(e)}), 500

@bp.route("/modules/<module_id>", methods=["PUT"])
@admin_required
def update_module(module_id):
    """Update an existing module"""
    try:
        data = request.json
        print(f"Updating module {module_id} with data: {data}")
        
        update_data = {
            "title": data.get('title'),
            "description": data.get('description'),
            "order": data.get('order'),
            "updated_at": datetime.now().isoformat()
        }
        
        # Remove None values
        update_data = {k: v for k, v in update_data.items() if v is not None}
        
        result = db.modules.update_one(
            {"_id": ObjectId(module_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            return jsonify({"error": "Module not found"}), 404
        
        # Get updated module
        updated_module = db.modules.find_one({"_id": ObjectId(module_id)})
        if updated_module:
            updated_module['id'] = str(updated_module['_id'])
            del updated_module['_id']
        
        return jsonify({"success": True, "module": updated_module})
        
    except Exception as e:
        print(f"Error updating module: {str(e)}")
        return jsonify({"error": str(e)}), 500

@bp.route("/modules/<module_id>", methods=["DELETE"])
@admin_required
def delete_module(module_id):
    """Delete a module and all its lessons"""
    try:
        print(f"Deleting module: {module_id}")
        
        # Delete related lessons first
        lesson_result = db.lessons.delete_many({"module_id": module_id})
        print(f"Deleted {lesson_result.deleted_count} related lessons")
        
        # Delete the module
        result = db.modules.delete_one({"_id": ObjectId(module_id)})
        
        if result.deleted_count == 0:
            return jsonify({"error": "Module not found"}), 404
        
        return jsonify({"success": True, "message": "Module deleted successfully"})
        
    except Exception as e:
        print(f"Error deleting module: {str(e)}")
        return jsonify({"error": str(e)}), 500

# ✅ FIXED: Lesson Management Endpoints
@bp.route("/modules/<module_id>/lessons", methods=["GET"])
@admin_required
def get_module_lessons(module_id):
    """Get all lessons for a specific module"""
    try:
        print(f"Fetching lessons for module: {module_id}")
        
        lessons = list(db.lessons.find({"module_id": module_id}).sort("order", 1))
        
        # Convert ObjectId to string
        for lesson in lessons:
            if '_id' in lesson:
                lesson['id'] = str(lesson['_id'])
                del lesson['_id']
        
        print(f"Found {len(lessons)} lessons for module {module_id}")
        return jsonify({"success": True, "lessons": lessons})
        
    except Exception as e:
        print(f"Error fetching lessons: {str(e)}")
        return jsonify({"error": str(e)}), 500

@bp.route("/modules/<module_id>/lessons", methods=["POST"])
@admin_required
def create_lesson(module_id):
    """Create a new lesson for a module"""
    try:
        data = request.json
        print(f"Creating lesson for module {module_id} with data: {data}")
        
        # Verify module exists
        module = db.modules.find_one({"_id": ObjectId(module_id)})
        if not module:
            return jsonify({"error": "Module not found"}), 404
        
        lesson = {
            "module_id": module_id,
            "course_id": module.get('course_id'),
            "title": data.get('title'),
            "description": data.get('description', ''),
            "video_url": data.get('video_url'),
            "embed_url": convert_to_embed_url(data.get('video_url')) if data.get('video_url') else None,
            "order": data.get('order', 1),
            "duration": data.get('duration'),
            "type": data.get('type', 'video'),
            "content": data.get('content', ''),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        result = db.lessons.insert_one(lesson)
        lesson['id'] = str(result.inserted_id)
        if '_id' in lesson:
            del lesson['_id']
        
        print(f"Lesson created with ID: {result.inserted_id}")
        return jsonify({"success": True, "lesson": lesson}), 201
        
    except Exception as e:
        print(f"Error creating lesson: {str(e)}")
        return jsonify({"error": str(e)}), 500

@bp.route("/lessons/<lesson_id>", methods=["GET"])
@admin_required
def get_lesson(lesson_id):
    """Get a specific lesson by ID"""
    try:
        print(f"Fetching lesson: {lesson_id}")
        
        lesson = db.lessons.find_one({"_id": ObjectId(lesson_id)})
        
        if not lesson:
            return jsonify({"error": "Lesson not found"}), 404
            
        # Convert ObjectId to string
        if '_id' in lesson:
            lesson['id'] = str(lesson['_id'])
            del lesson['_id']
        
        return jsonify({"success": True, "lesson": lesson})
        
    except Exception as e:
        print(f"Error fetching lesson: {str(e)}")
        return jsonify({"error": str(e)}), 500

@bp.route("/lessons/<lesson_id>", methods=["PUT"])
@admin_required
def update_lesson(lesson_id):
    """Update an existing lesson"""
    try:
        data = request.json
        print(f"Updating lesson {lesson_id} with data: {data}")
        
        update_data = {
            "title": data.get('title'),
            "description": data.get('description'),
            "video_url": data.get('video_url'),
            "embed_url": convert_to_embed_url(data.get('video_url')) if data.get('video_url') else None,
            "order": data.get('order'),
            "duration": data.get('duration'),
            "type": data.get('type'),
            "content": data.get('content'),
            "updated_at": datetime.now().isoformat()
        }
        
        # Remove None values
        update_data = {k: v for k, v in update_data.items() if v is not None}
        
        result = db.lessons.update_one(
            {"_id": ObjectId(lesson_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            return jsonify({"error": "Lesson not found"}), 404
        
        # Get updated lesson
        updated_lesson = db.lessons.find_one({"_id": ObjectId(lesson_id)})
        if updated_lesson:
            updated_lesson['id'] = str(updated_lesson['_id'])
            del updated_lesson['_id']
        
        return jsonify({"success": True, "lesson": updated_lesson})
        
    except Exception as e:
        print(f"Error updating lesson: {str(e)}")
        return jsonify({"error": str(e)}), 500

@bp.route("/lessons/<lesson_id>", methods=["DELETE"])
@admin_required
def delete_lesson(lesson_id):
    """Delete a lesson"""
    try:
        print(f"Deleting lesson: {lesson_id}")
        
        result = db.lessons.delete_one({"_id": ObjectId(lesson_id)})
        
        if result.deleted_count == 0:
            return jsonify({"error": "Lesson not found"}), 404
        
        return jsonify({"success": True, "message": "Lesson deleted successfully"})
        
    except Exception as e:
        print(f"Error deleting lesson: {str(e)}")
        return jsonify({"error": str(e)}), 500

# ✅ LEGACY: For backward compatibility with old course structure
@bp.route("/courses/<course_id>/lessons", methods=["POST"])
@admin_required
def add_lesson_legacy(course_id):
    """Add lesson to course (legacy endpoint)"""
    try:
        data = request.json
        
        lesson = {
            "id": data.get('id') or str(uuid.uuid4()),
            "course_id": course_id,
            "title": data.get('title'),
            "type": data.get('type', 'video'),
            "duration": data.get('duration'),
            "description": data.get('description'),
            "content": data.get('content'),
            "video_url": data.get('video_url'),
            "embed_url": convert_to_embed_url(data.get('video_url')) if data.get('video_url') else None,
            "created_at": datetime.now().isoformat()
        }
        
        # Insert lesson
        db.lessons.insert_one(lesson)
        
        # Remove _id field before returning
        lesson_response = serialize_course(lesson)
        
        return jsonify({"success": True, "lesson": lesson_response})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route("/initialize", methods=["POST"])
@admin_required
def initialize_default_courses():
    """Initialize database with default courses"""
    try:
        existing_count = db.courses.count_documents({})
        if existing_count > 0:
            return jsonify({"message": f"Courses already initialized ({existing_count} courses found)"}), 200
        
        default_courses = [
            {
                "id": "python-course",
                "title": "Python Programming Mastery",
                "subject": "Programming",
                "description": "Learn Python from basics to advanced concepts including turtle graphics",
                "difficulty": "Beginner to Advanced",
                "mentor": "5t4l1n",
                "video_url": "https://youtu.be/SsH8GJlqUIg?si=cK7KW_sM0uf95lEp",
                "embed_url": "https://www.youtube.com/embed/SsH8GJlqUIg?rel=0&modestbranding=1",
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "students": 1250,
                "progress": 0,
                "modules": []
            },
            {
                "id": "java-course",
                "title": "Java Development Bootcamp",
                "subject": "Programming",
                "description": "Master Java programming with object-oriented concepts",
                "difficulty": "Intermediate",
                "mentor": "5t4l1n",
                "video_url": "https://youtu.be/SsH8GJlqUIg?si=cK7KW_sM0uf95lEp",
                "embed_url": "https://www.youtube.com/embed/SsH8GJlqUIg?rel=0&modestbranding=1",
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "students": 890,
                "progress": 0,
                "modules": []
            },
            {
                "id": "ethical-hacking-course",
                "title": "Ethical Hacking & Cybersecurity",
                "subject": "Cybersecurity",
                "description": "Learn ethical hacking techniques and penetration testing",
                "difficulty": "Advanced",
                "mentor": "5t4l1n",
                "video_url": "https://youtu.be/cDnX0vyNTaE?si=ZXNI4hv2HlWN7eCS",
                "embed_url": "https://www.youtube.com/embed/cDnX0vyNTaE?rel=0&modestbranding=1",
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "students": 567,
                "progress": 0,
                "modules": []
            },
            {
                "id": "dark-web-hosting-course",
                "title": "Learn Dark Web Hosting",
                "subject": "Cybersecurity",
                "description": "Understanding dark web infrastructure, Tor networks, and secure hosting practices for cybersecurity professionals",
                "difficulty": "Expert",
                "mentor": "5t4l1n",
                "video_url": "https://youtu.be/Z4_USAMVhYs?si=Y_ThVisph5ekM44U",
                "embed_url": "https://www.youtube.com/embed/Z4_USAMVhYs?rel=0&modestbranding=1",
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "students": 234,
                "progress": 0,
                "modules": []
            }
        ]
        
        result = db.courses.insert_many(default_courses)
        print(f"Initialized {len(result.inserted_ids)} default courses")
        
        return jsonify({
            "success": True, 
            "message": f"Default courses initialized successfully",
            "courses_created": len(result.inserted_ids)
        })
    except Exception as e:
        print(f"Error initializing courses: {str(e)}")
        return jsonify({"error": str(e)}), 500

@bp.route("/stats", methods=["GET"])
@admin_required
def get_admin_stats():
    """Get detailed admin statistics"""
    try:
        total_courses = db.courses.count_documents({})
        total_lessons = db.lessons.count_documents({})
        total_modules = db.modules.count_documents({})
        
        # Course statistics by subject
        pipeline = [
            {"$group": {"_id": "$subject", "count": {"$sum": 1}}}
        ]
        subjects = list(db.courses.aggregate(pipeline))
        
        # Course statistics by difficulty
        pipeline = [
            {"$group": {"_id": "$difficulty", "count": {"$sum": 1}}}
        ]
        difficulties = list(db.courses.aggregate(pipeline))
        
        stats = {
            "total_courses": total_courses,
            "total_lessons": total_lessons,
            "total_modules": total_modules,
            "subjects": subjects,
            "difficulties": difficulties,
            "last_updated": datetime.now().isoformat()
        }
        
        return jsonify(stats)
    except Exception as e:
        print(f"Error getting stats: {str(e)}")
        return jsonify({"error": str(e)}), 500

@bp.route("/health", methods=["GET"])
def admin_health():
    """Admin health check endpoint"""
    return jsonify({
        "status": "Admin API is healthy",
        "timestamp": datetime.now().isoformat(),
        "database_connected": True,
        "endpoints": [
            "GET /api/admin/dashboard",
            "GET /api/admin/courses",
            "POST /api/admin/courses",
            "PUT /api/admin/courses/<id>",
            "DELETE /api/admin/courses/<id>",
            "GET /api/admin/courses/<course_id>/modules",
            "POST /api/admin/courses/<course_id>/modules",
            "GET /api/admin/modules/<module_id>",
            "PUT /api/admin/modules/<module_id>",
            "DELETE /api/admin/modules/<module_id>",
            "GET /api/admin/modules/<module_id>/lessons",
            "POST /api/admin/modules/<module_id>/lessons",
            "GET /api/admin/lessons/<lesson_id>",
            "PUT /api/admin/lessons/<lesson_id>",
            "DELETE /api/admin/lessons/<lesson_id>",
            "POST /api/admin/initialize",
            "GET /api/admin/test",
            "GET /api/admin/stats"
        ]
    })
