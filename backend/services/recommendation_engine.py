"""
Recommendation Engine — gera planos de ação baseados em heurísticas.
Analisa o manifesto e produz recomendações priorizadas por risco e impacto.

Tipos de recomendação:
  - DUPLICATE_CLEANUP  : arquivos duplicados para quarentena
  - LARGE_FILE         : arquivos grandes sem acesso recente
  - HEAVY_FOLDER       : pastas que consomem espaço desproporcional
"""
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import FileRecord


# ── Thresholds configuráveis ──────────────────────────────────────────────────

LARGE_FILE_MB = 100          # arquivos acima desse tamanho são candidatos
HEAVY_FOLDER_MB = 500        # pastas acima desse total são destacadas
OLD_FILE_DAYS = 180          # arquivos não modificados há X dias


# ── Estrutura de recomendação ─────────────────────────────────────────────────

@dataclass
class Recommendation:
    type: str                        # DUPLICATE_CLEANUP | LARGE_FILE | HEAVY_FOLDER
    risk: str                        # LOW | MEDIUM | HIGH
    title: str
    description: str
    potential_savings_bytes: int
    file_ids: list[int] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)

    def to_dict(self):
        return {
            "type": self.type,
            "risk": self.risk,
            "title": self.title,
            "description": self.description,
            "potential_savings_bytes": self.potential_savings_bytes,
            "potential_savings_mb": round(self.potential_savings_bytes / 1024 / 1024, 2),
            "file_ids": self.file_ids,
            "metadata": self.metadata,
        }


# ── Regras heurísticas ────────────────────────────────────────────────────────

def _rule_duplicates(db: Session) -> list[Recommendation]:
    """Agrupa duplicatas e sugere manter o mais antigo, quarentenar os demais."""
    recs = []

    groups = (
        db.query(FileRecord.duplicate_group_id)
        .filter(FileRecord.is_duplicate == True)
        .filter(FileRecord.duplicate_group_id != None)
        .distinct()
        .all()
    )

    for (group_id,) in groups:
        files = (
            db.query(FileRecord)
            .filter(FileRecord.duplicate_group_id == group_id)
            .order_by(FileRecord.last_modified.asc())
            .all()
        )
        if len(files) < 2:
            continue

        original = files[0]
        duplicates = files[1:]
        wasted = sum(f.size_bytes for f in duplicates)

        recs.append(Recommendation(
            type="DUPLICATE_CLEANUP",
            risk="LOW",
            title=f"Duplicatas detectadas: {original.name}",
            description=(
                f"'{original.name}' possui {len(duplicates)} cópia(s) idêntica(s). "
                f"Recomendo quarentenar as cópias e manter o original em '{original.path}'."
            ),
            potential_savings_bytes=wasted,
            file_ids=[f.id for f in duplicates],
            metadata={
                "original_path": original.path,
                "duplicate_paths": [f.path for f in duplicates],
                "group_id": group_id,
            },
        ))

    return recs


def _rule_large_files(db: Session) -> list[Recommendation]:
    """Detecta arquivos grandes que não foram modificados recentemente."""
    threshold_bytes = LARGE_FILE_MB * 1024 * 1024
    cutoff = datetime.now(timezone.utc) - timedelta(days=OLD_FILE_DAYS)

    files = (
        db.query(FileRecord)
        .filter(FileRecord.size_bytes >= threshold_bytes)
        .filter(FileRecord.last_modified <= cutoff)
        .order_by(FileRecord.size_bytes.desc())
        .all()
    )

    recs = []
    for f in files:
        age_days = (datetime.now(timezone.utc) - f.last_modified.replace(tzinfo=timezone.utc)).days
        recs.append(Recommendation(
            type="LARGE_FILE",
            risk="MEDIUM",
            title=f"Arquivo grande sem uso recente: {f.name}",
            description=(
                f"'{f.name}' ocupa {round(f.size_bytes/1024/1024, 1)} MB "
                f"e não foi modificado há {age_days} dias. "
                f"Considere arquivar ou quarentenar."
            ),
            potential_savings_bytes=f.size_bytes,
            file_ids=[f.id],
            metadata={"path": f.path, "age_days": age_days},
        ))

    return recs


def _rule_heavy_folders(db: Session) -> list[Recommendation]:
    """Detecta pastas que concentram muito espaço."""
    import os
    threshold_bytes = HEAVY_FOLDER_MB * 1024 * 1024

    all_files = db.query(FileRecord).all()

    folder_sizes: dict[str, int] = {}
    folder_files: dict[str, list[int]] = {}

    for f in all_files:
        folder = os.path.dirname(f.path)
        folder_sizes[folder] = folder_sizes.get(folder, 0) + f.size_bytes
        folder_files.setdefault(folder, []).append(f.id)

    recs = []
    for folder, total in folder_sizes.items():
        if total >= threshold_bytes:
            recs.append(Recommendation(
                type="HEAVY_FOLDER",
                risk="MEDIUM",
                title=f"Pasta pesada: {os.path.basename(folder)}",
                description=(
                    f"A pasta '{folder}' ocupa {round(total/1024/1024, 1)} MB. "
                    f"Revise o conteúdo para liberar espaço."
                ),
                potential_savings_bytes=0,
                file_ids=folder_files[folder],
                metadata={"folder": folder, "total_bytes": total},
            ))

    return recs


# ── Engine principal ──────────────────────────────────────────────────────────

def generate_recommendations(db: Session) -> dict:
    """Roda todas as regras e retorna o plano consolidado."""
    recommendations = []
    recommendations += _rule_duplicates(db)
    recommendations += _rule_large_files(db)
    recommendations += _rule_heavy_folders(db)

    # Ordena: LOW primeiro (mais seguros para executar)
    risk_order = {"LOW": 0, "MEDIUM": 1, "HIGH": 2}
    recommendations.sort(key=lambda r: risk_order[r.risk])

    total_savings = sum(r.potential_savings_bytes for r in recommendations)

    return {
        "total_recommendations": len(recommendations),
        "total_savings_bytes": total_savings,
        "total_savings_mb": round(total_savings / 1024 / 1024, 2),
        "recommendations": [r.to_dict() for r in recommendations],
    }
