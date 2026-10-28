import React, { useEffect } from "react";
import { useAppStore, NavTab } from "./store/useAppStore";
import { Planner } from "./components/planner/Planner";
import { ResultsBrowser } from "./components/results/ResultsBrowser";
import { FacultyView } from "./components/faculty/FacultyView";
import { FavouritesPage } from "./components/favourites/FavouritesPage";
import { MatchResolutionPage } from "./components/matches/MatchResolutionPage";
import { DataManagementPage } from "./components/data/DataManagementPage";
import {
  Layers,
  Calendar,
  User,
  Star,
  Archive,
  HelpCircle,
  Moon,
  Sun,
  ShieldCheck,
  Activity,
  UploadCloud,
  Database
} from "lucide-react";

export const App: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    theme,
    toggleTheme,
    isLoadingData,
    loadInitialData,
    generationResult,
    favourites
  } = useAppStore();

  useEffect(() => {
    loadInitialData();
  }, []);

  const validCount = generationResult?.total_valid ?? 0;
  const favCount = favourites.length;

  return (
    <div className={`min-h-screen flex flex-col ${theme === "dark" ? "bg-[#000000] text-neutral-100" : "bg-neutral-50 text-neutral-900"}`}>
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-[#09090c]/95 backdrop-blur-md border-b border-neutral-800 no-print">
        <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-amber-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base tracking-tight text-white font-sans">
                  OP <span className="text-amber-400">FFCS</span>
                </h1>
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold uppercase tracking-wider">
                  VIT Local
                </span>
              </div>
              <span className="text-[10px] text-neutral-400 block -mt-0.5">
                Timetable Maker & Review Platform
              </span>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-[#141419] p-1 rounded-xl border border-neutral-800">
            <button
              onClick={() => setActiveTab("planner")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === "planner"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-neutral-300 hover:text-white hover:bg-neutral-800"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Planner
            </button>

            <button
              onClick={() => setActiveTab("results")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === "results"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-neutral-300 hover:text-white hover:bg-neutral-800"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Timetables
              {validCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-indigo-950 text-indigo-300 border border-indigo-700/60 text-[10px] rounded-full font-mono font-bold">
                  {validCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("faculty")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === "faculty"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-neutral-300 hover:text-white hover:bg-neutral-800"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Faculty & Reviews
            </button>

            <button
              onClick={() => setActiveTab("saved")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === "saved" || activeTab === "favourites"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-neutral-300 hover:text-white hover:bg-neutral-800"
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              Saved
              {favCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] rounded-full font-mono font-bold">
                  {favCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("data")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === "data"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-neutral-300 hover:text-white hover:bg-neutral-800"
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              Upload & Data
            </button>

            <button
              onClick={() => setActiveTab("matches")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === "matches"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-neutral-300 hover:text-white hover:bg-neutral-800"
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Match Queue
            </button>
          </nav>

          {/* Right Toolbar: System Status & Theme */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-[#141419] border border-neutral-800 rounded-lg text-[11px] text-neutral-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>127.0.0.1:8000</span>
            </div>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-[#141419] hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition"
              aria-label="Toggle Theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-indigo-400" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1 pb-20 md:pb-8">
        {isLoadingData ? (
          <div className="max-w-md mx-auto py-24 text-center space-y-4">
            <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm text-slate-400 font-medium">
              Connecting to local database and loading courses...
            </p>
          </div>
        ) : (
          <>
            {activeTab === "planner" && <Planner />}
            {activeTab === "results" && <ResultsBrowser />}
            {activeTab === "faculty" && <FacultyView />}
            {(activeTab === "saved" || activeTab === "favourites") && <FavouritesPage />}
            {activeTab === "matches" && <MatchResolutionPage />}
            {activeTab === "data" && <DataManagementPage />}
          </>
        )}
      </main>

      {/* Mobile Sticky Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-1.5 flex justify-around items-center no-print">
        <button
          onClick={() => setActiveTab("planner")}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg text-[10px] font-semibold ${
            activeTab === "planner" ? "text-indigo-400" : "text-slate-400"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Planner</span>
        </button>

        <button
          onClick={() => setActiveTab("results")}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg text-[10px] font-semibold ${
            activeTab === "results" ? "text-indigo-400" : "text-slate-400"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Timetable</span>
        </button>

        <button
          onClick={() => setActiveTab("faculty")}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg text-[10px] font-semibold ${
            activeTab === "faculty" ? "text-indigo-400" : "text-slate-400"
          }`}
        >
          <User className="w-4 h-4" />
          <span>Faculty</span>
        </button>

        <button
          onClick={() => setActiveTab("saved")}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg text-[10px] font-semibold ${
            activeTab === "saved" || activeTab === "favourites" ? "text-indigo-400" : "text-slate-400"
          }`}
        >
          <Archive className="w-4 h-4" />
          <span>Saved</span>
        </button>

        <button
          onClick={() => setActiveTab("data")}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg text-[10px] font-semibold ${
            activeTab === "data" ? "text-indigo-400" : "text-slate-400"
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload</span>
        </button>
      </nav>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 bg-slate-950 text-slate-500 text-xs no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>OP FFCS: 100% Offline & Local-First • Zero Cloud Telemetry</span>
          </div>
          <span>Brute-Force Oracle Verified • 720-bit Clash Detection</span>
        </div>
      </footer>
    </div>
  );
};
