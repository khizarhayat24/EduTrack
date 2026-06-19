import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Trophy, Users, BookOpen, Star, Filter, ChevronRight } from "lucide-react";
import { getToppers, getResources, getCourses, toggleUpvote } from "../api";
import { useAuth } from "../AuthContext";

const TYPE_BADGE = {
  material: { label: "Material", color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" },
  routine: { label: "Routine", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  tip: { label: "Quick Tip", color: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
};

function ResourceCard({ r, onUpvote }) {
  const { user } = useAuth();
  const badge = TYPE_BADGE[r.resource_type] || TYPE_BADGE.material;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3 hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badge.color}`}>
          {badge.label}
        </span>
        {r.course_code && (
          <span className="text-[10px] font-mono text-slate-500">{r.course_code}</span>
        )}
      </div>

      <div>
        <h3 className="text-white font-semibold text-sm leading-snug">{r.title}</h3>
        {r.description && <p className="text-slate-400 text-xs mt-1 line-clamp-2">{r.description}</p>}
      </div>

      <div className="flex items-center gap-2 mt-auto">
        <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
          {r.owner.name[0].toUpperCase()}
        </div>
        <span className="text-slate-400 text-xs truncate">{r.owner.name}</span>
        <Trophy className="w-3 h-3 text-amber-400 shrink-0" />
      </div>

      <div className="flex items-center gap-3 border-t border-slate-800 pt-3">
        <button
          onClick={() => onUpvote(r.id)}
          className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg transition-colors ${
            r.is_upvoted ? "text-indigo-400 bg-indigo-500/10" : "text-slate-500 hover:text-indigo-400"
          } ${!user ? "cursor-not-allowed opacity-50" : ""}`}
          disabled={!user}
          title={!user ? "Sign in to upvote" : ""}
        >
          <Star className={`w-3.5 h-3.5 ${r.is_upvoted ? "fill-indigo-400" : ""}`} />
          {r.upvote_count}
        </button>
        <span className="text-slate-600 text-xs">{r.comment_count} comments</span>
        <Link to={`/resources/${r.id}`}
          className="ml-auto text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 font-medium">
          View <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

function TopperCard({ t }) {
  return (
    <Link to={`/toppers/${t.id}`}
      className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-amber-500/40 transition-colors flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-indigo-600 flex items-center justify-center text-white font-extrabold text-lg">
          {t.name[0].toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-white font-bold text-sm">{t.name}</span>
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
          </div>
          {t.university && <p className="text-slate-500 text-xs truncate">{t.university}</p>}
        </div>
      </div>

      <div className="flex gap-4 text-center text-xs">
        <div>
          <p className="text-white font-bold">{t.cgpa?.toFixed(2) ?? "—"}</p>
          <p className="text-slate-500">CGPA</p>
        </div>
        <div>
          <p className="text-white font-bold">{t.resource_count}</p>
          <p className="text-slate-500">Resources</p>
        </div>
        <div>
          <p className="text-white font-bold">{t.follower_count}</p>
          <p className="text-slate-500">Followers</p>
        </div>
      </div>

      {t.bio && <p className="text-slate-400 text-xs line-clamp-2">{t.bio}</p>}

      <span className="text-xs text-indigo-400 font-medium flex items-center gap-0.5">
        View profile <ChevronRight className="w-3 h-3" />
      </span>
    </Link>
  );
}

export default function TopperHub() {
  const [tab, setTab] = useState("resources"); // resources | toppers
  const [resources, setResources] = useState([]);
  const [toppers, setToppers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState("");
  const [course, setCourse] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sort, setSort] = useState("newest");
  const [busy, setBusy] = useState(true);
  const { user } = useAuth();

  const load = async () => {
    setBusy(true);
    try {
      const [res, tops, c] = await Promise.all([
        getResources({ search: search || undefined, course: course || undefined, resource_type: typeFilter || undefined, sort }),
        getToppers({ search: search || undefined }),
        getCourses(),
      ]);
      setResources(res);
      setToppers(tops);
      setCourses(c);
    } catch {}
    setBusy(false);
  };

  useEffect(() => { load(); }, [search, course, typeFilter, sort]);

  const handleUpvote = async (id) => {
    if (!user) return;
    try {
      const result = await toggleUpvote(id);
      setResources((prev) =>
        prev.map((r) => r.id === id ? { ...r, is_upvoted: result.upvoted, upvote_count: result.upvote_count } : r)
      );
    } catch {}
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="text-left">
        <h1 className="text-3xl font-extrabold text-black">Toppers Hub</h1>
        <p className="text-slate-400 text-sm mt-1">Study resources and routines shared by high-achieving students.</p>
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search resources or toppers…"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {courses.length > 0 && (
          <select value={course} onChange={(e) => setCourse(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-sm text-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500">
            <option value="">All courses</option>
            {courses.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}

        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-sm text-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500">
          <option value="">All types</option>
          <option value="material">Material</option>
          <option value="routine">Routine</option>
          <option value="tip">Quick Tip</option>
        </select>

        <select value={sort} onChange={(e) => setSort(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-sm text-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500">
          <option value="newest">Newest</option>
          <option value="popular">Most popular</option>
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
        {[["resources", BookOpen, "Resources"], ["toppers", Trophy, "Toppers"]].map(([key, Icon, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === key ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {busy ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-slate-900/50 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : tab === "resources" ? (
        resources.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No resources found. Toppers haven't uploaded anything matching these filters yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.map((r) => <ResourceCard key={r.id} r={r} onUpvote={handleUpvote} />)}
          </div>
        )
      ) : (
        toppers.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No verified toppers yet. Students with CGPA ≥ 3.5 appear here automatically.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {toppers.map((t) => <TopperCard key={t.id} t={t} />)}
          </div>
        )
      )}
    </div>
  );
}
