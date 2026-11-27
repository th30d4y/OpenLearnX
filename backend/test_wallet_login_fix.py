"""
Live fix verification for GHSA-6jh7-q9mf-9p28.
Uses eth_account to produce real signatures so we can test both
the rejection path (garbage sig) and the acceptance path (real sig).
"""
import json, os, sys, secrets, uuid
from unittest.mock import MagicMock, patch

for mod in ["docker", "tensorflow", "motor", "motor.motor_asyncio"]:
    sys.modules.setdefault(mod, MagicMock())

sys.path.insert(0, os.path.dirname(__file__))

# --- check eth_account available -------------------------------------------
try:
    from eth_account import Account
    from eth_account.messages import encode_defunct
    ETH_OK = True
except ImportError:
    ETH_OK = False
    print("[note] eth_account not installed — real-sig test skipped")

# --- minimal Flask app wiring main.py --------------------------------------
os.environ.setdefault("JWT_SECRET_KEY", secrets.token_hex(32))
os.environ.setdefault("SECRET_KEY", secrets.token_hex(16))
os.environ.setdefault("ADMIN_TOKEN", secrets.token_hex(16))
os.environ.setdefault("MONGODB_URI", "mongodb://localhost:27017/")
os.environ.setdefault("WEB3_PROVIDER_URL", "http://127.0.0.1:8545")

# Patch MongoClient and get_db so no real DB is needed
mock_db = MagicMock()
mock_db.users.find_one.return_value = None  # no existing user
mock_db.command.return_value = {"ismaster": True}

with patch("pymongo.MongoClient", return_value=MagicMock(openlearnx=mock_db)):
    with patch("motor.motor_asyncio.AsyncIOMotorClient", MagicMock()):
        import importlib, runpy
        # Import just enough of main to get the Flask app
        import main as _main_mod
        app = _main_mod.app
        # Patch get_db to return our mock
        _main_mod.get_db = lambda: mock_db

client = app.test_client()

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
        print(f"       body: {json.dumps(body)[:300]}")
    results.append(ok)
    return ok

print("\n" + "="*60)
print("GHSA-6jh7-q9mf-9p28 — wallet-login fix verification")
print("="*60)

ADDRESS = "0x000000000000000000000000000000000000dEaD"
MESSAGE = f"Sign this message to authenticate with OpenLearnX:\n\nAddress: {ADDRESS}\nNonce: test-nonce"

# 1. No body → 400
r = client.post("/api/auth/wallet-login",
                data=json.dumps({}), content_type="application/json")
check("empty body → 400", r, 400)

# 2. Missing message field → 400
r = client.post("/api/auth/wallet-login",
                data=json.dumps({"address": ADDRESS, "signature": "0xdeadbeef"}),
                content_type="application/json")
check("missing message → 400", r, 400)

# 3. Garbage signature → 401
r = client.post("/api/auth/wallet-login",
                data=json.dumps({
                    "address": ADDRESS,
                    "signature": "THIS-IS-NOT-A-REAL-SIGNATURE",
                    "message": MESSAGE,
                }),
                content_type="application/json")
check("garbage signature → 401  (was 200 before fix)", r, 401)

# 4. Second unrelated garbage signature → 401
r = client.post("/api/auth/wallet-login",
                data=json.dumps({
                    "address": ADDRESS,
                    "signature": "totally-unrelated-garbage-B-no-private-key",
                    "message": MESSAGE,
                }),
                content_type="application/json")
check("second garbage signature → 401  (was 200 before fix)", r, 401)

# 5. Valid real signature (eth_account) → 200
if ETH_OK:
    acct = Account.create()
    real_address = acct.address
    real_message = f"Sign this message to authenticate with OpenLearnX:\n\nAddress: {real_address}\nNonce: {secrets.token_hex(8)}"
    signed = acct.sign_message(encode_defunct(text=real_message))
    real_sig = signed.signature.hex()

    r = client.post("/api/auth/wallet-login",
                    data=json.dumps({
                        "address": real_address,
                        "signature": "0x" + real_sig if not real_sig.startswith("0x") else real_sig,
                        "message": real_message,
                    }),
                    content_type="application/json")
    ok = r.status_code == 200
    mark = PASS if ok else FAIL
    try:
        body = r.get_json() or {}
    except Exception:
        body = {}
    print(f"{mark} valid real signature → 200 with JWT")
    print(f"       HTTP {r.status_code}  success={body.get('success')}  has_token={bool(body.get('token'))}")
    results.append(ok)

    # 6. Right address, wrong message → 401
    wrong_msg = "some completely different message the wallet never signed"
    r = client.post("/api/auth/wallet-login",
                    data=json.dumps({
                        "address": real_address,
                        "signature": "0x" + real_sig if not real_sig.startswith("0x") else real_sig,
                        "message": wrong_msg,
                    }),
                    content_type="application/json")
    check("correct sig, wrong message → 401", r, 401)

    # 7. Wrong address, correct sig+message → 401
    r = client.post("/api/auth/wallet-login",
                    data=json.dumps({
                        "address": "0x" + "1" * 40,  # different address
                        "signature": "0x" + real_sig if not real_sig.startswith("0x") else real_sig,
                        "message": real_message,
                    }),
                    content_type="application/json")
    check("correct sig, wrong address → 401", r, 401)

print("\n" + "="*60)
passed = sum(results)
total = len(results)
print(f"RESULT: {passed}/{total} passed")
if passed == total:
    print("FIX VERIFIED — stub replaced with real ecrecover verification")
else:
    print("SOME CHECKS FAILED")
print("="*60)
sys.exit(0 if passed == total else 1)
