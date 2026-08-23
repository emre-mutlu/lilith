# Chatterbox yerel TTS servisi — kalıcı resident süreç
# Kullanım: <chatterbox-venv>/bin/python server/chatterbox_service.py
# Port 8777 · POST /tts {text, exaggeration?, cfg_weight?, temperature?} → WAV bytes
# GET  /health → {"ok":true}
import io
import json
import os
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get("CHATTERBOX_PORT", "8777"))
REF_PATH = os.environ.get(
    "CHATTERBOX_REF",
    os.path.join(os.path.dirname(__file__), "..", "assets", "voices", "lilith-ref.wav"),
)

# --- su-işaretleyici uyumluluk yaması (perth 1.0.0'da yeni API yok) ---
import perth  # noqa: E402


class _NoopWatermarker:
    def apply_watermark(self, wav, sample_rate):
        return wav


perth.PerthImplicitWatermarker = _NoopWatermarker

import torch  # noqa: E402
import torchaudio  # noqa: E402

_ml = torch.device("mps") if torch.backends.mps.is_available() else torch.device("cpu")
_torch_load = torch.load


def _patched_load(*args, **kwargs):
    kwargs.setdefault("map_location", _ml)
    return _torch_load(*args, **kwargs)


torch.load = _patched_load

from chatterbox.mtl_tts import ChatterboxMultilingualTTS  # noqa: E402

print(f"[chatterbox] model yükleniyor (device={_ml})...", flush=True)
MODEL = ChatterboxMultilingualTTS.from_pretrained(device=str(_ml))
LOCK = threading.Lock()
print("[chatterbox] hazır ✓", flush=True)


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def _send(self, code, body: bytes, ctype="application/json"):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            self._send(200, b'{"ok":true}')
        else:
            self._send(404, b"{}")

    def do_POST(self):
        if self.path != "/tts":
            return self._send(404, b"{}")
        try:
            length = int(self.headers.get("Content-Length", 0))
            raw = self.rfile.read(length)
            req = json.loads(raw)
            text = (req.get("text") or "").strip()
            if not text:
                return self._send(400, b'{"error":"text zorunlu"}')
            ex = float(req.get("exaggeration", 1.2))
            cfg = float(req.get("cfg_weight", 0.2))
            temp = float(req.get("temperature", 0.85))

            with LOCK:
                wav = MODEL.generate(text, language_id="tr", audio_prompt_path=REF_PATH,
                                     exaggeration=ex, cfg_weight=cfg, temperature=temp)
                buf = io.BytesIO()
                torchaudio.save(buf, wav.cpu(), MODEL.sr, format="wav")
            self._send(200, buf.getvalue(), ctype="audio/wav")
        except Exception as e:  # noqa: BLE001
            print(f"[chatterbox] hata: {e}", flush=True)
            self._send(500, json.dumps({"error": str(e)[:200]}).encode())


if __name__ == "__main__":
    print(f"[chatterbox] dinleniyor: http://127.0.0.1:{PORT}", flush=True)
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
