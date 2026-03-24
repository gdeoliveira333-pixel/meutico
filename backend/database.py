from sqlalchemy import create_engine, Column, Integer, String, BigInteger, DateTime, Boolean, Text
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from datetime import datetime, timezone

DATABASE_URL = "sqlite:///./manifest.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


class AllowedRoot(Base):
    """Diretórios que o agente tem permissão de acessar."""
    __tablename__ = "allowed_roots"

    id = Column(Integer, primary_key=True, index=True)
    path = Column(String, unique=True, nullable=False)
    label = Column(String, nullable=True)
    added_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    active = Column(Boolean, default=True)


class FileRecord(Base):
    """Manifesto de arquivos indexados."""
    __tablename__ = "file_records"

    id = Column(Integer, primary_key=True, index=True)
    root_id = Column(Integer, nullable=False)
    path = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    extension = Column(String, nullable=True)
    size_bytes = Column(BigInteger, nullable=False)
    hash_md5 = Column(String, nullable=True, index=True)
    hash_sha256 = Column(String, nullable=True, index=True)
    last_modified = Column(DateTime, nullable=True)
    indexed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_duplicate = Column(Boolean, default=False)
    duplicate_group_id = Column(String, nullable=True, index=True)


class AuditLog(Base):
    """Log imutável de todas as ações executadas."""
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String, nullable=False)       # MOVE, QUARANTINE, UNDO
    source_path = Column(Text, nullable=False)
    dest_path = Column(Text, nullable=True)
    executed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    status = Column(String, nullable=False)        # SUCCESS, FAILED, ROLLED_BACK
    notes = Column(Text, nullable=True)


def create_tables():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
