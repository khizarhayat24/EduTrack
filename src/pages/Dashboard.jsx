import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Upload, RefreshCw, BookOpen, CheckCircle, Zap, Target, TrendingUp } from 'lucide-react';
import { analyzeMaterials, auditRoutine } from '../api';

export default function Dashboard() {
  const [syllabusText, setSyllabusText] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [gapData, setGapData] = useState(null);
  const [routineData, setRoutineData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [completedActions, setCompletedActions] = useState({});

  useEffect(() => {
    auditRoutine({
      current_cgpa: 1.85,
      credits_earned: 30,
      target_cgpa: 2.50,
      current_courses: { "CS101_Databases": 4, "CS102_Data_Structures": 4 },
      weekly_logs: { "average_nightly_sleep_hours": 5.2, "lecture_attendance_rate_percentage": 72.0 }
    })
    .then(data => setRoutineData(data))
    .catch(err => console.error(err));
  }, []);

  const handleMaterialAuditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile || !syllabusText) {
      alert("Syllabus topics aur file dono zaruri hain.");
      return;
    }
    setLoading(true);
    try {
      const result = await analyzeMaterials(syllabusText, selectedFile);
      setGapData(result);
      setCompletedActions({});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleAction = (index) => {
    setCompletedActions(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const totalGaps = gapData?.missing_concepts?.length || 0;
  const fixedGaps = Object.values(completedActions).filter(Boolean).length;
  const coverageScore = totalGaps > 0 ? Math.round((fixedGaps / totalGaps) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans antialiased">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

        {/* HEADER */}
        <header className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-red-50 text-red-600 border border-red-200 rounded-full">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse inline-block" /> Probation Alert Active
            </span>
            <h1 className="text-2xl font-bold text-gray-900 mt-2">Study Gap Analyzer</h1>
            <p className="text-gray-500 text-sm">Upload your notes and syllabus — AI will tell you what's missing.</p>
          </div>

          {gapData && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 min-w-[200px]">
              <p className="text-xs font-semibold text-indigo-600 mb-2 uppercase tracking-wide">Progress</p>
              <div className="w-full bg-indigo-100 h-2.5 rounded-full overflow-hidden mb-2">
                <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${coverageScore}%` }} />
              </div>
              <p className="text-xs text-indigo-700 font-medium">{fixedGaps} of {totalGaps} gaps addressed — {coverageScore}%</p>
            </div>
          )}
        </header>

        {/* INPUT FORM */}
        <section className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Target className="w-5 h-5 text-indigo-500" />
            <h2 className="font-semibold text-gray-800">Check Your Study Material</h2>
          </div>

          <form onSubmit={handleMaterialAuditSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Syllabus Topics</label>
              <input
                type="text"
                required
                placeholder="e.g. ACID Transactions, Normalization, B-Trees"
                className="w-full text-sm px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                value={syllabusText}
                onChange={(e) => setSyllabusText(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Your Notes File</label>
              <div className="relative flex items-center bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 h-[46px] hover:border-indigo-400 cursor-pointer transition-colors">
                <Upload className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
                <span className="text-sm text-gray-500 truncate">{selectedFile ? selectedFile.name : "Upload .pdf or .txt file"}</span>
                <input type="file" required accept=".pdf,.txt" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => setSelectedFile(e.target.files[0])} />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-3 px-6 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Analyzing…</> : <><Zap className="w-4 h-4" /> Analyze My Notes</>}
            </button>
          </form>
        </section>

        {/* RESULTS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* MISSING TOPICS */}
          <div className="lg:col-span-2 bg-white border border-gray-200 shadow-sm rounded-2xl p-6 flex flex-col min-h-[320px]">
            <div className="flex items-center gap-2 mb-5 pb-4 border-b border-gray-100">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <h3 className="font-semibold text-gray-900">Missing Topics</h3>
              {gapData && (
                <span className="ml-auto text-xs bg-orange-50 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full font-medium">
                  {totalGaps} gaps found
                </span>
              )}
            </div>

            {!gapData ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <BookOpen className="w-10 h-10 text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium text-sm">No analysis yet</p>
                <p className="text-gray-400 text-xs mt-1">Upload your notes above to see what's missing from your syllabus.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {gapData.missing_concepts.map((concept, idx) => (
                  <div key={idx} className="p-4 bg-orange-50 border border-orange-100 rounded-xl border-l-4 border-l-orange-400">
                    <div className="flex justify-between items-start gap-3">
                      <h4 className="font-semibold text-gray-800 text-sm">{concept}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-orange-100 text-orange-600 rounded-md shrink-0">Missing</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1.5">{gapData.gaps_rationale[concept] || ""}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ACTION ITEMS */}
          <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-5 pb-4 border-b border-gray-100">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <h3 className="font-semibold text-gray-900">What to Study Next</h3>
            </div>

            {!gapData ? (
              <div className="flex-1 flex items-center justify-center text-center">
                <p className="text-gray-400 text-sm">Study recommendations will appear here after analysis.</p>
              </div>
            ) : (
              <div className="space-y-3 flex-1">
                {gapData.recommended_action_items.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => toggleAction(idx)}
                    className={`w-full text-left p-3.5 rounded-xl border text-sm flex items-start gap-3 transition-all ${
                      completedActions[idx]
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                      completedActions[idx] ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'
                    }`}>
                      {completedActions[idx] && <CheckCircle className="w-3 h-3 text-white" />}
                    </div>
                    <span className={completedActions[idx] ? 'line-through opacity-60' : ''}>{action}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Routine Section */}
            {routineData?.ai_routine_critique && (
              <div className="mt-5 pt-5 border-t border-gray-100">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-amber-500" />
                    <h4 className="text-sm font-semibold text-gray-700">Routine Score</h4>
                  </div>
                  <span className="text-sm font-bold bg-amber-50 text-amber-600 border border-amber-200 px-2.5 py-0.5 rounded-full">
                    {routineData.ai_routine_critique.routine_efficiency_score}/100
                  </span>
                </div>
                <div className="space-y-2">
                  {routineData.ai_routine_critique.bottlenecks_identified.map((b, i) => (
                    <div key={i} className="flex gap-2 items-start text-xs text-gray-600 bg-amber-50 border border-amber-100 rounded-lg p-2.5">
                      <span className="text-amber-500 shrink-0 mt-0.5">⚠</span>
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
