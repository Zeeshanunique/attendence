"""
FaceSync — AI-Enabled Attendance System Backend
FastAPI + DeepFace + SQLite
"""

import io
import json
import os
import uuid
from datetime import datetime, date
from typing import Optional

import cv2
import numpy as np
from deepface import DeepFace
from fastapi import FastAPI, File, Form, UploadFile, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from PIL import Image, ImageOps
from sqlalchemy.orm import Session
from sqlalchemy import func

from models.database import get_db, Student, AttendanceRecord

app = FastAPI(title="FaceSync API", version="1.0.0")

# CORS — allow the React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Confidence threshold for face matching (cosine distance, lower = better match)
MATCH_THRESHOLD = 0.4  # Facenet default

# Track which students already marked today per class to prevent duplicates
_session_tracker: dict[str, set[str]] = {}


def get_session_key(class_id: str) -> str:
    return f"{date.today().isoformat()}_{class_id}"


# ─────────────────────────────────────────
# Health
# ─────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "ok", "service": "FaceSync API", "version": "1.0.0"}


# ─────────────────────────────────────────
# Student Registration
# ─────────────────────────────────────────

@app.post("/api/register")
async def register_student(
    name: str = Form(...),
    roll_number: str = Form(...),
    photo: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    # Check duplicate roll number
    existing = db.query(Student).filter(Student.roll_number == roll_number).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Roll number {roll_number} already registered")

    # Read and process image
    image_bytes = await photo.read()
    pil_img = Image.open(io.BytesIO(image_bytes))
    pil_img = ImageOps.exif_transpose(pil_img)  # Fix phone photo rotation
    img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)

    if img is None or img.size == 0:
        raise HTTPException(status_code=400, detail="Invalid image file")

    # Detect faces and get embeddings (ssd detector is more reliable than opencv)
    objs = DeepFace.represent(img, model_name="Facenet", enforce_detection=True, detector_backend="ssd")
    if len(objs) == 0:
        raise HTTPException(status_code=400, detail="No face detected in the photo. Please upload a clear face photo.")

    if len(objs) > 1:
        raise HTTPException(status_code=400, detail="Multiple faces detected. Please upload a photo with only one face.")

    embedding = objs[0]["embedding"]

    # Save photo
    photo_filename = f"{uuid.uuid4()}.jpg"
    photo_path = os.path.join(UPLOAD_DIR, photo_filename)
    cv2.imwrite(photo_path, img)

    # Create student record
    student = Student(
        name=name,
        roll_number=roll_number,
        photo_path=photo_filename,
    )
    student.set_embedding(embedding)

    db.add(student)
    db.commit()
    db.refresh(student)

    return {
        "status": "success",
        "message": f"{name} registered successfully",
        "student": student.to_dict(),
    }


@app.get("/api/students")
def list_students(db: Session = Depends(get_db)):
    students = db.query(Student).order_by(Student.created_at.desc()).all()
    return [s.to_dict() for s in students]


@app.delete("/api/students/{student_id}")
def remove_student(student_id: str, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Delete photo file
    if student.photo_path:
        path = os.path.join(UPLOAD_DIR, student.photo_path)
        if os.path.exists(path):
            os.remove(path)

    db.delete(student)
    db.commit()
    return {"status": "success", "message": f"{student.name} removed"}


# ─────────────────────────────────────────
# Attendance Marking
# ─────────────────────────────────────────

@app.post("/api/attendance")
async def mark_attendance(
    image: UploadFile = File(...),
    class_id: str = Form("default"),
    db: Session = Depends(get_db),
):
    # Read image
    image_bytes = await image.read()
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image")

    # Detect faces and get embeddings
    objs = DeepFace.represent(img, model_name="Facenet", enforce_detection=False, detector_backend="ssd")
    if len(objs) == 0:
        return {"status": "no_face", "message": "No face detected in frame"}

    face_encodings = [o["embedding"] for o in objs]

    # Load all student embeddings
    students = db.query(Student).filter(Student.face_embedding.isnot(None)).all()
    if not students:
        return {"status": "error", "message": "No students registered yet"}

    known_encodings = []
    student_map = []
    for s in students:
        emb = s.get_embedding()
        if emb:
            known_encodings.append(np.array(emb))
            student_map.append(s)

    if not known_encodings:
        return {"status": "error", "message": "No face embeddings found"}

    # Match faces
    results = []
    session_key = get_session_key(class_id)
    if session_key not in _session_tracker:
        _session_tracker[session_key] = set()

    def cosine_distance(a, b):
        a, b = np.array(a, dtype=float), np.array(b, dtype=float)
        return 1 - np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-10)

    for face_encoding in face_encodings:
        # Compute cosine distances to all known faces
        distances = np.array([cosine_distance(enc, face_encoding) for enc in known_encodings])
        best_idx = np.argmin(distances)
        best_distance = distances[best_idx]

        if best_distance < MATCH_THRESHOLD:
            matched_student = student_map[best_idx]
            confidence = float(1.0 - best_distance)

            # Check if already marked in this session
            if matched_student.id in _session_tracker[session_key]:
                results.append({
                    "status": "already_marked",
                    "student": matched_student.to_dict(),
                    "confidence": round(confidence, 2),
                })
                continue

            # Mark attendance
            record = AttendanceRecord(
                student_id=matched_student.id,
                student_name=matched_student.name,
                roll_number=matched_student.roll_number,
                confidence=round(confidence, 2),
                class_id=class_id,
            )
            db.add(record)
            _session_tracker[session_key].add(matched_student.id)

            results.append({
                "status": "success",
                "student": matched_student.to_dict(),
                "confidence": round(confidence, 2),
            })
        else:
            results.append({
                "status": "unknown",
                "confidence": round(float(1.0 - best_distance), 2),
            })

    db.commit()

    # Return single result if one face, array if multiple
    if len(results) == 1:
        return results[0]

    return {"status": "multiple", "results": results, "count": len(results)}


