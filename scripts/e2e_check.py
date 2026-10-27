import subprocess
import sys
import time
import urllib.request
import json

def run_e2e_test():
    print("=== Resumio FFCS: End-to-End API Verification ===")
    port = 8009
    base_url = f"http://127.0.0.1:{port}"

    # 1. Start server subprocess
    env = dict(sys.path and dict(**{"PYTHONPATH": "D:/ffcs-maker"}))
    import os
    env = os.environ.copy()
    env["PYTHONPATH"] = "D:/ffcs-maker"
    cmd = [sys.executable, "run.py", "--no-browser", "--port", str(port)]
    print(f"Starting server on port {port}...")
    proc = subprocess.Popen(cmd, cwd="D:/ffcs-maker", env=env)

    try:
        # 2. Wait for server to respond
        server_ready = False
        health_data = None
        for attempt in range(25):
            time.sleep(0.4)
            try:
                with urllib.request.urlopen(f"{base_url}/api/health", timeout=2) as resp:
                    if resp.status == 200:
                        health_data = json.loads(resp.read().decode("utf-8"))
                        server_ready = True
                        break
            except Exception:
                continue

        if not server_ready:
            print("Error: Server failed to start within timeout.", file=sys.stderr)
            proc.kill()
            out, err = proc.communicate()
            print(f"Stdout: {out.decode('utf-8', errors='replace')}", file=sys.stderr)
            print(f"Stderr: {err.decode('utf-8', errors='replace')}", file=sys.stderr)
            sys.exit(1)

        print("Server is UP and responsive!")
        print(f"  Health Check: status={health_data.get('status')}, db_connected={health_data.get('database_connected')}")
        assert health_data.get("database_connected") is True

        # 3. Hit /api/courses
        with urllib.request.urlopen(f"{base_url}/api/courses?limit=5", timeout=5) as resp:
            assert resp.status == 200
            courses_data = json.loads(resp.read().decode("utf-8"))
            print(f"  Courses Check: total={courses_data.get('total')}, returned={len(courses_data.get('items', []))}")
            assert courses_data.get("total", 0) > 0

        # 4. Hit /api/slots/grid
        with urllib.request.urlopen(f"{base_url}/api/slots/grid", timeout=5) as resp:
            assert resp.status == 200
            grid_data = json.loads(resp.read().decode("utf-8"))
            print(f"  Slots Grid Check: total_slots={grid_data.get('metadata', {}).get('total_slots')}")
            assert grid_data.get("metadata", {}).get("total_slots", 0) > 0

        print("\nAll E2E checks passed successfully! Stopping server...")

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except Exception:
            proc.kill()

    print("=== E2E Test Complete: OK ===")

if __name__ == "__main__":
    run_e2e_test()
