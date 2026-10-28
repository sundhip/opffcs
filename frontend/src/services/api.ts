import {
  Course,
  Offering,
  FacultyDetail,
  GenerateRequest,
  GenerateResponse,
  FavouriteItem,
  MatchQueueItem
} from "../types";

const API_BASE = "/api";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {})
    }
  });

  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status} ${res.statusText}`;
    try {
      const errData = await res.json();
      if (errData && errData.detail) {
        errorMsg = typeof errData.detail === "string" ? errData.detail : JSON.stringify(errData.detail);
      }
    } catch {
      // Keep default errorMsg
    }
    throw new Error(errorMsg);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Courses
  async getCourses(search?: string): Promise<{ total: number; items: Course[] }> {
    const q = search ? `?search=${encodeURIComponent(search)}` : "";
    return fetchJson<{ total: number; items: Course[] }>(`${API_BASE}/courses${q}`);
  },

  async getCourseOfferings(courseId: string): Promise<Offering[]> {
    const res = await fetchJson<any>(`${API_BASE}/courses/${encodeURIComponent(courseId)}/offerings`);
    return Array.isArray(res) ? res : (res?.offerings || []);
  },

  // Faculty
  async getFacultyList(params?: {
    search?: string;
    minRating?: number;
    hasReviewsOnly?: boolean;
    sortBy?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ total: number; limit: number; offset: number; items: any[] }> {
    const sp = new URLSearchParams();
    if (params?.search) sp.set("search", params.search);
    if (params?.minRating !== undefined) sp.set("min_rating", params.minRating.toString());
    if (params?.hasReviewsOnly) sp.set("has_reviews_only", "true");
    if (params?.sortBy) sp.set("sort_by", params.sortBy);
    if (params?.limit) sp.set("limit", params.limit.toString());
    if (params?.offset) sp.set("offset", params.offset.toString());
    return fetchJson(`${API_BASE}/faculty?${sp.toString()}`);
  },

  async getFacultyDetail(
    facultyId: string,
    search?: string,
    limit: number = 30,
    offset: number = 0,
    reviewType?: string
  ): Promise<FacultyDetail> {
    const sp = new URLSearchParams({
      reviews_limit: limit.toString(),
      reviews_offset: offset.toString()
    });
    if (search) sp.set("search", search);
    if (reviewType) sp.set("review_type", reviewType);
    return fetchJson<FacultyDetail>(`${API_BASE}/faculty/${encodeURIComponent(facultyId)}?${sp.toString()}`);
  },

  async compareFaculty(facultyIds: string[]): Promise<{ count: number; items: any[] }> {
    return fetchJson<{ count: number; items: any[] }>(
      `${API_BASE}/faculty/compare?faculty_ids=${encodeURIComponent(facultyIds.join(","))}`
    );
  },

  // Slots
  async getSlotGrid(): Promise<{ total_slots: number; grid: any }> {
    return fetchJson<{ total_slots: number; grid: any }>(`${API_BASE}/slots/grid`);
  },

  // Favourites
  async getFavourites(): Promise<FavouriteItem[]> {
    return fetchJson<FavouriteItem[]>(`${API_BASE}/favourites`);
  },

  async addFavourite(
    offeringKey: string,
    name?: string,
    notes?: string,
    payload?: any
  ): Promise<{ status: string; id: string; offering_key: string }> {
    return fetchJson(`${API_BASE}/favourites`, {
      method: "POST",
      body: JSON.stringify({ offering_key: offeringKey, name, notes, payload })
    });
  },

  async updateFavourite(
    favId: string,
    name?: string,
    notes?: string
  ): Promise<{ status: string; id: string; name?: string; notes?: string }> {
    return fetchJson(`${API_BASE}/favourites/${encodeURIComponent(favId)}`, {
      method: "PATCH",
      body: JSON.stringify({ name, notes })
    });
  },

  async deleteFavourite(favId: string): Promise<{ status: string; id: string }> {
    return fetchJson(`${API_BASE}/favourites/${encodeURIComponent(favId)}`, {
      method: "DELETE"
    });
  },

  // Matches
  async getMatchQueue(
    statusFilter?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ total: number; limit: number; offset: number; items: MatchQueueItem[] }> {
    const sp = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString()
    });
    if (statusFilter) sp.set("status_filter", statusFilter);
    return fetchJson(`${API_BASE}/matches/queue?${sp.toString()}`);
  },

  async decideMatch(
    reviewId: string,
    decision: string,
    facultyId?: string,
    notes?: string
  ): Promise<any> {
    return fetchJson(`${API_BASE}/matches/decide`, {
      method: "POST",
      body: JSON.stringify({
        review_id: reviewId,
        decision,
        faculty_id: facultyId,
        notes
      })
    });
  },

  // Generator
  async startGeneration(req: GenerateRequest): Promise<{ job_id: string; status: string }> {
    return fetchJson<{ job_id: string; status: string }>(`${API_BASE}/generate`, {
      method: "POST",
      body: JSON.stringify(req)
    });
  },

  async getGenerationJob(jobId: string): Promise<{
    job_id: string;
    status: "pending" | "running" | "completed" | "failed" | "cancelled" | "time_limit_exceeded";
    created_at: string;
    result?: GenerateResponse;
    error?: string;
  }> {
    return fetchJson(`${API_BASE}/generate/${encodeURIComponent(jobId)}`);
  },

  async cancelGenerationJob(jobId: string): Promise<{ status: string }> {
    return fetchJson(`${API_BASE}/generate/${encodeURIComponent(jobId)}`, {
      method: "DELETE"
    });
  },

  // Datasets & Data Upload
  async getDatasets(): Promise<any[]> {
    return fetchJson<any[]>(`${API_BASE}/datasets`);
  },

  async uploadDataset(file: File, datasetName?: string, dryRun: boolean = false): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);
    if (datasetName) formData.append("dataset_name", datasetName);
    formData.append("dry_run", dryRun ? "true" : "false");
    formData.append("force", "true");

    const res = await fetch(`${API_BASE}/datasets/upload`, {
      method: "POST",
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Upload failed" }));
      throw new Error(err.detail || "Upload failed");
    }
    return res.json();
  },

  async activateDataset(datasetId: string): Promise<any> {
    return fetchJson(`${API_BASE}/datasets/${encodeURIComponent(datasetId)}/activate`, {
      method: "POST"
    });
  }
};