# ─────────────────────────────────────────
# Attendance Records & Analytics
# ─────────────────────────────────────────

@app.get("/api/attendance")
def get_attendance_records(
    date_filter: Optional[str] = Query(None, alias="date"),
    class_id: Optional[str] = Query(None),
    limit: int = Query(100),
    db: Session = Depends(get_db),
):
    query = db.query(AttendanceRecord)

    if date_filter:
        try:
            d = datetime.strptime(date_filter, "%Y-%m-%d").date()
            query = query.filter(func.date(AttendanceRecord.timestamp) == d)
        except ValueError:
            pass

    if class_id:
        query = query.filter(AttendanceRecord.class_id == class_id)

    records = query.order_by(AttendanceRecord.timestamp.desc()).limit(limit).all()
    return [r.to_dict() for r in records]


@app.get("/api/attendance/stats")
def get_attendance_stats(db: Session = Depends(get_db)):
    total_students = db.query(Student).count()

    today = date.today()
    present_today = (
        db.query(AttendanceRecord)
        .filter(func.date(AttendanceRecord.timestamp) == today)
        .distinct(AttendanceRecord.student_id)
        .count()
    )
    absent_today = total_students - present_today

    # Students at risk (below 75% attendance)
    # Calculate per-student attendance percentage
    total_classes = (
        db.query(func.count(func.distinct(func.date(AttendanceRecord.timestamp))))
        .scalar()
    ) or 1

    at_risk = 0
    students = db.query(Student).all()
    for s in students:
        attended = (
            db.query(AttendanceRecord)
            .filter(AttendanceRecord.student_id == s.id)
            .distinct(func.date(AttendanceRecord.timestamp))
            .count()
        )
        if total_classes > 0 and (attended / total_classes) < 0.75:
            at_risk += 1

    avg_attendance = round((present_today / total_students * 100) if total_students > 0 else 0, 1)

    return {
        "totalStudents": total_students,
        "presentToday": present_today,
        "absentToday": absent_today,
        "atRisk": at_risk,
        "avgAttendance": avg_attendance,
    }


@app.get("/api/attendance/export")
def export_attendance_csv(
    date_filter: Optional[str] = Query(None, alias="date"),
    class_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(AttendanceRecord)

    if date_filter:
        try:
            d = datetime.strptime(date_filter, "%Y-%m-%d").date()
            query = query.filter(func.date(AttendanceRecord.timestamp) == d)
        except ValueError:
            pass

    if class_id:
        query = query.filter(AttendanceRecord.class_id == class_id)

    records = query.order_by(AttendanceRecord.timestamp.desc()).all()

    # Build CSV
    lines = ["Name,Roll Number,Timestamp,Confidence,Class ID"]
    for r in records:
        ts = r.timestamp.strftime("%Y-%m-%d %H:%M:%S") if r.timestamp else ""
        lines.append(f"{r.student_name},{r.roll_number},{ts},{r.confidence},{r.class_id}")

    csv_content = "\n".join(lines)
    return StreamingResponse(
        io.BytesIO(csv_content.encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=attendance_{date.today().isoformat()}.csv"},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
