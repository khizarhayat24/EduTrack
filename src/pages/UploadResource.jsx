import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Upload, Clock, FileText, Lightbulb, Plus, Trash2, ArrowLeft } from "lucide-react";
import { createResource } from "../api";
import { useAuth } from "../AuthContext";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function RoutineBuilder({ value, onChange }) {
  const addSlot = (day) => {
    const updated = { ...value, [day]: [...(value[day] || []), { time: "", activity: "" }] };
    onChange(updated);
  };
  const removeSlot = (day, idx) => {
    const updated = { ...value, [day]: value[day].filter((_, i) => i !== idx) };
    onChange(updated);
  };
  const updateSlot = (day, idx, field, val) => {
    const updated = { ...value, [day]: value[day].map((s, i) => i === idx ? { ...s, [field]: val } : s) };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {DAYS.map((day) => (
        <div key={day} className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-300 text-sm font-bold">{day}</span>
            <button type="button" onClick={() => addSlot(day)}
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300">
              <Plus className="w-3 h-3" /> Add slot
            </button>
          </div>
          {(value[day] || []).length === 0 ? (
            <p className="text-slate-600 text-xs">No slots — rest day or leave blank.</p>
          ) : (
            <div className="space-y-2">
              {(value[day] || []).map((slot, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input type="text" placeholder="9:00 AM" value={slot.time}
                    onChange={(e) => updateSlot(day, idx, "time", e.target.value)}
                    className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500" />
                  <input type="text" placeholder="e.g. Study Algorithms" value={slot.activity}
                    onChange={(e) => updateSlot(day, idx, "activity", e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500" />
                  <button type="button" onClick={() => removeSlot(day, idx)}
                    className="text-slate-600 hover:text-rose-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function UploadResource() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "", description: "", resource_type: "material", course_code: "", content_text: "",
  });
  const [file, setFile] = useState(null);
  const [routine, setRoutine] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  if (!user) return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
      <p className="text-slate-400">You need to be signed in to share resources.</p>
      <Link to="/hub" className="text-indigo-400 hover:underline text-sm">Go to Hub</Link>
    </div>
  );

  if (!user.is_topper) return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
        <span className="text-2xl">🏆</span>
      </div>
      <h2 className="text-white font-bold text-xl">Topper access required</h2>
      <p className="text-slate-400 text-sm max-w-md mx-auto">
        Only verified toppers (CGPA ≥ 3.5) can share resources. Make sure you've entered your CGPA in your profile — the system assigns topper status automatically.
      </p>
      <Link to="/hub" className="text-indigo-400 hover:underline text-sm">Back to Hub</Link>
    </div>
  );

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("resource_type", form.resource_type);
      if (form.description) fd.append("description", form.description);
      if (form.course_code) fd.append("course_code", form.course_code.toUpperCase());
      if (form.content_text) fd.append("content_text", form.content_text);
      if (form.resource_type === "routine") fd.append("routine_json", JSON.stringify(routine));
      if (file) fd.append("file", file);

      const res = await createResource(fd);
      navigate(`/resources/${res.id}`);
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  };

  const types = [
    { key: "material", icon: FileText, label: "Study Material", desc: "Notes, slides, or PDF" },
    { key: "routine", icon: Clock, label: "Study Routine", desc: "Weekly schedule" },
    { key: "tip", icon: Lightbulb, label: "Quick Tip", desc: "Strategy or advice" },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <Link to="/hub" className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Hub
      </Link>

      <div>
        <h1 className="text-2xl font-extrabold text-black">Share a Resource</h1>
        <p className="text-slate-400 text-sm mt-1">Help other students learn from what worked for you.</p>
      </div>

      <form onSubmit={submit} className="space-y-6">
        {/* Type picker */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Resource type</label>
          <div className="grid grid-cols-3 gap-3">
            {types.map(({ key, icon: Icon, label, desc }) => (
              <button key={key} type="button" onClick={() => setForm((f) => ({ ...f, resource_type: key }))}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition-colors ${
                  form.resource_type === key
                    ? "bg-indigo-600/20 border-indigo-500 text-white"
                    : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-600"
                }`}>
                <Icon className="w-5 h-5" />
                <span className="text-xs font-bold">{label}</span>
                <span className="text-[10px] text-slate-500">{desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Basic fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Title *</label>
            <input required value={form.title} onChange={set("title")} placeholder="e.g. My OS exam prep notes"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Course code</label>
              <input value={form.course_code} onChange={set("course_code")} placeholder="e.g. CS301"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description</label>
              <input value={form.description} onChange={set("description")} placeholder="Short description…"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
            </div>
          </div>
        </div>

        {/* Content by type */}
        {form.resource_type === "material" && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Upload file (PDF, TXT, etc.)</label>
              <div className="relative flex items-center gap-3 bg-slate-900 border border-dashed border-slate-700 rounded-xl px-4 py-4 hover:border-indigo-500 transition-colors">
                <Upload className="w-5 h-5 text-slate-500 shrink-0" />
                <span className="text-sm text-slate-400">{file ? file.name : "Click or drag to upload"}</span>
                <input type="file" accept=".pdf,.txt,.doc,.docx,.ppt,.pptx"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Or paste notes directly</label>
              <textarea value={form.content_text} onChange={set("content_text")} rows={6}
                placeholder="Paste your study notes here…"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none" />
            </div>
          </div>
        )}

        {form.resource_type === "tip" && (
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Your tip *</label>
            <textarea required value={form.content_text} onChange={set("content_text")} rows={5}
              placeholder="Share a study strategy, advice, or insight that helped you…"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none" />
          </div>
        )}

        {form.resource_type === "routine" && (
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Your weekly schedule</label>
            <RoutineBuilder value={routine} onChange={setRoutine} />
          </div>
        )}

        {err && (
          <p className="text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">{err}</p>
        )}

        <button type="submit" disabled={busy}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
          {busy ? (
            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Publishing…</>
          ) : "Publish Resource"}
        </button>
      </form>
    </div>
  );
}
