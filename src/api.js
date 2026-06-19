const BASE = "http://127.0.0.1:8000";

function token() {
  return localStorage.getItem("tutor_token") || null;
}

function authHeaders() {
  const t = token();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { ...authHeaders(), ...(opts.headers || {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

// ── Auth ────────────────────────────────────────────────────────────────────
export const signup = (data) =>
  req("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

export const login = (email, password) =>
  req("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

export const getMe = () => req("/api/auth/me");

export const updateMe = (data) =>
  req("/api/auth/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

// ── Toppers hub ──────────────────────────────────────────────────────────────
export const getToppers = (params = {}) => {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v))
  ).toString();
  return req(`/api/toppers${qs ? `?${qs}` : ""}`);
};

export const getTopper = (id) => req(`/api/toppers/${id}`);
export const toggleFollow = (id) =>
  req(`/api/toppers/${id}/follow`, { method: "POST" });
export const getMyFollowing = () => req("/api/me/following");

// ── Resources ────────────────────────────────────────────────────────────────
export const getResources = (params = {}) => {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v))
  ).toString();
  return req(`/api/resources${qs ? `?${qs}` : ""}`);
};

export const getResource = (id) => req(`/api/resources/${id}`);
export const deleteResource = (id) =>
  req(`/api/resources/${id}`, { method: "DELETE" });
export const toggleUpvote = (id) =>
  req(`/api/resources/${id}/upvote`, { method: "POST" });
export const getCourses = () => req("/api/resources/courses");

export const createResource = (formData) =>
  req("/api/resources", { method: "POST", body: formData });

// ── Comments ─────────────────────────────────────────────────────────────────
export const getComments = (resourceId) =>
  req(`/api/resources/${resourceId}/comments`);
export const addComment = (resourceId, content) =>
  req(`/api/resources/${resourceId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });

// ── Material analysis (original feature) ────────────────────────────────────
export const analyzeMaterials = (syllabusText, file) => {
  const form = new FormData();
  form.append("syllabus_text", syllabusText);
  form.append("notes_file", file);
  return req("/api/analyze-materials", { method: "POST", body: form });
};

export const auditRoutine = (payload) =>
  req("/api/audit-routine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
