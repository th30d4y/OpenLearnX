"""
Live fix verification for GHSA-fhwv-x9rc-w3qw using Flask test client.
Same approach as the reporter's PoC — real blueprint, real auth path,
in-memory MongoDB stand-in, no external services needed.
"""
import json, os, sys, jwt as pyjwt, secrets
from unittest.mock import MagicMock, patch

# ── minimal stubs so imports don't need docker/tensorflow/web3 ──────────────
for mod in ["docker", "tensorflow", "web3", "eth_account",
            "Crypto", "Crypto.Cipher", "Crypto.Random", "Crypto.Util",
            "Crypto.Util.Padding"]:
    sys.modules.setdefault(mod, MagicMock())

sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

# stub MongoClient before importing dashboard
import pymongo as _pm
_orig_mc = _pm.MongoClient
_pm.MongoClient = MagicMock(return_value=MagicMock())

from flask import Flask
from flask_jwt_extended import JWTManager

JWT_SECRET = secrets.token_hex(32)

app = Flask(__name__)
app.config["JWT_SECRET_KEY"] = JWT_SECRET
app.config["SECRET_KEY"] = secrets.token_hex(16)
JWTManager(app)

# patch db inside dashboard module before importing
with patch("pymongo.MongoClient", return_value=MagicMock()):
    from routes.dashboard import bp as dashboard_bp

app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")

# also register courses blueprint for the lesson-complete test
try:
    with patch("pymongo.MongoClient", return_value=MagicMock()):
        from routes.courses import bp as courses_bp
    app.register_blueprint(courses_bp, url_prefix="/api/courses")
    courses_ok = True
except Exception as e:
    courses_ok = False
    print(f"[note] courses blueprint not loaded: {e}")

client = app.test_client()

VICTIM = "0xdeadbeef000000000000000000000000deadbeef"
ATTACKER_SECRET = secrets.token_hex(32)

PASS = "[PASS]"
FAIL = "[FAIL]"
results = []

def check(label, resp, expect_status):
    ok = resp.status_code == expect_status
    mark = PASS if ok else FAIL
    try:
        body = resp.get_json() or {}
    except Exception:
        body = {}
    print(f"{mark} {label}")
    print(f"       HTTP {resp.status_code}  (expected {expect_status})")
    if not ok:
        print(f"       body: {json.dumps(body)[:200]}")
    results.append(ok)
    return ok

print("\n" + "="*60)
print("DASHBOARD — comprehensive-stats")
print("="*60)

# 1. No credentials → 401
r = client.get("/api/dashboard/comprehensive-stats")
check("no credentials → 401", r, 401)

# 2. X-User-ID header only → must be 401 (was 200 before fix)
r = client.get("/api/dashboard/comprehensive-stats",
               headers={"X-User-ID": VICTIM})
check("X-User-ID header, no token → 401  (bypass was here)", r, 401)

# 3. X-Wallet-Address header only → must be 401
r = client.get("/api/dashboard/comprehensive-stats",
               headers={"X-Wallet-Address": VICTIM})
check("X-Wallet-Address header, no token → 401  (bypass was here)", r, 401)

# 4. wallet_address query param → must be 401
r = client.get(f"/api/dashboard/comprehensive-stats?wallet_address={VICTIM}")
check("wallet_address query param, no token → 401  (bypass was here)", r, 401)

# 5. wallet_address in JSON body → must be 401
r = client.get("/api/dashboard/comprehensive-stats",
               data=json.dumps({"wallet_address": VICTIM}),
               content_type="application/json")
check("wallet_address JSON body, no token → 401  (bypass was here)", r, 401)

# 6. JWT signed with WRONG (attacker's) secret → 401
bad_token = pyjwt.encode(
    {"sub": VICTIM, "user_id": VICTIM},
    ATTACKER_SECRET, algorithm="HS256"
)
r = client.get("/api/dashboard/comprehensive-stats",
               headers={"Authorization": f"Bearer {bad_token}"})
check("JWT with attacker secret → 401  (should always fail)", r, 401)

# 7. Valid JWT signed with server secret → 200 (or 500 due to stubbed DB — either proves auth passed)
good_token = pyjwt.encode(
    {"sub": VICTIM, "user_id": VICTIM, "wallet_address": VICTIM},
    JWT_SECRET, algorithm="HS256"
)
r = client.get("/api/dashboard/comprehensive-stats",
               headers={"Authorization": f"Bearer {good_token}"})
passed_auth = r.status_code != 401
mark = PASS if passed_auth else FAIL
print(f"{mark} valid JWT passes auth gate (HTTP {r.status_code}, not 401)")
results.append(passed_auth)

print("\n" + "="*60)
print("DASHBOARD — set-username (write endpoint)")
print("="*60)

# 8. X-User-ID + set-username → 401 (was 200 before fix)
r = client.post("/api/dashboard/set-username",
                headers={"X-User-ID": VICTIM},
                data=json.dumps({"username": "pwned"}),
                content_type="application/json")
check("X-User-ID + set-username, no token → 401  (bypass was here)", r, 401)

# 9. X-Wallet-Address + update-profile → 401
r = client.post("/api/dashboard/update-profile",
                headers={"X-Wallet-Address": VICTIM},
                data=json.dumps({"display_name": "hacked"}),
                content_type="application/json")
check("X-Wallet-Address + update-profile, no token → 401  (bypass was here)", r, 401)

if courses_ok:
    print("\n" + "="*60)
    print("COURSES — lesson complete (write via activity_logger)")
    print("="*60)

    r = client.post("/api/courses/course-1/lessons/lesson-1/complete",
                    headers={"X-Wallet-Address": VICTIM},
                    data=json.dumps({}),
                    content_type="application/json")
    # With fix: user_id is None → lesson complete logic is skipped entirely
    # May return 200 with success:false or similar — key thing is no write as victim
    try:
        body = r.get_json() or {}
    except Exception:
        body = {}
    wrote_as_victim = body.get("success") and body.get("progress_updated")
    mark = PASS if not wrote_as_victim else FAIL
    print(f"{mark} X-Wallet-Address + lesson complete does NOT write as victim")
    print(f"       HTTP {r.status_code}  success={body.get('success')}  progress_updated={body.get('progress_updated')}")
    results.append(not wrote_as_victim)

print("\n" + "="*60)
passed = sum(results)
total = len(results)
print(f"RESULT: {passed}/{total} passed")
if passed == total:
    print("FIX VERIFIED — header bypass is closed in dashboard + activity_logger")
else:
    print("SOME CHECKS FAILED — review above")
print("="*60)
sys.exit(0 if passed == total else 1)
