import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Trophy, Users, BookOpen, Star, UserPlus, UserMinus, ChevronRight, ArrowLeft } from "lucide-react";
import { getTopper, toggleFollow, toggleUpvote } from "../api";
import { useAuth } from "../AuthContext";

const TYPE_BADGE = {
  material: { label: "Material", color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" },
  routine: { label: "Routine", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  tip: { label: "Quick Tip", color: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
};

export default function TopperProfile() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(true);
  const [followBusy, setFollowBusy] = useState(false);
  const { user } = useAuth();

  const load = async () => {
    setBusy(true);
    try { setData(await getTopper(id)); } catch {}
    setBusy(false);
  };

  useEffect(() => { load(); }, [id]);

  const handleFollow = async () => {
    if (!user || followBusy) return;
    setFollowBusy(true);
    try {
      const res = await toggleFollow(id);
      setData((prev) => ({
        ...prev,
        topper: { ...prev.topper, is_following: res.following, follower_count: res.follower_count },
      }));
    } catch {}
    setFollowBusy(false);
  };

  const handleUpvote = async (resId) => {
    if (!user) return;
    try {
      const result = await toggleUpvote(resId);
      setData((prev) => ({
        ...prev,
        resources: prev.resources.map((r) =>
          r.id === resId ? { ...r, is_upvoted: result.upvoted, upvote_count: result.upvote_count } : r
        ),
      }));
    } catch {}
  };

  if (busy) return (
    <div className="max-w-4xl mx-auto px-4 py-16 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!data) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center text-slate-400">
      Topper not found.
    </div>
  );

  const { topper, resources } = data;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <Link to="/hub" className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Hub
      </Link>

      {/* Profile card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row gap-6 items-start">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-indigo-600 flex items-center justify-center text-white font-extrabold text-3xl shrink-0">
          {topper.name[0].toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-2xl font-extrabold text-white">{topper.name}</h1>
            <span className="flex items-center gap-1 text-amber-400 text-xs font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
              <Trophy className="w-3 h-3" /> Topper
            </span>
          </div>

          {topper.university && <p className="text-slate-400 text-sm">{topper.university}</p>}
          {topper.department && <p className="text-slate-500 text-xs">{topper.department}</p>}
          {topper.bio && <p className="text-slate-300 text-sm mt-3">{topper.bio}</p>}

          <div className="flex flex-wrap gap-6 mt-4 text-sm">
            <div>
              <span className="text-white font-bold text-xl">{topper.cgpa?.toFixed(2) ?? "—"}</span>
              <span className="text-slate-500 ml-1">CGPA</span>
            </div>
            <div>
              <span className="text-white font-bold text-xl">{topper.resource_count}</span>
              <span className="text-slate-500 ml-1">Resources</span>
            </div>
            <div>
              <span className="text-white font-bold text-xl">{topper.follower_count}</span>
              <span className="text-slate-500 ml-1">Followers</span>
            </div>
          </div>
        </div>

        {user && user.id !== topper.id && (
          <button
            onClick={handleFollow}
            disabled={followBusy}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shrink-0 transition-colors ${
              topper.is_following
                ? "bg-slate-800 text-slate-300 hover:bg-rose-500/20 hover:text-rose-400"
                : "bg-indigo-600 text-white hover:bg-indigo-500"
            }`}
          >
            {topper.is_following ? <><UserMinus className="w-4 h-4" /> Unfollow</> : <><UserPlus className="w-4 h-4" /> Follow</>}
          </button>
        )}
      </div>

      {/* Resources */}
      <div>
        <h2 className="text-black font-bold text-lg mb-4">Shared Resources ({resources.length})</h2>
        {resources.length === 0 ? (
          <div className="text-center py-12 text-slate-500 border border-slate-800 rounded-2xl">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>This topper hasn't shared anything yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {resources.map((r) => {
              const badge = TYPE_BADGE[r.resource_type] || TYPE_BADGE.material;
              return (
                <div key={r.id} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row gap-4 hover:border-slate-700 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badge.color}`}>
                        {badge.label}
                      </span>
                      {r.course_code && <span className="text-[10px] font-mono text-slate-500">{r.course_code}</span>}
                    </div>
                    <h3 className="text-white font-semibold">{r.title}</h3>
                    {r.description && <p className="text-slate-400 text-sm mt-1 line-clamp-2">{r.description}</p>}

                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                      <button
                        onClick={() => handleUpvote(r.id)}
                        disabled={!user}
                        className={`flex items-center gap-1 transition-colors ${r.is_upvoted ? "text-indigo-400" : "hover:text-indigo-400"} ${!user ? "cursor-not-allowed" : ""}`}
                      >
                        <Star className={`w-3.5 h-3.5 ${r.is_upvoted ? "fill-indigo-400" : ""}`} />
                        {r.upvote_count}
                      </button>
                      <span>{r.comment_count} comments</span>
                      <span>{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Link to={`/resources/${r.id}`}
                    className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-sm font-medium shrink-0 self-start sm:self-center">
                    Open <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
