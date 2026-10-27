import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, Any, Optional

from core.generator.models import GenerateRequest, GenerateResponse
from core.generator.search import TimetableSearchEngine

class GenerationJobManager:
    """
    Manages asynchronous timetable generation jobs so the REST API remains responsive.
    """
    def __init__(self, max_workers: int = 2):
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.jobs: Dict[str, Dict[str, Any]] = {}
        self.lock = threading.Lock()
        self.engine = TimetableSearchEngine()

    def submit_job(
        self,
        request: GenerateRequest,
        offerings_data: list,
        courses_metadata: dict,
        faculty_ratings: dict
    ) -> str:
        job_id = f"job_{uuid.uuid4().hex[:12]}"
        with self.lock:
            self.jobs[job_id] = {
                "id": job_id,
                "status": "running",
                "progress": 0.0,
                "result": None,
                "error": None,
                "cancelled": False
            }

        def worker_task():
            try:
                # Run search engine
                res = self.engine.generate(
                    request=request,
                    offerings_data=offerings_data,
                    courses_metadata=courses_metadata,
                    faculty_ratings=faculty_ratings
                )
                with self.lock:
                    if self.jobs[job_id]["cancelled"]:
                        self.jobs[job_id]["status"] = "cancelled"
                    else:
                        self.jobs[job_id]["status"] = "completed"
                        self.jobs[job_id]["progress"] = 1.0
                        self.jobs[job_id]["result"] = res.model_dump()
            except Exception as e:
                with self.lock:
                    self.jobs[job_id]["status"] = "failed"
                    self.jobs[job_id]["error"] = str(e)

        self.executor.submit(worker_task)
        return job_id

    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        with self.lock:
            return self.jobs.get(job_id)

    def cancel_job(self, job_id: str) -> bool:
        with self.lock:
            if job_id in self.jobs:
                self.jobs[job_id]["cancelled"] = True
                if self.jobs[job_id]["status"] == "running":
                    self.jobs[job_id]["status"] = "cancelled"
                return True
            return False

# Global singleton
job_manager = GenerationJobManager()
