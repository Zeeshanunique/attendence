import json
import uuid
from datetime import datetime

from sqlalchemy import create_engine, Column, String, Float, DateTime, Text
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import text

DATABASE_URL = "sqlite:///./attendance.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Student(Base):
    __tablename__ = "students"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    roll_number = Column(String, unique=True, nullable=False)
    login_password_hash = Column(String, nullable=True)
    face_embedding = Column(Text, nullable=True)  # JSON serialized list
    photo_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    def get_embedding(self):
        if self.face_embedding:
            return json.loads(self.face_embedding)
        return None

    def set_embedding(self, embedding):
        self.face_embedding = json.dumps(embedding)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "roll_number": self.roll_number,
            "photo_path": self.photo_path,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class AttendanceRecord(Base):
    __tablename__ = "attendance"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String, nullable=False)
    student_name = Column(String, nullable=False)
    roll_number = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    confidence = Column(Float, nullable=False)
    class_id = Column(String, default="default")

    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "student_name": self.student_name,
            "roll_number": self.roll_number,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "confidence": self.confidence,
            "class_id": self.class_id,
        }


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)  # admin | faculty
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "role": self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# Create tables
Base.metadata.create_all(bind=engine)


def _column_exists(table_name: str, column_name: str) -> bool:
    with engine.connect() as conn:
        rows = conn.execute(text(f"PRAGMA table_info({table_name})")).fetchall()
    return any(row[1] == column_name for row in rows)


def ensure_schema():
    # Lightweight migration for existing SQLite databases.
    if not _column_exists("students", "login_password_hash"):
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE students ADD COLUMN login_password_hash VARCHAR"))

    # Migrate legacy users table shape to the current auth schema.
    users_has_password_hash = _column_exists("users", "password_hash")
    users_has_hashed_password = _column_exists("users", "hashed_password")
    users_has_role = _column_exists("users", "role")

    with engine.begin() as conn:
        if not users_has_password_hash:
            conn.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR"))

        if not users_has_role:
            conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR"))

        # If previous schema used `hashed_password`, copy values forward.
        if users_has_hashed_password:
            conn.execute(
                text(
                    "UPDATE users SET password_hash = hashed_password "
                    "WHERE (password_hash IS NULL OR password_hash = '') "
                    "AND hashed_password IS NOT NULL"
                )
            )

        # Backfill missing role values for older records.
        conn.execute(
            text(
                "UPDATE users SET role = CASE "
                "WHEN lower(username) = 'admin' THEN 'admin' "
                "ELSE 'faculty' END "
                "WHERE role IS NULL OR role = ''"
            )
        )


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
