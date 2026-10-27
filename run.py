import argparse
import socket
import sys
import threading
import time
import webbrowser
import uvicorn

def is_port_free(host: str, port: int) -> bool:
    """Checks whether a TCP port is available on the given host."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        try:
            s.bind((host, port))
            return True
        except socket.error:
            return False

def find_available_port(host: str, start_port: int, max_attempts: int = 10) -> int:
    """Finds the next available port starting from start_port."""
    for p in range(start_port, start_port + max_attempts):
        if is_port_free(host, p):
            return p
    return start_port

def open_browser_delayed(url: str, delay_seconds: float = 1.0):
    def _open():
        time.sleep(delay_seconds)
        try:
            webbrowser.open(url)
        except Exception:
            pass
    thread = threading.Thread(target=_open, daemon=True)
    thread.start()

def main():
    parser = argparse.ArgumentParser(description="Run the local Resumio FFCS Timetable Maker server.")
    parser.add_argument("--host", default="127.0.0.1", help="Host address to bind (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8000, help="Port to listen on (default: 8000)")
    parser.add_argument("--dev", action="store_true", help="Run with auto-reload for development")
    parser.add_argument("--no-browser", action="store_true", help="Do not automatically open browser")
    args = parser.parse_args()

    target_port = args.port
    if not is_port_free(args.host, target_port):
        next_free = find_available_port(args.host, target_port + 1)
        print(f"Warning: Port {target_port} is already in use by another process.", file=sys.stderr)
        print(f"Automatically switching to next available port: {next_free}", file=sys.stderr)
        target_port = next_free

    url = f"http://{args.host}:{target_port}"
    print("=" * 60)
    print("  Resumio FFCS: Personal Timetable Maker & Review Platform")
    print(f"  Local Server:  {url}")
    print(f"  API Docs:      {url}/docs")
    print(f"  Health Status: {url}/api/health")
    print("=" * 60)

    if not args.no_browser:
        open_browser_delayed(url)

    uvicorn.run(
        "backend.app:app",
        host=args.host,
        port=target_port,
        reload=args.dev,
        log_level="info"
    )

if __name__ == "__main__":
    main()
