"""
Indexer / Scanner — varre diretórios autorizados e popula o Manifest DB.
Também monitora mudanças em tempo real via watchdog.
"""
import os
import hashlib
import threading
from pathlib import Path
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from database import SessionLocal, FileRecord, AllowedRoot
from services.connector import list_roots, is_path_allowed


# ── Hashing ───────────────────────────────────────────────────────────────────

def _hash_file(path: str) -> tuple[str, str]:
    """Retorna (md5, sha256) de um arquivo. Lê em chunks para não estourar RAM."""
    md5 = hashlib.md5()
    sha256 = hashlib.sha256()
    try:
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                md5.update(chunk)
                sha256.update(chunk)
        return md5.hexdigest(), sha256.hexdigest()
    except (PermissionError, OSError):
        return "", ""


# ── Scan ──────────────────────────────────────────────────────────────────────

def _upsert_file(db: Session, root: AllowedRoot, filepath: str) -> FileRecord | None:
    """Insere ou atualiza um arquivo no Manifest DB."""
    try:
        stat = os.stat(filepath)
    except OSError:
        return None

    size = stat.st_size
    last_modified = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc)
    p = Path(filepath)

    existing = db.query(FileRecord).filter(FileRecord.path == filepath).first()

    # Só recalcula hash se o arquivo mudou de tamanho ou data
    if existing and existing.size_bytes == size and existing.last_modified == last_modified:
        return existing

    md5, sha256 = _hash_file(filepath)

    if existing:
        existing.size_bytes = size
        existing.last_modified = last_modified
        existing.hash_md5 = md5
        existing.hash_sha256 = sha256
        existing.indexed_at = datetime.now(timezone.utc)
        db.commit()
        return existing

    record = FileRecord(
        root_id=root.id,
        path=filepath,
        name=p.name,
        extension=p.suffix.lower(),
        size_bytes=size,
        hash_md5=md5,
        hash_sha256=sha256,
        last_modified=last_modified,
    )
    db.add(record)
    db.commit()
    return record


def scan_root(root: AllowedRoot, db: Session) -> dict:
    """Varre um root inteiro e indexa todos os arquivos."""
    added = 0
    updated = 0
    errors = 0

    for dirpath, _, filenames in os.walk(root.path):
        for filename in filenames:
            filepath = os.path.join(dirpath, filename)
            try:
                existed = db.query(FileRecord).filter(FileRecord.path == filepath).first()
                result = _upsert_file(db, root, filepath)
                if result:
                    if existed:
                        updated += 1
                    else:
                        added += 1
            except Exception:
                errors += 1

    # Remove do manifest arquivos que foram deletados do disco
    records = db.query(FileRecord).filter(FileRecord.root_id == root.id).all()
    for record in records:
        if not os.path.exists(record.path):
            db.delete(record)
    db.commit()

    return {"root": root.path, "added": added, "updated": updated, "errors": errors}


def scan_all_roots(db: Session) -> list[dict]:
    """Varre todos os roots ativos."""
    roots = list_roots(db)
    return [scan_root(root, db) for root in roots]


# ── Watcher (tempo real) ──────────────────────────────────────────────────────

try:
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler

    class _ManifestHandler(FileSystemEventHandler):
        def __init__(self, root: AllowedRoot):
            self.root = root

        def _get_db(self):
            return SessionLocal()

        def on_created(self, event):
            if event.is_directory:
                return
            db = self._get_db()
            try:
                _upsert_file(db, self.root, event.src_path)
            finally:
                db.close()

        def on_modified(self, event):
            if event.is_directory:
                return
            db = self._get_db()
            try:
                _upsert_file(db, self.root, event.src_path)
            finally:
                db.close()

        def on_deleted(self, event):
            if event.is_directory:
                return
            db = self._get_db()
            try:
                record = db.query(FileRecord).filter(FileRecord.path == event.src_path).first()
                if record:
                    db.delete(record)
                    db.commit()
            finally:
                db.close()

        def on_moved(self, event):
            if event.is_directory:
                return
            db = self._get_db()
            try:
                old = db.query(FileRecord).filter(FileRecord.path == event.src_path).first()
                if old:
                    db.delete(old)
                    db.commit()
                _upsert_file(db, self.root, event.dest_path)
            finally:
                db.close()

    _observer: Observer | None = None
    _observer_lock = threading.Lock()

    def start_watcher(db: Session):
        global _observer
        with _observer_lock:
            if _observer and _observer.is_alive():
                return

            roots = list_roots(db)
            if not roots:
                return

            _observer = Observer()
            for root in roots:
                handler = _ManifestHandler(root)
                _observer.schedule(handler, root.path, recursive=True)
            _observer.start()

    def stop_watcher():
        global _observer
        with _observer_lock:
            if _observer and _observer.is_alive():
                _observer.stop()
                _observer.join()
                _observer = None

    WATCHER_AVAILABLE = True

except ImportError:
    WATCHER_AVAILABLE = False

    def start_watcher(db: Session):
        pass

    def stop_watcher():
        pass
