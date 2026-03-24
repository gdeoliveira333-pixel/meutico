"""
Duplicate Engine — detecta arquivos duplicados em 2 estágios:
  Estágio 1: agrupa por tamanho (rápido, sem I/O)
  Estágio 2: confirma duplicata por hash SHA256 (100% preciso)
"""
import uuid
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import FileRecord


def find_duplicates(db: Session) -> dict:
    """
    Varre o manifesto, marca duplicatas e retorna um resumo dos grupos.
    """
    # Zera marcações anteriores
    db.query(FileRecord).update({"is_duplicate": False, "duplicate_group_id": None})
    db.commit()

    # Estágio 1: tamanhos que aparecem mais de uma vez
    duplicate_sizes = (
        db.query(FileRecord.size_bytes)
        .group_by(FileRecord.size_bytes)
        .having(func.count(FileRecord.id) > 1)
        .all()
    )
    candidate_sizes = {row.size_bytes for row in duplicate_sizes}

    if not candidate_sizes:
        return {"groups": [], "total_duplicates": 0, "wasted_bytes": 0}

    # Estágio 2: confirma por hash SHA256
    candidates = (
        db.query(FileRecord)
        .filter(FileRecord.size_bytes.in_(candidate_sizes))
        .filter(FileRecord.hash_sha256 != None)
        .filter(FileRecord.hash_sha256 != "")
        .all()
    )

    # Agrupa por hash
    hash_groups: dict[str, list[FileRecord]] = {}
    for record in candidates:
        hash_groups.setdefault(record.hash_sha256, []).append(record)

    groups = []
    total_duplicates = 0
    wasted_bytes = 0

    for hash_val, records in hash_groups.items():
        if len(records) < 2:
            continue

        group_id = str(uuid.uuid4())
        for record in records:
            record.is_duplicate = True
            record.duplicate_group_id = group_id

        # O primeiro arquivo é o "original" (mais antigo), o resto é desperdício
        records.sort(key=lambda r: r.last_modified or r.indexed_at)
        duplicates = records[1:]  # exclui o original
        wasted = sum(r.size_bytes for r in duplicates)

        groups.append({
            "group_id": group_id,
            "hash": hash_val,
            "count": len(records),
            "size_bytes": records[0].size_bytes,
            "wasted_bytes": wasted,
            "files": [
                {
                    "id": r.id,
                    "path": r.path,
                    "name": r.name,
                    "is_original": i == 0,
                }
                for i, r in enumerate(records)
            ],
        })

        total_duplicates += len(duplicates)
        wasted_bytes += wasted

    db.commit()

    return {
        "groups": groups,
        "total_duplicates": total_duplicates,
        "wasted_bytes": wasted_bytes,
        "wasted_mb": round(wasted_bytes / 1024 / 1024, 2),
    }
