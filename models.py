import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Text, ForeignKey, DateTime,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from db import Base

# ---------------------------------------------------------------------------
# PLACEHOLDER THRESHOLD — replace this once the real university policy is in.
# Right now "Topper" status is just "cgpa >= 3.5". Your actual university
# protocol might instead be: top N% of the department, a Dean's List cutoff
# that differs by program, a minimum credit-hours-completed rule, etc.
# Keeping it as a single constant here means that logic only needs to change
# in one place (see User.recompute_topper_status below) when that's ready.
# ---------------------------------------------------------------------------
TOPPER_CGPA_THRESHOLD = 3.5


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)

    university = Column(String, nullable=True)
    department = Column(String, nullable=True)
    semester = Column(Integer, nullable=True)
    cgpa = Column(Float, nullable=True)
    is_topper = Column(Boolean, default=False, nullable=False)
    bio = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    resources = relationship(
        "Resource", back_populates="owner", cascade="all, delete-orphan"
    )
    comments = relationship(
        "Comment", back_populates="author", cascade="all, delete-orphan"
    )

    def recompute_topper_status(self):
        """Call this any time cgpa changes (signup or profile update)."""
        self.is_topper = bool(
            self.cgpa is not None and self.cgpa >= TOPPER_CGPA_THRESHOLD
        )


class Session(Base):
    """A simple bearer-token session, stored server-side so it can be revoked."""

    __tablename__ = "sessions"

    token = Column(String, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)


class Resource(Base):
    """Something a topper shares: study material, a routine, or a quick tip."""

    __tablename__ = "resources"

    id = Column(Integer, primary_key=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    resource_type = Column(String, nullable=False)  # material | routine | tip
    course_code = Column(String, nullable=True, index=True)

    file_path = Column(String, nullable=True)       # for uploaded material
    content_text = Column(Text, nullable=True)       # for pasted notes / tips
    routine_json = Column(Text, nullable=True)        # for structured routines

    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="resources")
    comments = relationship(
        "Comment", back_populates="resource", cascade="all, delete-orphan"
    )
    upvotes = relationship(
        "ResourceUpvote", back_populates="resource", cascade="all, delete-orphan"
    )


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True)
    resource_id = Column(Integer, ForeignKey("resources.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    resource = relationship("Resource", back_populates="comments")
    author = relationship("User", back_populates="comments")


class ResourceUpvote(Base):
    __tablename__ = "resource_upvotes"

    id = Column(Integer, primary_key=True)
    resource_id = Column(Integer, ForeignKey("resources.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    __table_args__ = (
        UniqueConstraint("resource_id", "user_id", name="uq_resource_user_upvote"),
    )

    resource = relationship("Resource", back_populates="upvotes")


class Follow(Base):
    """A student following a topper, so they can keep up with new uploads."""

    __tablename__ = "follows"

    id = Column(Integer, primary_key=True)
    follower_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    topper_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("follower_id", "topper_id", name="uq_follow_pair"),
    )
