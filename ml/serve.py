"""Optional loopback research API with live triage. Never logs request bodies. Not a production service."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import argparse, json, time, threading, queue, logging
from pathlib import Path
from predict import predict, load_bundle
from live_data import read_live
from triage import classify_vitals, classify_ml_signals, overall_triage

# ── SSE broadcast state ──────────────────────────────────────────────────────
_sse_lock = threading.Lock()
_sse_clients: list = []
_last_health_status: dict = {}

def model_status():
    models = {}
    for task in ('sepsis', 'diabetes'):
        try:
            bundle = load_bundle(Path(__file__).with_name('artifacts') / f'{task}_xgboost.joblib')
            report = bundle['report']
            models[task] = {'status': 'ready', 'algorithm': report['selected'],
                            'test': report['test'], 'external_site_B': report.get('external_site_B'),
                            'use': 'illustrative_demo_only' if task == 'sepsis' else 'survey_research_only'}
        except Exception:
            models[task] = {'status': 'unavailable', 'reason': 'Train with the pinned ML environment.'}
    return models

def _run_ml_on_live(measurements: dict) -> dict:
    """Kiosk snapshots satisfy neither model's training context."""
    return {"sepsis": None, "diabetes": None}


def compute_health_status() -> dict:
    """Fetch live readings and describe unsupported model context explicitly."""
    live = read_live()
    measurements = live.get("measurements", {})
    fetched_at = live.get("fetched_at", int(time.time() * 1000))
    source_status = live.get("status", "unavailable")
    sources = live.get("sources", {})

    # Run ML models on live readings
    ml_scores = _run_ml_on_live(measurements)

    # Triage classification
    vital_signals = classify_vitals(measurements)
    ml_signals = classify_ml_signals(ml_scores)
    triage = overall_triage(vital_signals, ml_signals)

    return {
        "fetched_at": fetched_at,
        "source_status": source_status,
        "sources": sources,
        "measurements": measurements,
        "ml_scores": ml_scores,
        "triage": triage,
    }


def _background_refresh(interval: int = 5):
    """Continuously refresh health status and broadcast to SSE clients."""
    global _last_health_status
    while True:
        try:
            status = compute_health_status()
            with _sse_lock:
                _last_health_status = status
            payload = "data: " + json.dumps(status, allow_nan=False) + "\n\n"
            encoded = payload.encode()
            with _sse_lock:
                for messages in _sse_clients:
                    try:
                        messages.put_nowait(encoded)
                    except queue.Full:
                        # A slow reader may skip an old update; never block other clients.
                        try:
                            messages.get_nowait()
                        except queue.Empty:
                            pass
                        messages.put_nowait(encoded)
        except Exception:
            logging.exception("Live refresh failed")
        time.sleep(interval)


# ── HTTP Handler ─────────────────────────────────────────────────────────────
class Handler(BaseHTTPRequestHandler):
    def reply(self, code, body):
        data = json.dumps(body, allow_nan=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def send_file(self, path: Path, mime: str):
        data = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", mime)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        path = self.path.split("?")[0]

        # ── Main console dashboard ─────────────────────────────────────────
        if path in ("/", "/console", "/console.html"):
            self.send_file(Path(__file__).with_name("console.html"), "text/html; charset=utf-8")
            return

        # ── Static JS helper ───────────────────────────────────────────────
        if path == "/live-console.js":
            self.send_file(Path(__file__).with_name("live-console.js"), "text/javascript; charset=utf-8")
            return

        # ── Health status (one-shot JSON) ──────────────────────────────────
        if path == "/health-status":
            try:
                self.reply(200, compute_health_status())
            except Exception as exc:
                self.reply(502, {"error": str(exc)})
            return

        # ── SSE stream ─────────────────────────────────────────────────────
        if path == "/stream":
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("X-Accel-Buffering", "no")
            self.end_headers()
            messages = queue.Queue(maxsize=1)
            self.connection.settimeout(15)
            with _sse_lock:
                current = _last_health_status
                _sse_clients.append(messages)
            try:
                self.wfile.write(b": connected\n\n")
                if current:
                    self.wfile.write(("data: " + json.dumps(current, allow_nan=False) + "\n\n").encode())
                self.wfile.flush()
                while True:
                    try:
                        encoded = messages.get(timeout=10)
                    except queue.Empty:
                        encoded = b": keep-alive\n\n"
                    self.wfile.write(encoded)
                    self.wfile.flush()
            except (OSError, TimeoutError):
                pass
            finally:
                with _sse_lock:
                    _sse_clients.remove(messages)
            return

        # ── Live readings (raw) ────────────────────────────────────────────
        if path == "/live":
            try:
                self.reply(200, read_live())
            except Exception as exc:
                self.reply(502, {"error": str(exc)})
            return

        # ── Example payloads ───────────────────────────────────────────────
        if path in ("/examples/diabetes", "/examples/sepsis-demo"):
            name = path.rsplit("/", 1)[1]
            self.send_file(
                Path(__file__).with_name("examples") / f"{name}.json",
                "application/json"
            )
            return

        # ── Health check ───────────────────────────────────────────────────
        if path == "/health":
            models = model_status()
            ready = all(model['status'] == 'ready' for model in models.values())
            self.reply(200 if ready else 503, {"status": "ready" if ready else "degraded", "research_only": True, "models": models})
            return

        self.reply(404, {"error": "Not found"})

    def do_POST(self):
        if self.path != "/predict":
            self.reply(404, {"error": "Not found"})
            return
        self.connection.settimeout(15)
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size <= 0 or size > 16384:
                self.reply(413, {"error": "JSON body must be 1–16384 bytes"})
                return
            body = json.loads(self.rfile.read(size))
            self.reply(200, predict(body))
        except TimeoutError:
            self.reply(408, {"error": "Request body timed out"})
        except (ValueError, TypeError):
            self.reply(400, {"error": "Invalid JSON request"})

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def log_message(self, *args):
        pass


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8001)
    parser.add_argument("--refresh", type=int, default=5, help="SSE refresh interval in seconds")
    args = parser.parse_args()
    if args.refresh < 1:
        parser.error("--refresh must be at least 1 second")

    print(f"[MEDIKET ML] Research API       : http://127.0.0.1:{args.port}", flush=True)
    print(f"[MEDIKET ML] Live dashboard     : http://127.0.0.1:{args.port}/", flush=True)
    print(f"[MEDIKET ML] Health-status API  : http://127.0.0.1:{args.port}/health-status", flush=True)
    print(f"[MEDIKET ML] SSE stream         : http://127.0.0.1:{args.port}/stream", flush=True)
    print(f"[MEDIKET ML] Refresh interval   : {args.refresh}s  (MEDIKET must be on port 3002)", flush=True)

    # Start background refresh thread
    t = threading.Thread(target=_background_refresh, args=(args.refresh,), daemon=True)
    t.start()

    ThreadingHTTPServer(("127.0.0.1", args.port), Handler).serve_forever()
