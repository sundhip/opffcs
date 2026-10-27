const API_BASE = "/api";
async function fetchJson(url, options) {
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
        }
        catch {
            // Keep default errorMsg
        }
        throw new Error(errorMsg);
    }
    return res.json();
}
export const api = {
    // Courses
    async getCourses(search) {
        const q = search ? `?search=${encodeURIComponent(search)}` : "";
        return fetchJson(`${API_BASE}/courses${q}`);
    },
    async getCourseOfferings(courseId) {
        return fetchJson(`${API_BASE}/courses/${encodeURIComponent(courseId)}/offerings`);
    },
    // Faculty
    async getFacultyList(params) {
        const sp = new URLSearchParams();
        if (params?.search)
            sp.set("search", params.search);
        if (params?.minRating !== undefined)
            sp.set("min_rating", params.minRating.toString());
        if (params?.hasReviewsOnly)
            sp.set("has_reviews_only", "true");
        if (params?.sortBy)
            sp.set("sort_by", params.sortBy);
        if (params?.limit)
            sp.set("limit", params.limit.toString());
        if (params?.offset)
            sp.set("offset", params.offset.toString());
        return fetchJson(`${API_BASE}/faculty?${sp.toString()}`);
    },
    async getFacultyDetail(facultyId, search, limit = 20, offset = 0) {
        const sp = new URLSearchParams({
            reviews_limit: limit.toString(),
            reviews_offset: offset.toString()
        });
        if (search)
            sp.set("search", search);
        return fetchJson(`${API_BASE}/faculty/${encodeURIComponent(facultyId)}?${sp.toString()}`);
    },
    async compareFaculty(facultyIds) {
        return fetchJson(`${API_BASE}/faculty/compare?faculty_ids=${encodeURIComponent(facultyIds.join(","))}`);
    },
    // Slots
    async getSlotGrid() {
        return fetchJson(`${API_BASE}/slots/grid`);
    },
    // Favourites
    async getFavourites() {
        return fetchJson(`${API_BASE}/favourites`);
    },
    async addFavourite(offeringKey, name, notes, payload) {
        return fetchJson(`${API_BASE}/favourites`, {
            method: "POST",
            body: JSON.stringify({ offering_key: offeringKey, name, notes, payload })
        });
    },
    async updateFavourite(favId, name, notes) {
        return fetchJson(`${API_BASE}/favourites/${encodeURIComponent(favId)}`, {
            method: "PATCH",
            body: JSON.stringify({ name, notes })
        });
    },
    async deleteFavourite(favId) {
        return fetchJson(`${API_BASE}/favourites/${encodeURIComponent(favId)}`, {
            method: "DELETE"
        });
    },
    // Matches
    async getMatchQueue(statusFilter, limit = 50, offset = 0) {
        const sp = new URLSearchParams({
            limit: limit.toString(),
            offset: offset.toString()
        });
        if (statusFilter)
            sp.set("status_filter", statusFilter);
        return fetchJson(`${API_BASE}/matches/queue?${sp.toString()}`);
    },
    async decideMatch(reviewId, decision, facultyId, notes) {
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
    async startGeneration(req) {
        return fetchJson(`${API_BASE}/generate`, {
            method: "POST",
            body: JSON.stringify(req)
        });
    },
    async getGenerationJob(jobId) {
        return fetchJson(`${API_BASE}/generate/${encodeURIComponent(jobId)}`);
    },
    async cancelGenerationJob(jobId) {
        return fetchJson(`${API_BASE}/generate/${encodeURIComponent(jobId)}`, {
            method: "DELETE"
        });
    }
};
