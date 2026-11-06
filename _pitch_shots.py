#!/usr/bin/env python3
"""Capture desktop investor-pitch screenshots of the staff app, pre-seeded as an
active shop. Run: python _pitch_shots.py"""
import os, sys, json, pathlib, datetime
from playwright.sync_api import sync_playwright

BASE = "http://10.42.39.168:8088/bittings-app"
OUT = pathlib.Path(__file__).parent / "pitch-screenshots"
OUT.mkdir(exist_ok=True)
SEED = (pathlib.Path(__file__).parent / "_pitch-seed.js").read_text(encoding="utf-8")

# Fabricated cloud transaction rows so Dashboard (revenue/jobs/tax) + Reports populate.
# Shape matches what dashTx + renderReports read: status, base_cents (incl. tax),
# tax_cents, method (reader/cash/check/keyed), technician, created_at (ISO).
def build_tx_rows():
    TAX = 0.08625
    techs = ["Mike Reyes", "Carlos Vega", "Tyler Boggs"]
    methods = ["reader", "cash", "reader", "reader", "check", "reader", "cash", "keyed"]
    bases = [369, 490, 75, 145, 475, 89, 210, 139, 255, 420, 600, 95, 65, 120]  # pre-tax $
    rows, now = [], datetime.datetime.utcnow()
    n = 0
    for day in range(13):
        per = 4 if day % 3 == 0 else 3
        for j in range(per):
            base = bases[(day * 3 + j) % len(bases)]
            tax = round(base * TAX, 2)
            dt = now - datetime.timedelta(days=day, hours=(8 + ((j * 3 + day) % 11)), minutes=(j * 17) % 60)
            rows.append({
                "id": f"tx_demo_{day}_{j}", "status": "completed",
                "method": methods[(day + j) % len(methods)],
                "technician": techs[(day + j) % len(techs)],
                "base_cents": int(round((base + tax) * 100)), "tax_cents": int(round(tax * 100)),
                "created_at": dt.replace(microsecond=0).isoformat() + "Z",
            })
            n += 1
    return rows

TX_ROWS = json.dumps(build_tx_rows())

# Keep ALL table data local (my seed) by blocking Supabase, then stub the single
# cloud call the Dashboard + Reports read (TKPay.dayTransactions) so those two
# financial screens still populate. Patch polls until pay.js has defined TKPay.
TX_PATCH = (
    "window.__PITCH_TX = " + TX_ROWS + ";\n"
    "(function(){function patch(){try{if(window.TKPay){"
    "window.TKPay.dayTransactions=function(fromISO,toISO){"
    "var r=window.__PITCH_TX.filter(function(t){return (!fromISO||t.created_at>=fromISO)&&(!toISO||t.created_at<toISO);});"
    "return Promise.resolve({rows:r});};return;}}catch(e){}setTimeout(patch,25);}patch();})();"
)

# name, url, optional wait-for selector, optional pre-shot JS click
SHOTS = [
    ("01-login",        f"{BASE}/cloud-test.html", None, False),
    ("02-start-a-job",  f"{BASE}/index.html?go=startjob",   "#view-startjob", True),
    ("03-register-pos", f"{BASE}/index.html?go=payments",   "#view-payments", True),
    ("04-customers",    f"{BASE}/index.html?go=customers",  "#view-customers", True),
    ("05-inventory",    f"{BASE}/index.html?go=inventory",  "#view-inventory", True),
    ("06-dashboard",    f"{BASE}/index.html?go=dashboard",  "#view-dashboard", True),
    ("07-closeout",     f"{BASE}/index.html?go=history",    "#view-history", True),
    ("08-reports",      f"{BASE}/index.html?go=reports",    "#view-reports", True),
    ("09-commission",   f"{BASE}/index.html?go=commission", "#view-commission", True),
    ("10-receipts",     f"{BASE}/bittings.html?receipts=1", None, False),
    ("11-doc-builder",  f"{BASE}/bittings.html",            None, False),
    ("12-scheduler",    f"{BASE}/scheduler.html",           None, False),
    ("13-lishi-keys",   f"{BASE}/lishi.html",               None, False),
    ("14-programmers",  f"{BASE}/programmers.html",          None, False),
    ("15-settings",     f"{BASE}/setup.html",               None, False),
    ("16-fleet",        f"{BASE}/fleet.html",               None, False),
]

def main():
    seed_login = "--login" in sys.argv
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=2)
        # block Supabase so every table reads my LOCAL seed (not empty cloud)
        ctx.route("**/*.supabase.co/**", lambda r: r.abort())
        ctx.add_init_script(SEED)
        ctx.add_init_script(TX_PATCH)   # stub the one cloud call Dashboard/Reports use
        page = ctx.new_page()
        for name, url, waitsel, full in SHOTS:
            try:
                page.goto(url, wait_until="domcontentloaded", timeout=20000)
                if waitsel:
                    try: page.wait_for_selector(waitsel, timeout=6000)
                    except Exception: pass
                page.wait_for_timeout(1600)
                shot = OUT / (name + ".png")
                page.screenshot(path=str(shot), full_page=full)
                print("ok  ", name, "->", shot.name)
            except Exception as e:
                print("FAIL", name, "::", repr(e)[:140])
        browser.close()
    print("\nDone. Files in", OUT)

if __name__ == "__main__":
    main()
