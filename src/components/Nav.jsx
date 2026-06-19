import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { GraduationCap, Trophy, LogOut, Upload, User, Menu, X } from "lucide-react";
import { useAuth } from "../AuthContext";
import AuthModal from "./AuthModal";

export default function Nav() {
  const { user, logout } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const loc = useLocation();

  const active = (path) => loc.pathname === path
    ? "text-indigo-600 border-b-2 border-indigo-500 font-semibold"
    : "text-gray-600 hover:text-indigo-600";

  return (
    <>
      <nav className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 text-indigo-600 font-extrabold text-lg shrink-0">
            <GraduationCap className="w-6 h-6" />
            <span className="text-gray-900">EduTrack</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden sm:flex items-center gap-6 text-sm">
            <Link to="/" className={`pb-1 ${active("/")}`}>Dashboard</Link>
            <Link to="/hub" className={`pb-1 ${active("/hub")}`}>Toppers Hub</Link>
            {user?.is_topper && (
              <Link to="/upload" className={`pb-1 ${active("/upload")}`}>Share Resource</Link>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex flex-col items-end leading-tight">
                  <span className="text-gray-800 text-xs font-semibold">{user.name}</span>
                  {user.is_topper && (
                    <span className="text-amber-600 text-[10px] font-bold flex items-center gap-1">
                      <Trophy className="w-2.5 h-2.5" /> Topper
                    </span>
                  )}
                </div>
                <button onClick={logout} title="Sign out"
                  className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button onClick={() => setShowAuth(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors">
                <User className="w-3.5 h-3.5" /> Sign in
              </button>
            )}

            {/* Mobile hamburger */}
            <button onClick={() => setMenuOpen(!menuOpen)}
              className="sm:hidden p-2 text-gray-500 hover:text-gray-800">
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="sm:hidden border-t border-gray-200 bg-white px-4 py-3 space-y-1">
            <Link to="/" onClick={() => setMenuOpen(false)} className="block py-2 text-sm text-gray-700">Dashboard</Link>
            <Link to="/hub" onClick={() => setMenuOpen(false)} className="block py-2 text-sm text-gray-700">Toppers Hub</Link>
            {user?.is_topper && (
              <Link to="/upload" onClick={() => setMenuOpen(false)} className="block py-2 text-sm text-gray-700">Share Resource</Link>
            )}
          </div>
        )}
      </nav>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}
