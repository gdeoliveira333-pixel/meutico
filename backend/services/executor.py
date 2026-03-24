"""
Executor Seguro — implementa o Two-Phase Commit para mover arquivos para quarentena.
Princípio: NUNCA deletar permanentemente. Tudo vai para quarentena com rollback disponível.

Fases:
  1. PREPARE  — valida que todos os arquivos existem e o destino é gravável
  2. COMMIT   — executa as movimentações e grava no audit_log
  3. ROLLBACK — desfaz tudo usando o audit_log
"""
import os
import shutil
from pathlib import Path
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from database import FileRecord, AuditLog

QUARANTINE_DIR = Path(os.environ.get("QUARANTINE_DIR", "C:/quarantine_meu_tico"))


def _ensure_quarantine():
    QUARANTINE_DIR.mkdir(parents=True, exist_ok=True)


def _quarantine_path(original_path: str) -> str:
    """Gera caminho de destino na quarentena preservando a estrutura original."""
    # Substitui : e \ para criar subpasta segura
    safe = original_path.replace(":", "_drive").replace("\\", "/").lstrip("/")
    dest = QUARANTINE_DIR / safe
    dest.parent.mkdir(parents=True, exist_ok=True)
    return str(dest)


# ── Two-Phase Commit ──────────────────────────────────────────────────────────

def prepare(file_ids: list[int], db: Session) -> dict:
    """
    Fase 1 — valida o plano sem mover nada.
    Retorna o plano detalhado ou lista de erros.
    """
    records = db.query(FileRecord).filter(FileRecord.id.in_(file_ids)).all()
    found_ids = {r.id for r in records}
    missing = [fid for fid in file_ids if fid not in found_ids]

    errors = []
    plan = []

    if missing:
        errors.append(f"IDs não encontrados no manifesto: {missing}")

    for record in records:
        if not os.path.exists(record.path):
            errors.append(f"Arquivo não existe no disco: {record.path}")
            continue
        dest = _quarantine_path(record.path)
        plan.append({
            "id": record.id,
            "source": record.path,
            "destination": dest,
            "size_bytes": record.size_bytes,
            "name": record.name,
        })

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "plan": plan,
        "total_files": len(plan),
        "total_bytes": sum(p["size_bytes"] for p in plan),
    }


def commit(file_ids: list[int], db: Session) -> dict:
    """
    Fase 2 — executa o plano. Busca arquivos diretamente sem depender do prepare(),
    evitando race condition com o watcher.
    """
    _ensure_quarantine()

    # Busca direta por ID — ignora se o watcher já removeu do manifesto
    records = db.query(FileRecord).filter(FileRecord.id.in_(file_ids)).all()
    prep = {
        "valid": True,
        "errors": [],
        "plan": [
            {
                "id": r.id,
                "source": r.path,
                "destination": _quarantine_path(r.path),
                "size_bytes": r.size_bytes,
                "name": r.name,
            }
            for r in records
            if os.path.exists(r.path)
        ],
    }

    if not prep["plan"]:
        return {"success": False, "errors": ["Nenhum arquivo válido encontrado."], "moved": []}

    moved = []
    failed = []

    for item in prep["plan"]:
        try:
            shutil.move(item["source"], item["destination"])

            log = AuditLog(
                action="QUARANTINE",
                source_path=item["source"],
                dest_path=item["destination"],
                status="SUCCESS",
                notes=f"Arquivo movido para quarentena via executor.",
            )
            db.add(log)

            # Atualiza manifesto
            record = db.query(FileRecord).filter(FileRecord.id == item["id"]).first()
            if record:
                record.path = item["destination"]

            db.commit()
            moved.append(item)

        except Exception as e:
            log = AuditLog(
                action="QUARANTINE",
                source_path=item["source"],
                dest_path=item["destination"],
                status="FAILED",
                notes=str(e),
            )
            db.add(log)
            db.commit()
            failed.append({"item": item, "error": str(e)})

    return {
        "success": len(failed) == 0,
        "moved": moved,
        "failed": failed,
    }


def rollback(audit_log_ids: list[int], db: Session) -> dict:
    """
    Desfaz ações registradas no audit_log — move arquivos de volta da quarentena.
    """
    logs = db.query(AuditLog).filter(
        AuditLog.id.in_(audit_log_ids),
        AuditLog.status == "SUCCESS",
        AuditLog.action == "QUARANTINE",
    ).all()

    restored = []
    failed = []

    for log in logs:
        try:
            if not os.path.exists(log.dest_path):
                raise FileNotFoundError(f"Arquivo não encontrado na quarentena: {log.dest_path}")

            dest_dir = os.path.dirname(log.source_path)
            os.makedirs(dest_dir, exist_ok=True)
            shutil.move(log.dest_path, log.source_path)

            # Restaura caminho no manifesto
            record = db.query(FileRecord).filter(FileRecord.path == log.dest_path).first()
            if record:
                record.path = log.source_path

            log.status = "ROLLED_BACK"
            db.commit()
            restored.append({"source": log.source_path, "from_quarantine": log.dest_path})

        except Exception as e:
            failed.append({"log_id": log.id, "error": str(e)})

    return {
        "success": len(failed) == 0,
        "restored": restored,
        "failed": failed,
    }


def get_audit_log(db: Session, limit: int = 50, offset: int = 0) -> list:
    logs = db.query(AuditLog).order_by(AuditLog.executed_at.desc()).offset(offset).limit(limit).all()
    return [
        {
            "id": l.id,
            "action": l.action,
            "source_path": l.source_path,
            "dest_path": l.dest_path,
            "status": l.status,
            "executed_at": l.executed_at,
            "notes": l.notes,
        }
        for l in logs
    ]
