"""
Validator bypass test suite for GHSA-rw3v-xxwg-3p4g.
Tests _validate_code_static in isolation — no docker required.
"""
import ast
import re
import sys
import types as _types
from typing import Any, Dict, List, Optional, Tuple

# ── Minimal stub so the file can be imported without docker/tensorflow ──────
import unittest.mock as _mock
sys.modules.setdefault("docker", _mock.MagicMock())
sys.modules.setdefault("tensorflow", _mock.MagicMock())

sys.path.insert(0, ".")

# Patch docker before import
import unittest.mock
with unittest.mock.patch.dict("sys.modules", {"docker": unittest.mock.MagicMock()}):
    try:
        from services.real_compiler_service import RealCompilerService
        svc = RealCompilerService()
        print("✅ RealCompilerService imported OK")
    except Exception as e:
        print(f"⚠️  Import failed ({e}), running with inline copy of validator logic")
        svc = None

# ── If import failed, replicate the validator inline ─────────────────────────
if svc is None:
    # Inline copy — kept in sync with the real file for test purposes
    exec(open("services/real_compiler_service.py").read().split("def _validate_code_static")[1])

PASS = "✅ BLOCKED"
FAIL = "❌ BYPASSED"

def check(label: str, code: str, lang: str = "python", expect_blocked: bool = True):
    ok, violations = svc._validate_code_static(code, lang)
    blocked = not ok
    status = PASS if (blocked == expect_blocked) else FAIL
    viol_str = f"  [{'; '.join(violations[:3])}]" if violations else ""
    print(f"{status}  {label}{viol_str}")
    return blocked == expect_blocked

results = []

print("\n" + "="*70)
print("CATEGORY 1: Original reported bypass")
print("="*70)
results.append(check("__builtins__.__dict__['__import__'] indirection",
    "imp = __builtins__.__dict__['__import__']\nsp = imp('subprocess')\nprint(sp.run(['id'],capture_output=True,text=True).stdout)"))

print("\n" + "="*70)
print("CATEGORY 2: Unblocked import modules")
print("="*70)
results.append(check("import sys",
    "import sys\nsys.modules['subprocess'].run(['id'])"))
results.append(check("import importlib",
    "import importlib\nimportlib.import_module('subprocess').run(['id'])"))
results.append(check("import builtins",
    "import builtins\nbuiltins.__import__('subprocess').run(['id'])"))
results.append(check("import io",
    "import io\nprint(io.open('/etc/passwd').read())"))
results.append(check("import pickle",
    "import pickle, os\npickle.loads(b'...')"))
results.append(check("import marshal",
    "import marshal, types\ncode = marshal.loads(b'...')\ntypes.FunctionType(code, {})()"))
results.append(check("import inspect",
    "import inspect\nprint(inspect.getmodule(print).__import__('subprocess'))"))
results.append(check("import gc",
    "import gc\nfor o in gc.get_objects():\n    pass"))
results.append(check("import types",
    "import types\ntypes.FunctionType(compile('pass','<s>','exec'),{})()"))
results.append(check("import base64",
    "import base64, importlib\nim = importlib.import_module(base64.b64decode('c3VicHJvY2Vzcw==').decode())\nim.run(['id'])"))
results.append(check("import platform",
    "import platform\nplatform.popen('id').read()"))
results.append(check("import codecs",
    "import codecs\nprint(codecs.decode('736563726574','hex'))"))
results.append(check("import zipimport",
    "import zipimport\nzi = zipimport.zipimporter('/tmp/x.zip')\nzi.load_module('evil')"))

print("\n" + "="*70)
print("CATEGORY 3: Attribute-style __import__ access")
print("="*70)
results.append(check("builtins.__import__ via attr (no import)",
    "(lambda:None).__globals__['__builtins__'].__import__('subprocess')"))
results.append(check("__import__ as attribute call",
    "import builtins\nbuiltins.__import__('subprocess').run(['id'])"))

