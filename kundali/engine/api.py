from __future__ import annotations

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from .server import calculate_kundali, init_engine

init_engine()

class Handler(BaseHTTPRequestHandler):
    def _json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path != "/api/kundali/calculate":
            return self._json(404, {"error": "Not found"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            data = json.loads(self.rfile.read(length) or b"{}")
            result = calculate_kundali(
                data["date"], data.get("time", "12:00:00"),
                float(data["latitude"]), float(data["longitude"]),
                float(data.get("timezoneOffsetHours", 5.75)),
                data.get("ayanamsa", "lahiri"), data.get("node", "mean"),
            )
            self._json(200, {"ok": True, "data": result})
        except Exception as exc:
            self._json(400, {"ok": False, "error": str(exc)})

    def log_message(self, *_):
        pass

if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", 8787), Handler).serve_forever()
