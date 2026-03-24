"""
Google Drive Integration — OAuth2 + upload de arquivos.

Setup necessário:
  1. Acesse console.cloud.google.com
  2. Crie um projeto → ative a Google Drive API
  3. Crie credenciais OAuth2 (Desktop App)
  4. Baixe o JSON e salve como backend/google_credentials.json
"""
import os
import json
import threading
import urllib.parse
import urllib.request
from pathlib import Path

CREDENTIALS_FILE = Path(__file__).parent.parent / "google_credentials.json"
TOKEN_FILE       = Path(__file__).parent.parent / "google_token.json"
SCOPES           = ["https://www.googleapis.com/auth/drive.file"]

_upload_jobs: dict[str, dict] = {}  # job_id → status
_lock = threading.Lock()


def _get_creds():
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request

    if not TOKEN_FILE.exists():
        return None

    token_data = json.loads(TOKEN_FILE.read_text())

    # Suporta tanto o formato direto da API quanto o formato do google-auth
    if "token" not in token_data and "access_token" in token_data:
        creds_data = json.loads(CREDENTIALS_FILE.read_text())
        cfg = creds_data.get("web") or creds_data.get("installed")
        creds = Credentials(
            token=token_data["access_token"],
            refresh_token=token_data.get("refresh_token"),
            token_uri="https://oauth2.googleapis.com/token",
            client_id=cfg["client_id"],
            client_secret=cfg["client_secret"],
            scopes=SCOPES,
        )
    else:
        creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)

    if creds and creds.valid:
        return creds
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
        TOKEN_FILE.write_text(creds.to_json())
        return creds
    return None


def is_connected() -> bool:
    creds = _get_creds()
    return creds is not None and creds.valid


def get_auth_url() -> str:
    """Gera a URL de autorização OAuth2."""
    import urllib.parse, secrets

    if not CREDENTIALS_FILE.exists():
        raise FileNotFoundError(
            "Arquivo google_credentials.json não encontrado. "
            "Baixe as credenciais em console.cloud.google.com e salve em backend/google_credentials.json"
        )

    creds_data = json.loads(CREDENTIALS_FILE.read_text())
    cfg = creds_data.get("web") or creds_data.get("installed")
    client_id = cfg["client_id"]
    state = secrets.token_urlsafe(16)

    # Salva state para validar no callback
    (Path(__file__).parent.parent / ".oauth_state.json").write_text(json.dumps({"state": state}))

    params = {
        "client_id":     client_id,
        "redirect_uri":  "http://localhost:8000/cloud/callback",
        "response_type": "code",
        "scope":         " ".join(SCOPES),
        "access_type":   "offline",
        "prompt":        "consent",
        "state":         state,
    }
    return "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)


def handle_callback(code: str) -> bool:
    """Troca o código de autorização pelo token e salva."""
    creds_data = json.loads(CREDENTIALS_FILE.read_text())
    cfg = creds_data.get("web") or creds_data.get("installed")

    data = urllib.parse.urlencode({
        "code":          code,
        "client_id":     cfg["client_id"],
        "client_secret": cfg["client_secret"],
        "redirect_uri":  "http://localhost:8000/cloud/callback",
        "grant_type":    "authorization_code",
    }).encode()

    req = urllib.request.Request("https://oauth2.googleapis.com/token", data=data, method="POST")
    with urllib.request.urlopen(req) as resp:
        token_data = json.loads(resp.read())

    TOKEN_FILE.write_text(json.dumps(token_data))
    return True


def list_drive_folders() -> list:
    """Lista pastas na raiz do Drive do usuário."""
    from googleapiclient.discovery import build

    creds = _get_creds()
    if not creds:
        raise RuntimeError("Não autenticado com Google Drive.")

    service = build("drive", "v3", credentials=creds)
    results = service.files().list(
        q="mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false",
        fields="files(id, name)",
        pageSize=50,
    ).execute()
    return results.get("files", [])


def create_drive_folder(name: str, parent_id: str = None) -> str:
    """Cria uma pasta no Drive e retorna o ID."""
    from googleapiclient.discovery import build

    creds = _get_creds()
    service = build("drive", "v3", credentials=creds)
    meta = {"name": name, "mimeType": "application/vnd.google-apps.folder"}
    if parent_id:
        meta["parents"] = [parent_id]
    folder = service.files().create(body=meta, fields="id").execute()
    return folder["id"]


def upload_file(local_path: str, folder_id: str, job_id: str):
    """Upload de um arquivo para o Drive. Roda em thread separada."""
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload
    import mimetypes

    def _run():
        with _lock:
            _upload_jobs[job_id] = {"status": "running", "progress": 0, "file": local_path}
        try:
            creds = _get_creds()
            service = build("drive", "v3", credentials=creds)
            file_name = Path(local_path).name
            mime, _ = mimetypes.guess_type(local_path)
            mime = mime or "application/octet-stream"
            file_size = os.path.getsize(local_path)

            media = MediaFileUpload(local_path, mimetype=mime, resumable=True, chunksize=5 * 1024 * 1024)
            request = service.files().create(
                body={"name": file_name, "parents": [folder_id]},
                media_body=media,
                fields="id, name, size",
            )

            response = None
            while response is None:
                status, response = request.next_chunk()
                if status:
                    pct = int(status.progress() * 100)
                    with _lock:
                        _upload_jobs[job_id]["progress"] = pct

            with _lock:
                _upload_jobs[job_id] = {
                    "status": "done",
                    "progress": 100,
                    "file": local_path,
                    "drive_id": response.get("id"),
                }
        except Exception as e:
            with _lock:
                _upload_jobs[job_id] = {"status": "error", "error": str(e), "file": local_path}

    thread = threading.Thread(target=_run, daemon=True)
    thread.start()


def get_job_status(job_id: str) -> dict:
    with _lock:
        return _upload_jobs.get(job_id, {"status": "not_found"})


def get_all_jobs() -> list:
    with _lock:
        return [{"job_id": k, **v} for k, v in _upload_jobs.items()]
