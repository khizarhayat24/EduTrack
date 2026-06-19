import os
import json
import uuid
import shutil
import datetime
from typing import Optional, Dict, List
from dotenv import load_dotenv

import uvicorn
from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy.orm import Session as DBSession

from db import Base, engine, get_db
import models
import schemas
import auth_utils

load_dotenv()
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Tutor App API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/")
def home():
    return {"status": "Online", "message": "Go to /docs to test endpoints."}


class RoutineAuditPayload(BaseModel):
    current_cgpa: float
    credits_earned: int
    target_cgpa: float
    current_courses: Dict[str, int]
    weekly_logs: Dict


@app.post("/api/audit-routine")
async def audit_routine(payload: RoutineAuditPayload):
    return {
        "math_targets": {
            "required_sgpa_this_semester": "3.89"
        },
        "ai_routine_critique": {
            "routine_efficiency_score": 65,
            "bottlenecks_identified": [
                "Sleep cycle falls below threshold requirement (5.2 hours average).",
                "Study time allocation for core data structure modules shows high deficit patterns."
            ]
        }
    }


@app.post("/api/analyze-materials")
async def analyze_materials(syllabus_text: str = Form(...), notes_file: UploadFile = File(...)):
    import urllib.request as _urlreq

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="GEMINI_API_KEY not set. Get free key at https://aistudio.google.com"
        )

    notes_bytes = await notes_file.read()
    notes_content = notes_bytes.decode("utf-8", errors="replace")[:6000]

    prompt = f"""You are an academic study-gap analyser. A student has provided their syllabus topics and their uploaded notes.

SYLLABUS TOPICS / KEYWORDS:
{syllabus_text}

STUDENT'S NOTES (may be truncated):
{notes_content}

Identify what is MISSING or UNDER-COVERED in the student's notes compared to the syllabus.
Respond ONLY with a valid JSON object — no markdown, no preamble — in exactly this shape:

{{
  "missing_concepts": ["ConceptA", "ConceptB"],
  "gaps_rationale": {{
    "ConceptA": "One sentence explaining why this is missing.",
    "ConceptB": "One sentence explaining why this is missing."
  }},
  "recommended_action_items": [
    "Concrete study action 1.",
    "Concrete study action 2."
  ]
}}

Keep missing_concepts to the 3-6 most critical gaps. Be specific and constructive."""

    payload = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 1024}
    }).encode()

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
    req = _urlreq.Request(url, data=payload, headers={"Content-Type": "application/json"}, method="POST")

    try:
        with _urlreq.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
        raw = data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gemini API error: {e}")

    if raw.startswith("```"):
        raw = raw.split("```", 2)[1]
        if raw.startswith("json"):
            raw = raw[4:]

    try:
        return json.loads(raw.strip())
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail=f"AI returned non-JSON: {raw[:200]}")


# ===========================================================================
# Serialization helpers
# ===========================================================================

def user_out(user: models.User) -> schemas.UserOut:
    return schemas.UserOut.model_validate(user)


def resource_out(resource: models.Resource, current_user: Optional[models.User]) -> schemas.ResourceOut:
    routine = None
    if resource.routine_json:
        try:
            routine = json.loads(resource.routine_json)
        except json.JSONDecodeError:
            routine = None
    file_url = f"/uploads/{os.path.basename(resource.file_path)}" if resource.file_path else None
    is_upvoted = (
        any(u.user_id == current_user.id for u in resource.upvotes) if current_user else False
    )
    return schemas.ResourceOut(
        id=resource.id,
        title=resource.title,
        description=resource.description,
        resource_type=resource.resource_type,
        course_code=resource.course_code,
        file_url=file_url,
        content_text=resource.content_text,
        routine=routine,
        owner=user_out(resource.owner),
        upvote_count=len(resource.upvotes),
        is_upvoted=is_upvoted,
        comment_count=len(resource.comments),
        created_at=resource.created_at,
    )


def topper_out(db: DBSession, topper: models.User, current_user: Optional[models.User]) -> schemas.TopperOut:
    follower_count = db.query(models.Follow).filter(models.Follow.topper_id == topper.id).count()
    is_following = False
    if current_user:
        is_following = db.query(models.Follow).filter(
            models.Follow.follower_id == current_user.id,
            models.Follow.topper_id == topper.id,
        ).first() is not None
    return schemas.TopperOut(
        **user_out(topper).model_dump(),
        resource_count=len(topper.resources),
        follower_count=follower_count,
        is_following=is_following,
    )


# ===========================================================================
# Auth
# ===========================================================================

