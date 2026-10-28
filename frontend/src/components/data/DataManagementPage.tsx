import React, { useState, useEffect } from "react";
import { api } from "../../services/api";
import { useAppStore } from "../../store/useAppStore";
import {
  UploadCloud,
  FileSpreadsheet,
  FileArchive,
  CheckCircle2,
  AlertCircle,
  Database,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Layers,
  Users,
  MessageSquare
} from "lucide-react";

export const DataManagementPage: React.FC = () => {
  const { loadInitialData } = useAppStore();
  const [datasets, setDatasets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [datasetName, setDatasetName] = useState("");
  const [dryRun, setDryRun] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);

  const fetchDatasets = async () => {
    setIsLoading(true);
    try {
      const data = await api.getDatasets();
      setDatasets(data);
    } catch (err: any) {
      console.error("Failed to load datasets", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setDatasetName(file.name.replace(/\.[^/.]+$/, ""));
      setStatusMessage(null);
      setUploadResult(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setStatusMessage(null);
    setUploadResult(null);

    try {
      const res = await api.uploadDataset(selectedFile, datasetName || selectedFile.name, dryRun);
      setUploadResult(res);
      setStatusMessage({
        type: "success",
        text: dryRun
          ? "Validation passed! Dry-run report generated."
          : "Dataset uploaded and processed successfully!"
      });
      await fetchDatasets();
      if (!dryRun) {
        await loadInitialData();
      }
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to upload and process file."
      });
    } finally {
      setUploading(false);
    }
  };

  const handleActivate = async (datasetId: string) => {
    try {
      await api.activateDataset(datasetId);
      await fetchDatasets();
      await loadInitialData();
      setStatusMessage({
        type: "success",
        text: `Dataset ${datasetId} activated successfully.`
      });
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to activate dataset."
      });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-400" />
            Upload & Dataset Management
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Update course offerings from FFCS Excel files or refresh faculty review sentiment from WhatsApp ZIP archives.
          </p>
        </div>

        <button
          onClick={fetchDatasets}
          disabled={isLoading}
          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh Datasets
        </button>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center gap-3 ${
            statusMessage.type === "success"
              ? "bg-emerald-950/60 border-emerald-800 text-emerald-200"
              : "bg-rose-950/60 border-rose-800 text-rose-200"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Upload Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
          <UploadCloud className="w-4 h-4 text-indigo-400" />
          Upload New File (Excel / WhatsApp ZIP)
        </h3>

        <form onSubmit={handleUpload} className="space-y-4">
          <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-8 text-center transition bg-slate-950/40">
            <input
              type="file"
              id="dataset-file-input"
              accept=".xlsx,.xls,.zip"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="dataset-file-input"
              className="cursor-pointer flex flex-col items-center justify-center gap-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                {selectedFile?.name.endsWith(".zip") ? (
                  <FileArchive className="w-6 h-6" />
                ) : (
                  <FileSpreadsheet className="w-6 h-6" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">
                  {selectedFile ? selectedFile.name : "Click or drag to select an Excel (.xlsx) or WhatsApp (.zip) file"}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Supports VIT slot spreadsheets and de-duplicated chat archives with zero telemetry
                </p>
              </div>
              {selectedFile && (
                <span className="text-xs font-mono text-indigo-300 bg-indigo-950/60 px-2.5 py-1 rounded-md border border-indigo-800">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </span>
              )}
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Dataset Label</label>
              <input
                type="text"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                placeholder="e.g. Winter 2026 Course Master"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-4 pt-6">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dryRun}
                  onChange={(e) => setDryRun(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Dry Run / Validation Only (Do not commit to active DB)</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={!selectedFile || uploading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>{dryRun ? "Run Validation Check" : "Import & Apply Dataset"}</span>
                </>
              )}
            </button>
          </div>
        </form>

        {uploadResult && (
          <div className="mt-6 p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
            <div className="text-amber-400 font-bold mb-2">Import / Validation Summary:</div>
            <pre>{JSON.stringify(uploadResult, null, 2)}</pre>
          </div>
        )}
      </div>

      {/* Existing Datasets List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          Installed Datasets in SQLite
        </h3>

        {datasets.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">No datasets registered yet.</p>
        ) : (
          <div className="space-y-3">
            {datasets.map((d) => (
              <div
                key={d.id}
                className={`p-4 rounded-xl border transition-all flex flex-wrap items-center justify-between gap-4 ${
                  d.is_active
                    ? "bg-emerald-950/20 border-emerald-800/80 ring-1 ring-emerald-500/30"
                    : "bg-slate-850 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-sm text-slate-100">{d.name || d.id}</span>
                    {d.is_active && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase tracking-wider">
                        Active Dataset
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-1 flex flex-wrap items-center gap-3">
                    <span>ID: {d.id}</span>
                    <span>•</span>
                    <span>Imported: {new Date(d.imported_at).toLocaleString()}</span>
                    {d.stats && (
                      <>
                        <span>•</span>
                        <span className="text-indigo-300 font-semibold">
                          {d.stats.courses_count || d.stats.courses || 0} courses
                        </span>
                        <span>•</span>
                        <span className="text-amber-300 font-semibold">
                          {d.stats.offerings_count || d.stats.offerings || 0} offerings
                        </span>
                        <span>•</span>
                        <span className="text-emerald-300 font-semibold">
                          {d.stats.faculty_count || d.stats.faculty || 0} faculty
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {!d.is_active && (
                  <button
                    onClick={() => handleActivate(d.id)}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-emerald-500/50 rounded-xl text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition"
                  >
                    <span>Activate</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
