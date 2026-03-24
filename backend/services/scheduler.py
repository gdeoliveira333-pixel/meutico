"""
Scheduler — backup automático para Google Drive.
"""
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from database import SessionLocal, FileRecord
from services.scanner import scan_root
from services import cloud_drive

_scheduler = BackgroundScheduler(timezone="America/Sao_Paulo")
_scheduler.start()

INTERVALS = {
    "hourly": {"hour": "*"},
    "daily":  {"hour": "8", "minute": "0"},
    "weekly": {"day_of_week": "mon", "hour": "8", "minute": "0"},
}

# Armazena metadados dos jobs (source_path, folder_id, interval, label)
_job_meta: dict[str, dict] = {}


def _run_backup(root_path: str, folder_id: str):
    """Escaneia a pasta e faz upload dos arquivos para o Drive."""
    import uuid, os
    db = SessionLocal()
    try:
        # Escaneia para atualizar o manifesto
        from database import AllowedRoot
        root_rec = db.query(AllowedRoot).filter(AllowedRoot.path == root_path).first()
        if root_rec:
            scan_root(root_rec, db)

        # Pega todos os arquivos da pasta
        files = db.query(FileRecord).filter(FileRecord.path.like(f"{root_path}%")).all()
        for f in files:
            if os.path.exists(f.path):
                upload_job_id = str(uuid.uuid4())
                cloud_drive.upload_file(f.path, folder_id, upload_job_id)
    finally:
        db.close()


def add_schedule(job_id: str, interval: str, label: str = "",
                 source_path: str = "", folder_id: str = "root") -> dict:
    if interval not in INTERVALS:
        raise ValueError(f"Intervalo inválido. Use: {list(INTERVALS.keys())}")
    if _scheduler.get_job(job_id):
        _scheduler.remove_job(job_id)

    trigger = CronTrigger(**INTERVALS[interval])
    job = _scheduler.add_job(
        _run_backup,
        trigger=trigger,
        id=job_id,
        name=label or job_id,
        args=[source_path, folder_id],
    )
    _job_meta[job_id] = {
        "source_path": source_path,
        "folder_id":   folder_id,
        "interval":    interval,
        "label":       label,
    }
    return _job_to_dict(job)


def remove_schedule(job_id: str) -> bool:
    job = _scheduler.get_job(job_id)
    if not job:
        return False
    _scheduler.remove_job(job_id)
    _job_meta.pop(job_id, None)
    return True


def list_schedules() -> list:
    return [_job_to_dict(j) for j in _scheduler.get_jobs()]


def _job_to_dict(job) -> dict:
    meta = _job_meta.get(job.id, {})
    return {
        "id":          job.id,
        "name":        job.name,
        "next_run":    job.next_run_time.isoformat() if job.next_run_time else None,
        "trigger":     str(job.trigger),
        "source_path": meta.get("source_path", ""),
        "folder_id":   meta.get("folder_id", "root"),
        "interval":    meta.get("interval", "daily"),
    }
