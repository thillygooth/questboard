from fastapi import FastAPI, Request, Header, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
import json, os, sqlite3, secrets, hashlib
from datetime import datetime, timezone

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_DATA_DIR   = os.environ.get("QUESTBOARD_DATA", "/data")
DB_FILE     = os.path.join(_DATA_DIR, "questboard.db")
# Legacy single-tenant files, only read once for migration into an account.
STATE_FILE  = os.path.join(_DATA_DIR, "state.json")
CONFIG_FILE = os.path.join(_DATA_DIR, "config.json")


def _now():
    return datetime.now(timezone.utc).isoformat()


def get_db():
    os.makedirs(_DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def _hash_pin(pin, salt):
    return hashlib.pbkdf2_hmac("sha256", str(pin).encode(), bytes.fromhex(salt), 100_000).hex()


def _read_json(path):
    if os.path.exists(path):
        try:
            with open(path) as f:
                return json.load(f)
        except Exception:
            pass
    return None


def _extract_token(authorization):
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip()
    return None


def init_db():
    conn = get_db()
    conn.execute(
        """CREATE TABLE IF NOT EXISTS accounts (
            id         TEXT PRIMARY KEY,
            name       TEXT NOT NULL,
            pin_hash   TEXT,
            pin_salt   TEXT,
            config     TEXT,
            state      TEXT,
            created_at TEXT
        )"""
    )
    conn.execute(
        """CREATE TABLE IF NOT EXISTS sessions (
            token      TEXT PRIMARY KEY,
            account_id TEXT NOT NULL,
            created_at TEXT
        )"""
    )
    conn.commit()
    _migrate_legacy(conn)
    conn.close()


def _migrate_legacy(conn):
    """If there are no accounts yet but legacy JSON files exist, fold them into
    a single account so an existing deployment doesn't lose its data."""
    if conn.execute("SELECT COUNT(*) AS c FROM accounts").fetchone()["c"]:
        return
    old_config = _read_json(CONFIG_FILE)
    old_state = _read_json(STATE_FILE)
    if old_config is None and old_state is None:
        return
    name = "My Family"
    if isinstance(old_config, dict):
        name = old_config.get("familyName") or old_config.get("boardName") or name
    conn.execute(
        "INSERT INTO accounts (id, name, pin_hash, pin_salt, config, state, created_at) "
        "VALUES (?,?,?,?,?,?,?)",
        (
            secrets.token_urlsafe(8),
            name,
            None,
            None,
            json.dumps(old_config) if old_config is not None else None,
            json.dumps(old_state) if old_state is not None else None,
            _now(),
        ),
    )
    conn.commit()


init_db()


def current_account(authorization: str = Header(None)):
    token = _extract_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Missing token")
    conn = get_db()
    row = conn.execute(
        "SELECT a.* FROM sessions s JOIN accounts a ON a.id = s.account_id WHERE s.token = ?",
        (token,),
    ).fetchone()
    conn.close()
    if row is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    return row


# ---- Account / session endpoints -------------------------------------------


@app.get("/accounts")
def list_accounts():
    conn = get_db()
    rows = conn.execute(
        "SELECT id, name, pin_hash FROM accounts ORDER BY created_at"
    ).fetchall()
    conn.close()
    return [
        {"id": r["id"], "name": r["name"], "has_pin": r["pin_hash"] is not None}
        for r in rows
    ]


@app.post("/accounts")
async def create_account(request: Request):
    data = await request.json()
    name = (data.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name required")
    pin = data.get("pin")
    pin_hash = pin_salt = None
    if pin:
        pin_salt = secrets.token_hex(16)
        pin_hash = _hash_pin(pin, pin_salt)
    account_id = secrets.token_urlsafe(8)
    token = secrets.token_urlsafe(24)
    conn = get_db()
    conn.execute(
        "INSERT INTO accounts (id, name, pin_hash, pin_salt, config, state, created_at) "
        "VALUES (?,?,?,?,?,?,?)",
        (account_id, name, pin_hash, pin_salt, None, None, _now()),
    )
    conn.execute(
        "INSERT INTO sessions (token, account_id, created_at) VALUES (?,?,?)",
        (token, account_id, _now()),
    )
    conn.commit()
    conn.close()
    return {"id": account_id, "token": token}


@app.post("/accounts/{account_id}/login")
async def login(account_id: str, request: Request):
    try:
        data = await request.json()
    except Exception:
        data = {}
    pin = data.get("pin")
    conn = get_db()
    acc = conn.execute("SELECT * FROM accounts WHERE id = ?", (account_id,)).fetchone()
    if acc is None:
        conn.close()
        raise HTTPException(status_code=404, detail="No such account")
    if acc["pin_hash"]:
        if not pin or _hash_pin(pin, acc["pin_salt"]) != acc["pin_hash"]:
            conn.close()
            raise HTTPException(status_code=401, detail="Incorrect PIN")
    token = secrets.token_urlsafe(24)
    conn.execute(
        "INSERT INTO sessions (token, account_id, created_at) VALUES (?,?,?)",
        (token, account_id, _now()),
    )
    conn.commit()
    conn.close()
    return {"token": token}


@app.get("/account")
def get_account(account=Depends(current_account)):
    return {
        "id": account["id"],
        "name": account["name"],
        "has_pin": account["pin_hash"] is not None,
    }


@app.post("/account")
async def update_account(request: Request, account=Depends(current_account)):
    data = await request.json()
    name = (data.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name required")
    conn = get_db()
    conn.execute("UPDATE accounts SET name = ? WHERE id = ?", (name, account["id"]))
    conn.commit()
    conn.close()
    return {"ok": True, "name": name}


@app.delete("/account")
def delete_account(account=Depends(current_account)):
    conn = get_db()
    conn.execute("DELETE FROM sessions WHERE account_id = ?", (account["id"],))
    conn.execute("DELETE FROM accounts WHERE id = ?", (account["id"],))
    conn.commit()
    conn.close()
    return {"ok": True}


@app.post("/logout")
def logout(authorization: str = Header(None)):
    token = _extract_token(authorization)
    if token:
        conn = get_db()
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
        conn.commit()
        conn.close()
    return {"ok": True}


# ---- Data endpoints (scoped to the caller's account) -----------------------


@app.get("/config")
def get_config(account=Depends(current_account)):
    if account["config"] is None:
        return {"needs_setup": True}
    return json.loads(account["config"])


@app.post("/config")
async def post_config(request: Request, account=Depends(current_account)):
    data = await request.json()
    conn = get_db()
    conn.execute(
        "UPDATE accounts SET config = ? WHERE id = ?",
        (json.dumps(data), account["id"]),
    )
    conn.commit()
    conn.close()
    return {"ok": True}


@app.get("/state")
def get_state(account=Depends(current_account)):
    if account["state"] is None:
        return {}
    return json.loads(account["state"])


@app.post("/state")
async def post_state(request: Request, account=Depends(current_account)):
    data = await request.json()
    conn = get_db()
    conn.execute(
        "UPDATE accounts SET state = ? WHERE id = ?",
        (json.dumps(data), account["id"]),
    )
    conn.commit()
    conn.close()
    return {"ok": True}
