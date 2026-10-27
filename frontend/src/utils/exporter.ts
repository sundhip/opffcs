import { GeneratedTimetable } from "../types";

export type ExportFormat = "excel" | "csv" | "pdf" | "png" | "bundle";

export async function downloadTimetableExport(
  timetable: GeneratedTimetable,
  format: ExportFormat,
  onProgress?: (loading: boolean) => void
): Promise<void> {
  if (onProgress) onProgress(true);

  try {
    const endpoint = `/api/exports/${format}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        timetable,
        scale: 2
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: "Export failed" }));
      throw new Error(err.detail || "Export failed");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;

    const extension = format === "bundle" ? "zip" : format === "excel" ? "xlsx" : format;
    const ttId = timetable.timetable_id || "timetable";
    a.download = `${ttId}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } finally {
    if (onProgress) onProgress(false);
  }
}

export async function downloadFavouritesZip(favouriteIds?: string[]): Promise<void> {
  const response = await fetch("/api/exports/favourites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ favourite_ids: favouriteIds })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: "Export failed" }));
    throw new Error(err.detail || "Favourites export failed");
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "favourites_bundle.zip";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
