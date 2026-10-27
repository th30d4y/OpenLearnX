"""
Control-flow test for GHSA-6jh7-q9mf-9p28 fix.
Mocks the crypto layer so no web3/eth_account install needed.
Tests all decision paths in the fixed wallet_login route.
"""
import json, os, sys, secrets
from unittest.mock import MagicMock, patch

# Stub all heavy deps
REAL_ADDRESS = "0xAbCdEf0123456789AbCdEf0123456789AbCdEf01"
ATTACKER_ADDRESS = "0x" + "1" * 40

for mod in ["docker", "tensorflow", "motor", "motor.motor_asyncio", "web3"]:
    sys.modules.setdefault(mod, MagicMock())

# eth_account stub — we'll override per-test
eth_account_mock = MagicMock()
eth_account_messages_mock = MagicMock()
sys.modules["eth_account"] = eth_account_mock
sys.modules["eth_account.messages"] = eth_account_messages_mock

os.environ["JWT_SECRET_KEY"] = secrets.token_hex(32)
os.environ["SECRET_KEY"] = secrets.token_hex(16)
os.environ["ADMIN_TOKEN"] = secrets.token_hex(16)
os.environ["MONGODB_URI"] = "mongodb://localhost:27017/"
os.environ["WEB3_PROVIDER_URL"] = "http://127.0.0.1:8545"

sys.path.insert(0, ".")

mock_db = MagicMock()
mock_db.users.find_one.return_value = None

with patch("pymongo.MongoClient", return_value=MagicMock(openlearnx=mock_db)):
    import main as m
    m.get_db = lambda: mock_db

client = m.app.test_client()

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
    print(f"{mark} {label}  HTTP {resp.status_code} (expected {expect_status})")
    if not ok:
        print(f"       body: {json.dumps(body)[:200]}")
    results.append(ok)

def post(body):
    return client.post("/api/auth/wallet-login",
                       data=json.dumps(body),
                       content_type="application/json")

print("\n" + "="*60)
print("PATH 1: Input validation")
print("="*60)

check("empty body → 400", post({}), 400)
check("missing message → 400",
      post({"address": REAL_ADDRESS, "signature": "0xabc"}), 400)
check("missing signature → 400",
      post({"address": REAL_ADDRESS, "message": "sign me"}), 400)
check("missing address → 400",
      post({"signature": "0xabc", "message": "sign me"}), 400)

print("\n" + "="*60)
print("PATH 2: Crypto exception (invalid/garbage signature)")
print("="*60)

# Simulate eth_account raising an exception (what happens with garbage sig)
def raise_exc(*a, **kw):
    raise ValueError("could not be recovered")

with patch("eth_account.messages.encode_defunct", MagicMock(return_value="hash")):
    with patch("web3.Web3") as mock_w3:
        mock_w3.return_value.eth.account.recover_message.side_effect = raise_exc
        check("crypto raises exception (garbage sig) → 401",
              post({"address": REAL_ADDRESS, "signature": "GARBAGE", "message": "msg"}), 401)

print("\n" + "="*60)
print("PATH 3: Address mismatch (valid sig, different signer)")
print("="*60)

with patch("eth_account.messages.encode_defunct", MagicMock(return_value="hash")):
    with patch("web3.Web3") as mock_w3:
        # Recovered address is ATTACKER, claimed is REAL_ADDRESS
        mock_w3.return_value.eth.account.recover_message.return_value = ATTACKER_ADDRESS
        check("recovered != claimed address → 401",
              post({"address": REAL_ADDRESS, "signature": "0xvalid", "message": "msg"}), 401)

print("\n" + "="*60)
print("PATH 4: Valid signature (recovered == claimed address)")
print("="*60)

with patch("eth_account.messages.encode_defunct", MagicMock(return_value="hash")):
    with patch("web3.Web3") as mock_w3:
        # Recovered address matches claimed address
        mock_w3.return_value.eth.account.recover_message.return_value = REAL_ADDRESS
        check("recovered == claimed address → 200 + JWT",
              post({"address": REAL_ADDRESS, "signature": "0xvalid", "message": "msg"}), 200)

print("\n" + "="*60)
print("PATH 5: Case-insensitive address comparison")
print("="*60)

with patch("eth_account.messages.encode_defunct", MagicMock(return_value="hash")):
    with patch("web3.Web3") as mock_w3:
        # Recovered is checksummed, claimed is lowercase — should still match
        mock_w3.return_value.eth.account.recover_message.return_value = REAL_ADDRESS.upper()
        check("address match is case-insensitive → 200",
              post({"address": REAL_ADDRESS.lower(), "signature": "0xvalid", "message": "msg"}), 200)

print("\n" + "="*60)
passed = sum(results)
total = len(results)
print(f"RESULT: {passed}/{total} passed")
if passed == total:
    print("FIX VERIFIED — all control-flow paths correct")
else:
    print("SOME CHECKS FAILED")
print("="*60)
sys.exit(0 if passed == total else 1)
