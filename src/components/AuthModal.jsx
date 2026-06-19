import { useState } from "react";
import { X, User, Lock, Mail, GraduationCap } from "lucide-react";
import { login, signup } from "../api";
import { useAuth } from "../AuthContext";

export default function AuthModal({ onClose }) {
  const [mode, setMode] = useState("login"); // login | signup
  const [form, setForm] = useState({ name: "", email: "", password: "", university: "", cgpa: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const { loginSuccess } = useAuth();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setErr(""); setBusy(true);
    try {
      let res;
      if (mode === "login") {
        res = await login(form.email, form.password);
      } else {
        if (!form.name || !form.email || !form.password) { setErr("Name, email and password are required."); return; }
        res = await signup({
          name: form.name, email: form.email, password: form.password,
          university: form.university || undefined,
          cgpa: form.cgpa ? parseFloat(form.cgpa) : undefined,
        });
      }
      loginSuccess(res.token, res.user);
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const Input = ({ icon: Icon, ...props }) => (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
      <input
        {...props}
        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-800">
          <h2 className="text-white font-bold text-lg">
            {mode === "login" ? "Sign in" : "Create account"}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          {mode === "signup" && (
            <Input icon={User} placeholder="Full name" value={form.name} onChange={set("name")} />
          )}
          <Input icon={Mail} type="email" placeholder="Email address" value={form.email} onChange={set("email")} />
          <Input icon={Lock} type="password" placeholder="Password" value={form.password} onChange={set("password")} />

          {mode === "signup" && (
            <>
              <Input icon={GraduationCap} placeholder="University (optional)" value={form.university} onChange={set("university")} />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-bold">GPA</span>
                <input
                  type="number" step="0.01" min="0" max="4" placeholder="CGPA e.g. 3.7 (optional)"
                  value={form.cgpa} onChange={set("cgpa")}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-14 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <p className="text-xs text-slate-500 -mt-1">
                CGPA ≥ 3.5 automatically grants Topper status so you can share resources with others.
              </p>
            </>
          )}

          {err && <p className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{err}</p>}

          <button
            onClick={submit} disabled={busy}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm"
          >
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>

          <p className="text-center text-sm text-slate-500">
            {mode === "login" ? "No account?" : "Already a member?"}{" "}
            <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setErr(""); }}
              className="text-indigo-400 hover:underline font-medium">
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
