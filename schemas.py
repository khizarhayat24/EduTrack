import datetime
from typing import Optional, Dict
from pydantic import BaseModel, EmailStr, ConfigDict


class UserSignup(BaseModel):
    name: str
    email: EmailStr
    password: str
    university: Optional[str] = None
    department: Optional[str] = None
    semester: Optional[int] = None
    cgpa: Optional[float] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    university: Optional[str] = None
    department: Optional[str] = None
    semester: Optional[int] = None
    cgpa: Optional[float] = None
    bio: Optional[str] = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    university: Optional[str] = None
    department: Optional[str] = None
    semester: Optional[int] = None
    cgpa: Optional[float] = None
    is_topper: bool
    bio: Optional[str] = None


class TopperOut(UserOut):
    resource_count: int
    follower_count: int
    is_following: bool = False


class TokenOut(BaseModel):
    token: str
    user: UserOut


class CommentCreate(BaseModel):
    content: str


class CommentOut(BaseModel):
    id: int
    content: str
    author: UserOut
    created_at: datetime.datetime


class ResourceOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    resource_type: str
    course_code: Optional[str] = None
    file_url: Optional[str] = None
    content_text: Optional[str] = None
    routine: Optional[Dict] = None
    owner: UserOut
    upvote_count: int
    is_upvoted: bool = False
    comment_count: int
    created_at: datetime.datetime
