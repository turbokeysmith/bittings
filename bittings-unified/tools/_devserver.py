#!/usr/bin/env python3
"""No-cache LAN dev server for phone testing.

Serves the repo root on 0.0.0.0:8088 with caching fully disabled, so an
iPhone/Android always pulls the latest file on refresh (no stale CSS/JS).
Run: python _devserver.py
"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = 8088


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


if __name__ == "__main__":
    httpd = ThreadingHTTPServer(("0.0.0.0", PORT), NoCacheHandler)
    print("No-cache dev server on http://0.0.0.0:%d (Ctrl+C to stop)" % PORT, flush=True)
    httpd.serve_forever()
