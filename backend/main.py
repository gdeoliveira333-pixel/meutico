import os
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from contextlib import asynccontextmanager

from database import create_tables, get_db, FileRecord
from services.connector import add_root, remove_root, list_roots
from services.scanner import scan_all_roots, scan_root, start_watcher, stop_watcher
from services.connector import list_roots as _list_roots
from services.duplicate_engine import find_duplicates
from services.executor import prepare, commit, rollback, get_audit_log
from services.recommendation_engine import generate_recommendations
from services.agent_flow import run_agent
from services.scheduler import add_schedule, remove_schedule, list_schedules
from services import cloud_drive
from services.auth import verify_login, create_token, verify_token
from fastapi import Request
from fastapi.responses import JSONResponse


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    db = next(get_db())
    start_watcher(db)
    yield
    stop_watcher()


app = FastAPI(
    title="Meu Tico — AI File Manager",
    description="Agente de gerenciamento de arquivos com segurança sistêmica.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "file://", "null", "https://meutico.vercel.app", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PUBLIC_PATHS = {"/health", "/auth/login"}

@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    if request.url.path in PUBLIC_PATHS or request.url.path.startswith("/cloud/callback"):
        return await call_next(request)
    token = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
    if not token or not verify_token(token):
        return JSONResponse(status_code=401, content={"detail": "Não autorizado."})
    return await call_next(request)

@app.post("/auth/login")
def login(body: dict):
    username = body.get("username", "")
    password = body.get("password", "")
    if not verify_login(username, password):
        raise HTTPException(status_code=401, detail="Usuário ou senha incorretos.")
    return {"token": create_token(username), "username": username}


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/pick-folder")
def pick_folder():
    """Abre o seletor de pasta nativo do Windows e retorna o caminho escolhido."""
    import tkinter as tk
    from tkinter import filedialog
    root = tk.Tk()
    root.withdraw()
    root.wm_attributes('-topmost', True)
    path = filedialog.askdirectory(title="Selecionar pasta — Meu Tico")
    root.destroy()
    if not path:
        raise HTTPException(status_code=204, detail="Nenhuma pasta selecionada.")
    # tkinter retorna com / no Windows, normaliza para \
    import os
    return {"path": os.path.normpath(path)}


@app.get("/browse")
def browse_dirs(path: str = ""):
    """Lista subdiretórios de um caminho para o folder browser do frontend."""
    import os, string
    if not path:
        # Raízes do sistema (drives no Windows)
        drives = [f"{d}:\\" for d in string.ascii_uppercase if os.path.exists(f"{d}:\\")]
        return {"current": "", "parent": None, "dirs": [{"name": d, "path": d} for d in drives]}
    if not os.path.isdir(path):
        raise HTTPException(status_code=400, detail="Caminho inválido.")
    try:
        entries = [
            {"name": e, "path": os.path.join(path, e)}
            for e in sorted(os.listdir(path))
            if os.path.isdir(os.path.join(path, e)) and not e.startswith('.')
        ]
    except PermissionError:
        entries = []
    parent = str(Path(path).parent) if Path(path).parent != Path(path) else None
    return {"current": path, "parent": parent, "dirs": entries}


@app.get("/health")
def health():
    return {"status": "ok", "version": "0.1.0"}


# ── Connector / Roots ─────────────────────────────────────────────────────────

class AddRootRequest(BaseModel):
    path: str
    label: str | None = None


@app.get("/roots")
def get_roots(db: Session = Depends(get_db)):
    roots = list_roots(db)
    return [
        {"id": r.id, "path": r.path, "label": r.label, "added_at": r.added_at}
        for r in roots
    ]


@app.post("/roots", status_code=201)
def post_root(body: AddRootRequest, db: Session = Depends(get_db)):
    try:
        root = add_root(db, body.path, body.label)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    return {"id": root.id, "path": root.path, "label": root.label}


@app.delete("/roots/{root_id}", status_code=204)
def delete_root(root_id: int, db: Session = Depends(get_db)):
    removed = remove_root(db, root_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Root não encontrado.")


# ── Scanner ───────────────────────────────────────────────────────────────────

@app.post("/scan")
def trigger_scan_all(db: Session = Depends(get_db)):
    """Dispara varredura completa em todos os roots autorizados."""
    results = scan_all_roots(db)
    if not results:
        raise HTTPException(status_code=400, detail="Nenhum root autorizado cadastrado.")
    return {"results": results}


@app.post("/scan/{root_id}")
def trigger_scan_root(root_id: int, db: Session = Depends(get_db)):
    """Dispara varredura em um root específico."""
    roots = _list_roots(db)
    root = next((r for r in roots if r.id == root_id), None)
    if not root:
        raise HTTPException(status_code=404, detail="Root não encontrado.")
    result = scan_root(root, db)
    return result


@app.post("/duplicates")
def detect_duplicates(db: Session = Depends(get_db)):
    """Analisa o manifesto e marca arquivos duplicados."""
    return find_duplicates(db)


@app.post("/execute/prepare")
def execute_prepare(body: dict, db: Session = Depends(get_db)):
    """Fase 1 — valida o plano sem mover nada."""
    file_ids = body.get("file_ids", [])
    if not file_ids:
        raise HTTPException(status_code=400, detail="Informe ao menos um file_id.")
    return prepare(file_ids, db)


@app.post("/execute/commit")
def execute_commit(body: dict, db: Session = Depends(get_db)):
    """Fase 2 — move arquivos para quarentena."""
    file_ids = body.get("file_ids", [])
    if not file_ids:
        raise HTTPException(status_code=400, detail="Informe ao menos um file_id.")
    return commit(file_ids, db)


@app.post("/execute/rollback")
def execute_rollback(body: dict, db: Session = Depends(get_db)):
    """Desfaz ações — restaura arquivos da quarentena."""
    audit_ids = body.get("audit_log_ids", [])
    if not audit_ids:
        raise HTTPException(status_code=400, detail="Informe ao menos um audit_log_id.")
    return rollback(audit_ids, db)


@app.post("/search")
def ai_search(body: dict, db: Session = Depends(get_db)):
    """Busca arquivos com linguagem natural usando IA."""
    from services.agent_flow import _get_api_key
    from langchain_anthropic import ChatAnthropic
    from langchain_core.messages import SystemMessage, HumanMessage
    import json

    query = body.get("query", "").strip()
    if not query:
        raise HTTPException(status_code=400, detail="Informe uma query de busca.")

    files = db.query(FileRecord).all()
    if not files:
        return {"query": query, "results": [], "explanation": "Nenhum arquivo indexado ainda. Execute um scan primeiro."}

    api_key = _get_api_key()
    if not api_key:
        raise HTTPException(status_code=400, detail="Configure ANTHROPIC_API_KEY para usar a busca inteligente.")

    file_list = "\n".join([
        f"ID:{f.id} | {f.name} | {f.extension} | {round(f.size_bytes/1024,1)}KB | {f.path}"
        for f in files
    ])

    prompt = f"""Você é um assistente de busca de arquivos. O usuário quer encontrar: "{query}"

Lista de arquivos disponíveis:
{file_list}

Retorne um JSON com os IDs dos arquivos mais relevantes e uma explicação curta em português.
Formato obrigatório:
{{"ids": [1, 2, 3], "explanation": "Encontrei X arquivos que..."}}

Seja inteligente: interprete nomes, extensões e caminhos. Se o usuário pedir "foto do cachorro" e houver "dog.jpg" ou "IMG_2024_pet.png", inclua.
Se nada for relevante, retorne ids vazio."""

    llm = ChatAnthropic(model="claude-haiku-4-5-20251001", anthropic_api_key=api_key, max_tokens=512)
    response = llm.invoke([SystemMessage(content="Você retorna apenas JSON válido."), HumanMessage(content=prompt)])

    try:
        parsed = json.loads(response.content)
        ids = parsed.get("ids", [])
        explanation = parsed.get("explanation", "")
    except Exception:
        ids = []; explanation = "Não foi possível interpretar a resposta da IA."

    matched = [f for f in files if f.id in ids]
    return {
        "query": query,
        "explanation": explanation,
        "results": [{"id": f.id, "name": f.name, "path": f.path, "size_bytes": f.size_bytes, "extension": f.extension} for f in matched],
    }


@app.get("/recommendations")
def get_recommendations(db: Session = Depends(get_db)):
    """Gera recomendações heurísticas baseadas no manifesto."""
    return generate_recommendations(db)


@app.get("/agent")
def get_agent_analysis(db: Session = Depends(get_db)):
    """Gera recomendações enriquecidas com análise em linguagem natural via IA."""
    return run_agent(db)


@app.get("/schedules")
def get_schedules():
    return list_schedules()

@app.post("/schedules")
def create_schedule(body: dict):
    job_id      = body.get("job_id", "default")
    interval    = body.get("interval", "daily")
    label       = body.get("label", "")
    source_path = body.get("source_path", "")
    folder_id   = body.get("folder_id", "root")
    try:
        return add_schedule(job_id, interval, label, source_path, folder_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/schedules/{job_id}", status_code=204)
def delete_schedule(job_id: str):
    if not remove_schedule(job_id):
        raise HTTPException(status_code=404, detail="Agendamento não encontrado.")

@app.get("/cloud/status")
def cloud_status():
    return {"connected": cloud_drive.is_connected()}

@app.get("/cloud/auth-url")
def cloud_auth_url():
    try:
        url = cloud_drive.get_auth_url()
        return {"url": url}
    except FileNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/cloud/callback")
def cloud_callback(code: str):
    from fastapi.responses import HTMLResponse
    try:
        cloud_drive.handle_callback(code)
        return HTMLResponse("<script>window.close()</script><p>Conectado! Pode fechar esta aba.</p>")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/cloud/folders")
def cloud_folders():
    try:
        return cloud_drive.list_drive_folders()
    except RuntimeError as e:
        raise HTTPException(status_code=401, detail=str(e))

@app.post("/cloud/upload")
def cloud_upload(body: dict):
    import uuid
    file_ids = body.get("file_ids", [])
    folder_id = body.get("folder_id", "root")
    if not file_ids:
        raise HTTPException(status_code=400, detail="Informe ao menos um file_id.")
    db = next(get_db())
    jobs = []
    for fid in file_ids:
        record = db.query(FileRecord).filter(FileRecord.id == fid).first()
        if not record or not os.path.exists(record.path):
            continue
        job_id = str(uuid.uuid4())
        cloud_drive.upload_file(record.path, folder_id, job_id)
        jobs.append({"job_id": job_id, "file": record.name})
    return {"jobs": jobs}

@app.get("/cloud/jobs")
def cloud_jobs():
    return cloud_drive.get_all_jobs()

@app.get("/cloud/jobs/{job_id}")
def cloud_job_status(job_id: str):
    return cloud_drive.get_job_status(job_id)

@app.get("/audit-log")
def audit_log(limit: int = 50, offset: int = 0, db: Session = Depends(get_db)):
    """Lista o histórico de todas as ações executadas."""
    return get_audit_log(db, limit=limit, offset=offset)


@app.get("/files")
def get_files(
    root_id: int | None = None,
    extension: str | None = None,
    duplicates_only: bool = False,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    """Lista arquivos indexados com filtros opcionais."""
    query = db.query(FileRecord)
    if root_id:
        query = query.filter(FileRecord.root_id == root_id)
    if extension:
        query = query.filter(FileRecord.extension == extension.lower())
    if duplicates_only:
        query = query.filter(FileRecord.is_duplicate == True)

    total = query.count()
    records = query.offset(offset).limit(limit).all()

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "files": [
            {
                "id": r.id,
                "path": r.path,
                "name": r.name,
                "extension": r.extension,
                "size_bytes": r.size_bytes,
                "hash_md5": r.hash_md5,
                "is_duplicate": r.is_duplicate,
                "indexed_at": r.indexed_at,
            }
            for r in records
        ],
    }
