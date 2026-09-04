"""
Robotics Lab Portal Server
Serves the learning dashboard on http://localhost:8000 and synchronizes user notes to local disk.
"""

import http.server
import json
import os
import socketserver
import sys

PORT = 8000
HERE = os.path.dirname(os.path.abspath(__file__))
NOTES_DIR = os.path.join(HERE, "notes")
NOTES_JSON = os.path.join(NOTES_DIR, "portal_state.json")
SCRATCHPAD_MD = os.path.join(NOTES_DIR, "scratchpad.md")

os.makedirs(NOTES_DIR, exist_ok=True)


class PortalRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=HERE, **kwargs)

    def do_GET(self):
        if self.path == "/api/status":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"status":"connected"}')
            return
        elif self.path == "/favicon.ico":
            self.send_response(204)
            self.end_headers()
            return
        elif self.path == "/api/get_notes":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            if os.path.exists(NOTES_JSON):
                with open(NOTES_JSON, "r", encoding="utf-8") as f:
                    self.wfile.write(f.read().encode("utf-8"))
            else:
                self.wfile.write(b"{}")
            return
        return super().do_GET()

    def do_POST(self):
        if self.path == "/api/save_notes":
            content_length = int(self.headers.get("Content-Length", 0))
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode("utf-8"))
                scratchpad = data.get("scratchpad", "")

                # 1. Save machine-readable state JSON
                with open(NOTES_JSON, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)

                # 2. Save clean human-readable Scratchpad Markdown
                with open(SCRATCHPAD_MD, "w", encoding="utf-8") as f:
                    f.write("# Laboratory Scratchpad & Notes\n\n")
                    f.write(f"> Last synced: {data.get('timestamp', 'unknown')}\n\n")
                    f.write(scratchpad.strip() + "\n")

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"status":"saved"}')
                return
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
                return

        self.send_response(404)
        self.end_headers()


def run_server():
    socketserver.TCPServer.allow_reuse_address = True
    try:
        with socketserver.TCPServer(("", PORT), PortalRequestHandler) as httpd:
            print("=" * 65)
            print("  ROBOTICS LAB // DASHBOARD SERVER RUNNING")
            print(f"  Access the dashboard at: http://localhost:{PORT}")
            print(f"  Scratchpad synced to: {SCRATCHPAD_MD}")
            print("  Press Ctrl+C to stop.")
            print("=" * 65)
            httpd.serve_forever()
    except OSError as e:
        if "address already in use" in str(e).lower() or e.errno in (98, 10048):
            print(f"Port {PORT} is busy, attempting port {PORT + 1}...")
            with socketserver.TCPServer(("", PORT + 1), PortalRequestHandler) as httpd:
                print(f"Access dashboard at: http://localhost:{PORT + 1}")
                httpd.serve_forever()
        else:
            raise e


if __name__ == "__main__":
    run_server()
