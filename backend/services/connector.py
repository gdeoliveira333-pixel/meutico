"""
Connector Manager — gerencia a allowlist de diretórios raiz autorizados.
O agente NUNCA acessa caminhos fora desta lista.
"""
import os
from pathlib import Path
from sqlalchemy.orm import Session
from database import AllowedRoot


PROTECTED_PATHS = [
    "C:\\Windows",
    "C:\\Program Files",
    "C:\\Program Files (x86)",
    "C:\\ProgramData",
    os.environ.get("SYSTEMROOT", "C:\\Windows"),
]


def _is_protected(path: str) -> bool:
    """Impede adição de caminhos de sistema críticos."""
    resolved = str(Path(path).resolve())
    for protected in PROTECTED_PATHS:
        if resolved.lower().startswith(protected.lower()):
            return True
    return False


def add_root(db: Session, path: str, label: str | None = None) -> AllowedRoot:
    resolved = str(Path(path).resolve())

    if not os.path.isdir(resolved):
        raise ValueError(f"Caminho não existe ou não é um diretório: {resolved}")

    if _is_protected(resolved):
        raise PermissionError(f"Caminho protegido pelo sistema — não permitido: {resolved}")

    existing = db.query(AllowedRoot).filter(AllowedRoot.path == resolved).first()
    if existing:
        if not existing.active:
            existing.active = True
            db.commit()
            db.refresh(existing)
        return existing

    root = AllowedRoot(path=resolved, label=label or Path(resolved).name)
    db.add(root)
    db.commit()
    db.refresh(root)
    return root


def remove_root(db: Session, root_id: int) -> bool:
    root = db.query(AllowedRoot).filter(AllowedRoot.id == root_id).first()
    if not root:
        return False
    root.active = False
    db.commit()
    return True


def list_roots(db: Session) -> list[AllowedRoot]:
    return db.query(AllowedRoot).filter(AllowedRoot.active == True).all()


def is_path_allowed(db: Session, path: str) -> bool:
    """Verifica se um caminho está dentro de algum root autorizado."""
    resolved = str(Path(path).resolve())
    roots = list_roots(db)
    return any(resolved.startswith(root.path) for root in roots)