@app.post("/api/auth/signup", response_model=schemas.TokenOut)
def signup(payload: schemas.UserSignup, db: DBSession = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    user = models.User(
        name=payload.name,
        email=payload.email,
        password_hash=auth_utils.hash_password(payload.password),
        university=payload.university,
        department=payload.department,
        semester=payload.semester,
        cgpa=payload.cgpa,
    )
    user.recompute_topper_status()
    db.add(user)
    db.commit()
    db.refresh(user)
    token = auth_utils.create_session(db, user.id)
    return schemas.TokenOut(token=token, user=user_out(user))


@app.post("/api/auth/login", response_model=schemas.TokenOut)
def login(payload: schemas.UserLogin, db: DBSession = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not auth_utils.verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    token = auth_utils.create_session(db, user.id)
    return schemas.TokenOut(token=token, user=user_out(user))


@app.get("/api/auth/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(auth_utils.get_current_user)):
    return user_out(current_user)


@app.patch("/api/auth/me", response_model=schemas.UserOut)
def update_me(
    payload: schemas.UserUpdate,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: DBSession = Depends(get_db),
):
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    current_user.recompute_topper_status()
    db.commit()
    db.refresh(current_user)
    return user_out(current_user)


# ===========================================================================
# Toppers hub
# ===========================================================================

@app.get("/api/toppers", response_model=List[schemas.TopperOut])
def list_toppers(
    course: Optional[str] = None,
    search: Optional[str] = None,
    db: DBSession = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth_utils.get_current_user_optional),
):
    query = db.query(models.User).filter(models.User.is_topper == True)  # noqa: E712
    if search:
        query = query.filter(models.User.name.ilike(f"%{search}%"))
    toppers = query.all()

    results = []
    for t in toppers:
        if course:
            matches = [r for r in t.resources if r.course_code and r.course_code.lower() == course.lower()]
            if not matches:
                continue
        results.append(topper_out(db, t, current_user))
    return results


@app.get("/api/toppers/{topper_id}")
def get_topper(
    topper_id: int,
    db: DBSession = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth_utils.get_current_user_optional),
):
    topper = db.query(models.User).filter(
        models.User.id == topper_id, models.User.is_topper == True  # noqa: E712
    ).first()
    if not topper:
        raise HTTPException(status_code=404, detail="Topper not found.")
    resources = sorted(topper.resources, key=lambda r: r.created_at, reverse=True)
    return {
        "topper": topper_out(db, topper, current_user),
        "resources": [resource_out(r, current_user) for r in resources],
    }


@app.post("/api/toppers/{topper_id}/follow")
def toggle_follow(
    topper_id: int,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: DBSession = Depends(get_db),
):
    if topper_id == current_user.id:
        raise HTTPException(status_code=400, detail="You can't follow yourself.")
    topper = db.query(models.User).filter(
        models.User.id == topper_id, models.User.is_topper == True  # noqa: E712
    ).first()
    if not topper:
        raise HTTPException(status_code=404, detail="Topper not found.")

    existing = db.query(models.Follow).filter(
        models.Follow.follower_id == current_user.id,
        models.Follow.topper_id == topper_id,
    ).first()
    if existing:
        db.delete(existing)
        db.commit()
        following = False
    else:
        db.add(models.Follow(follower_id=current_user.id, topper_id=topper_id))
        db.commit()
        following = True

    follower_count = db.query(models.Follow).filter(models.Follow.topper_id == topper_id).count()
    return {"following": following, "follower_count": follower_count}


@app.get("/api/me/following", response_model=List[schemas.UserOut])
def my_following(
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: DBSession = Depends(get_db),
):
    topper_ids = [
        f.topper_id for f in
        db.query(models.Follow).filter(models.Follow.follower_id == current_user.id).all()
    ]
    toppers = db.query(models.User).filter(models.User.id.in_(topper_ids)).all()
    return [user_out(t) for t in toppers]


# ===========================================================================
# Resources
# ===========================================================================

@app.get("/api/resources/courses")
def list_courses(db: DBSession = Depends(get_db)):
    rows = db.query(models.Resource.course_code).filter(models.Resource.course_code.isnot(None)).distinct().all()
    return sorted({r[0] for r in rows if r[0]})


@app.get("/api/resources", response_model=List[schemas.ResourceOut])
def list_resources(
    course: Optional[str] = None,
    resource_type: Optional[str] = None,
    search: Optional[str] = None,
    sort: str = "newest",
    db: DBSession = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth_utils.get_current_user_optional),
):
    query = db.query(models.Resource)
    if course:
        query = query.filter(models.Resource.course_code.ilike(course))
    if resource_type:
        query = query.filter(models.Resource.resource_type == resource_type)
    if search:
        query = query.filter(models.Resource.title.ilike(f"%{search}%"))
    resources = query.all()

    out = [resource_out(r, current_user) for r in resources]
    if sort == "popular":
        out.sort(key=lambda r: r.upvote_count, reverse=True)
    else:
        out.sort(key=lambda r: r.created_at, reverse=True)
    return out


