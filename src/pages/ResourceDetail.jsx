import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Star, Send, Trophy, Download, FileText, Clock, Trash2 } from "lucide-react";
import { getResource, getComments, addComment, toggleUpvote, deleteResource } from "../api";
import { useAuth } from "../AuthContext";

export default function ResourceDetail() {
  const { id } = useParams();
  const [resource, setResource] = useState(null);
  const [comments, setComments] = useState([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(true);
  const [posting, setPosting] = useState(false);
  const commentsEndRef = useRef(null);
  const { user } = useAuth();

  const load = async () => {
    setBusy(true);
    try {
      const [res, comms] = await Promise.all([getResource(id), getComments(id)]);
      setResource(res);
      setComments(comms);
    } catch {}
    setBusy(false);
  };

  useEffect(() => { load(); }, [id]);

  const handleUpvote = async () => {
    if (!user) return;
    try {
      const result = await toggleUpvote(id);
      setResource((r) => ({ ...r, is_upvoted: result.upvoted, upvote_count: result.upvote_count }));
    } catch {}
  };

  const handleComment = async () => {
    if (!draft.trim() || !user || posting) return;
    setPosting(true);
    try {
      const c = await addComment(id, draft.trim());
      setComments((prev) => [...prev, c]);
      setResource((r) => ({ ...r, comment_count: r.comment_count + 1 }));
      setDraft("");
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch {}
    setPosting(false);
  };

  if (busy) return (
    <div className="max-w-3xl mx-auto px-4 py-16 flex justify-center">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!resource) return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center text-slate-400">Resource not found.</div>
  );

  const isOwner = user && user.id === resource.owner.id;

  const routineData = resource.routine;

  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <Link to="/hub" className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Hub
      </Link>

      {/* Resource card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                {resource.resource_type}
              </span>
              {resource.course_code && (
                <span className="text-xs font-mono text-slate-500 bg-slate-800 px-2 py-0.5 rounded-md">
                  {resource.course_code}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-extrabold text-white">{resource.title}</h1>
            {resource.description && (
              <p className="text-slate-400 text-sm mt-2">{resource.description}</p>
            )}
          </div>

          {isOwner && (
            <button
              onClick={async () => {
                if (!window.confirm("Delete this resource?")) return;
                await deleteResource(id).catch(() => {});
                window.history.back();
              }}
              className="text-slate-500 hover:text-rose-400 p-2 rounded-lg hover:bg-rose-500/10"
              title="Delete resource"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Owner */}
        <Link to={`/toppers/${resource.owner.id}`}
          className="flex items-center gap-3 p-3 bg-slate-950/60 rounded-xl hover:bg-slate-800/60 transition-colors">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {resource.owner.name[0].toUpperCase()}
          </div>
          <div>
            <p className="text-white text-sm font-semibold flex items-center gap-1.5">
              {resource.owner.name} <Trophy className="w-3 h-3 text-amber-400" />
            </p>
            {resource.owner.university && <p className="text-slate-500 text-xs">{resource.owner.university}</p>}
          </div>
        </Link>

        {/* Content */}
        {resource.content_text && (
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3 text-slate-400">
              <FileText className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Notes</span>
            </div>
            <pre className="text-slate-300 text-sm whitespace-pre-wrap font-sans leading-relaxed">
              {resource.content_text}
            </pre>
          </div>
        )}

        {resource.file_url && (
          <a
            href={`http://127.0.0.1:8000${resource.file_url}`}
            download
            className="flex items-center gap-3 p-4 bg-slate-950/80 border border-slate-800 rounded-xl hover:border-indigo-500/50 transition-colors"
          >
            <Download className="w-5 h-5 text-indigo-400" />
            <div>
              <p className="text-white text-sm font-semibold">Download file</p>
              <p className="text-slate-500 text-xs">{resource.file_url.split("/").pop()}</p>
            </div>
          </a>
        )}

        {/* Routine display */}
        {routineData && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Weekly Study Routine</span>
            </div>
            {DAYS.map((day) => {
              const slots = routineData[day] || routineData[day.toLowerCase()];
              if (!slots || slots.length === 0) return null;
              return (
                <div key={day} className="bg-slate-950/60 rounded-xl p-3 border border-slate-800">
                  <p className="text-slate-300 text-xs font-bold uppercase tracking-wider mb-2">{day}</p>
                  <div className="space-y-1.5">
                    {slots.map((slot, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <span className="text-slate-500 font-mono text-xs w-20 shrink-0">{slot.time || "—"}</span>
                        <span className="text-slate-200">{slot.activity || slot}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 border-t border-slate-800 pt-4">
          <button
            onClick={handleUpvote}
            disabled={!user}
            title={!user ? "Sign in to upvote" : ""}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              resource.is_upvoted ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "bg-slate-800 text-slate-400 hover:text-indigo-400"
            } ${!user ? "cursor-not-allowed opacity-50" : ""}`}
          >
            <Star className={`w-4 h-4 ${resource.is_upvoted ? "fill-indigo-400" : ""}`} />
            {resource.upvote_count} Upvotes
          </button>
          <span className="text-xs text-slate-500">
            {new Date(resource.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </span>
        </div>
      </div>

      {/* Comments */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5">
        <h2 className="text-white font-bold">Comments ({comments.length})</h2>

        {comments.length === 0 && (
          <p className="text-slate-500 text-sm py-4 text-center">No comments yet. Be the first to ask or contribute!</p>
        )}

        <div className="space-y-4">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-xs shrink-0">
                {c.author.name[0].toUpperCase()}
              </div>
              <div className="flex-1 bg-slate-950/60 rounded-xl p-3 border border-slate-800">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-slate-200 text-sm font-semibold">{c.author.name}</span>
                  {c.author.is_topper && <Trophy className="w-3 h-3 text-amber-400" />}
                  <span className="text-slate-600 text-xs ml-auto">
                    {new Date(c.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-slate-300 text-sm">{c.content}</p>
              </div>
            </div>
          ))}
          <div ref={commentsEndRef} />
        </div>

        {user ? (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
              {user.name[0].toUpperCase()}
            </div>
            <div className="flex-1 flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleComment()}
                placeholder="Add a comment or question…"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleComment}
                disabled={!draft.trim() || posting}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <p className="text-slate-500 text-sm text-center py-2">
            <Link to="/hub" className="text-indigo-400 hover:underline">Sign in</Link> to join the discussion.
          </p>
        )}
      </div>
    </div>
  );
}