print("\n" + "="*70)
print("CATEGORY 4: Class hierarchy traversal")
print("="*70)
results.append(check("__subclasses__ traversal to Popen",
    "[c for c in [].__class__.__base__.__subclasses__() if 'Popen' in c.__name__][0](['id'],stdout=-1).communicate()"))
results.append(check("object.__subclasses__()",
    "object.__subclasses__()"))
results.append(check("type.__subclasses__(type)",
    "x = type.__subclasses__(type)"))
results.append(check("__bases__ access",
    "x = [].__class__.__bases__"))
results.append(check("__mro__ access",
    "x = [].__class__.__mro__"))

print("\n" + "="*70)
print("CATEGORY 5: Function globals / introspection")
print("="*70)
results.append(check("(lambda:None).__globals__",
    "g = (lambda:None).__globals__"))
results.append(check("__globals__['__builtins__']",
    "g = (lambda:None).__globals__['__builtins__']"))
results.append(check("__code__ access",
    "f = lambda: None\nprint(f.__code__)"))
results.append(check("__globals__ via named function",
    "def f(): pass\ng = f.__globals__"))

print("\n" + "="*70)
print("CATEGORY 6: __loader__ / __spec__ builtins")
print("="*70)
results.append(check("__loader__ as bare name",
    "__loader__.load_module('subprocess')"))
results.append(check("__spec__ as bare name",
    "__spec__.loader.exec_module(None)"))
results.append(check("load_module attribute",
    "__loader__.load_module('subprocess')"))

print("\n" + "="*70)
print("CATEGORY 7: String obfuscation / concatenation")
print("="*70)
results.append(check("string concat module name + importlib",
    "import importlib\nm = 'sub'+'process'\nimportlib.import_module(m)"))
results.append(check("chr() module name (needs eval - should be blocked)",
    "eval('imp'+'ort subprocess')"))
results.append(check("string concat key bypass (residual - known limitation)",
    "key = '__imp'+'ort__'\ng = (lambda:None).__globals__['__builtins__'][key]('subprocess')"))

print("\n" + "="*70)
print("CATEGORY 8: operator / functools indirect attribute access")
print("="*70)
results.append(check("operator.attrgetter to get __globals__",
    "import operator\nf = lambda: None\ng = operator.attrgetter('__globals__')(f)"))
results.append(check("operator.attrgetter obfuscated key",
    "import operator\nf = lambda: None\nk = '__global'+'s__'\ng = operator.attrgetter(k)(f)"))
results.append(check("functools.reduce for attribute chain",
    "import functools\nfunctools.reduce(getattr, ['__globals__'], lambda: None)"))

print("\n" + "="*70)
print("CATEGORY 10: Other vectors")
print("="*70)
results.append(check("breakpoint()",
    "breakpoint()"))
results.append(check("hasattr probing",
    "hasattr([].__class__.__base__, '__subclasses__')"))
results.append(check("exec(bytes(...))",
    "exec(bytes([105,109,112,111,114,116,32,111,115]))"))
results.append(check("vars() bypass",
    "v = vars(__builtins__)"))
results.append(check("getattr to get __import__",
    "getattr(__builtins__, '__import__')('subprocess')"))
results.append(check("__dict__ attribute access",
    "x = {}.__class__.__dict__"))
results.append(check("input() — should be allowed",
    "x = input('enter: ')", expect_blocked=False))
results.append(check("print() — should be allowed",
    "print('hello world')", expect_blocked=False))
results.append(check("normal algorithm — should be allowed",
    "def fib(n):\n    a,b=0,1\n    for _ in range(n):\n        a,b=b,a+b\n    return a\nprint(fib(10))", expect_blocked=False))
results.append(check("list comprehension — should be allowed",
    "result = [x**2 for x in range(100)]\nprint(sum(result))", expect_blocked=False))

print("\n" + "="*70)
passed = sum(results)
total = len(results)
print(f"RESULT: {passed}/{total} passed")
if passed < total:
    print("❌ Some bypasses remain — fix needed")
else:
    print("✅ All checks passed")
print("="*70)