@app.get("/api/resources/{resource_id}", response_model=schemas.ResourceOut)
def get_resource(
    resource_id: int,
    db: DBSession = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth_utils.get_current_user_optional),
):
    resource = db.query(models.Resource).filter(models.Resource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found.")
    return resource_out(resource, current_user)


@app.post("/api/resources", response_model=schemas.ResourceOut)
async def create_resource(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    resource_type: str = Form(...),
    course_code: Optional[str] = Form(None),
    content_text: Optional[str] = Form(None),
    routine_json: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: DBSession = Depends(get_db),
):
    if not current_user.is_topper:
        raise HTTPException(status_code=403, detail="Only verified toppers can share resources right now.")
    if resource_type not in ("material", "routine", "tip"):
        raise HTTPException(status_code=400, detail="resource_type must be material, routine, or tip.")

    if resource_type == "routine":
        if not routine_json:
            raise HTTPException(status_code=400, detail="Routine resources need a schedule.")
        try:
            json.loads(routine_json)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Routine schedule must be valid JSON.")
    elif not file and not content_text:
        raise HTTPException(status_code=400, detail="Add a file or some text content for this resource.")

    file_path = None
    if file:
        ext = os.path.splitext(file.filename or "")[1]
        safe_name = f"{uuid.uuid4().hex}{ext}"
        dest = os.path.join(UPLOAD_DIR, safe_name)
        with open(dest, "wb") as out_file:
            shutil.copyfileobj(file.file, out_file)
        file_path = dest

    resource = models.Resource(
        owner_id=current_user.id,
        title=title,
        description=description,
        resource_type=resource_type,
        course_code=course_code,
        file_path=file_path,
        content_text=content_text,
        routine_json=routine_json,
    )
    db.add(resource)
    db.commit()
    db.refresh(resource)
    return resource_out(resource, current_user)


@app.delete("/api/resources/{resource_id}")
def delete_resource(
    resource_id: int,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: DBSession = Depends(get_db),
):
    resource = db.query(models.Resource).filter(models.Resource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found.")
    if resource.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own resources.")
    if resource.file_path and os.path.exists(resource.file_path):
        os.remove(resource.file_path)
    db.delete(resource)
    db.commit()
    return {"deleted": True}


@app.post("/api/resources/{resource_id}/upvote")
def toggle_upvote(
    resource_id: int,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: DBSession = Depends(get_db),
):
    resource = db.query(models.Resource).filter(models.Resource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found.")
    existing = db.query(models.ResourceUpvote).filter(
        models.ResourceUpvote.resource_id == resource_id,
        models.ResourceUpvote.user_id == current_user.id,
    ).first()
    if existing:
        db.delete(existing)
        db.commit()
        upvoted = False
    else:
        db.add(models.ResourceUpvote(resource_id=resource_id, user_id=current_user.id))
        db.commit()
        upvoted = True
    count = db.query(models.ResourceUpvote).filter(models.ResourceUpvote.resource_id == resource_id).count()
    return {"upvoted": upvoted, "upvote_count": count}


@app.get("/api/resources/{resource_id}/comments", response_model=List[schemas.CommentOut])
def list_comments(resource_id: int, db: DBSession = Depends(get_db)):
    comments = (
        db.query(models.Comment)
        .filter(models.Comment.resource_id == resource_id)
        .order_by(models.Comment.created_at.asc())
        .all()
    )
    return [
        schemas.CommentOut(id=c.id, content=c.content, author=user_out(c.author), created_at=c.created_at)
        for c in comments
    ]


@app.post("/api/resources/{resource_id}/comments", response_model=schemas.CommentOut)
def add_comment(
    resource_id: int,
    payload: schemas.CommentCreate,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: DBSession = Depends(get_db),
):
    resource = db.query(models.Resource).filter(models.Resource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found.")
    comment = models.Comment(resource_id=resource_id, author_id=current_user.id, content=payload.content)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return schemas.CommentOut(
        id=comment.id, content=comment.content, author=user_out(current_user), created_at=comment.created_at
    )


if __name__ == "__main__":
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)