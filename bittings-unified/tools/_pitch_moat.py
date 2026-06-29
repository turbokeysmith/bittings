#!/usr/bin/env python3
"""Re-capture the 3 "moat" screens with intelligence showing: Commission ledger
(stubbed cloud RPC), Lishi VIN result, Programmers VIN coverage. Run after
_pitch_shots.py — overwrites those 3 PNGs in pitch-screenshots/."""
import json, pathlib, datetime
from playwright.sync_api import sync_playwright

BASE = "http://10.42.39.168:8088/bittings-app"
OUT = pathlib.Path(__file__).parent / "pitch-screenshots"
SEED = (pathlib.Path(__file__).parent / "_pitch-seed.js").read_text(encoding="utf-8")

# ---- per-tech commission ledger rows (shape TKS.Commission.dayRows returns) ----
def commission_rows():
    techs = [("t_mike", "Mike Reyes"), ("t_carlos", "Carlos Vega"), ("t_tyler", "Tyler Boggs")]
    bases = {"t_mike": [620, 845, 410, 730, 905, 540],
             "t_carlos": [480, 360, 690, 815, 270, 600],
             "t_tyler": [300, 0, 520, 410, 0, 380]}
    today = datetime.date(2026, 6, 25)
    rows = []
    days = [today - datetime.timedelta(days=d) for d in range(6)]
    for tid, tname in techs:
        for i, day in enumerate(days):
            base = bases[tid][i]
            if base == 0:
                continue
            comm = round(base * 0.18)
            met = base >= 350
            held = 0
            if i == 1 and tid == "t_mike":
                held = round(comm * 0.4)  # one job pending manager sign-off
            rows.append({
                "tech_id": tid, "tech_name": tname, "day": day.isoformat(),
                "base_cents": base * 100, "commission_cents": comm * 100,
                "held_cents": held * 100, "met_min": met,
            })
    return rows

CROWS = json.dumps(commission_rows())

def main():
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        ctx = b.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=2)
        ctx.route("**/*.supabase.co/**", lambda r: r.abort())
        ctx.add_init_script(SEED)
        page = ctx.new_page()

        # ---------- 09 Commission ----------
        page.goto(f"{BASE}/index.html?go=commission", wait_until="domcontentloaded", timeout=20000)
        page.wait_for_timeout(1200)
        page.evaluate(
            "(rows)=>{ window.TKS.Commission.dayRows = function(){ return Promise.resolve({data:rows}); };"
            " if(window.renderCommission) return renderCommission(); }", json.loads(CROWS))
        page.wait_for_timeout(1400)
        page.screenshot(path=str(OUT / "09-commission.png"), full_page=True)
        print("ok   09-commission")

        # ---------- 13 Lishi & Keys (Honda Civic 2012) ----------
        page.goto(f"{BASE}/lishi.html", wait_until="domcontentloaded", timeout=20000)
        page.wait_for_timeout(1200)
        page.evaluate("""()=>{
            try{ document.getElementById('mode').value='veh'; }catch(e){}
            try{ document.getElementById('vehPick').style.display='flex'; }catch(e){}
            var mk=document.getElementById('fMake'); if(mk){ mk.value='Honda'; }
            try{ populateModels(); }catch(e){}
            var md=document.getElementById('fModel'); if(md){ md.value='Civic'; }
            var yr=document.getElementById('fYear'); if(yr){ yr.value='2012'; }
            try{ runVehSearch(); }catch(e){}
            document.getElementById('vinIn').value='2HGFG3B59CH512345';
            document.getElementById('lookMsg').innerHTML='Decoded VIN \\u2192 <b>2012 Honda Civic</b> \\u00b7 keyway, Lishi pick &amp; code series below';
        }""")
        page.wait_for_timeout(1200)
        page.screenshot(path=str(OUT / "13-lishi-keys.png"), full_page=True)
        print("ok   13-lishi-keys")

        # ---------- 14 Programmers (Ford F-150 2018) ----------
        page.goto(f"{BASE}/programmers.html", wait_until="domcontentloaded", timeout=20000)
        page.wait_for_timeout(1200)
        page.evaluate("""()=>{
            var mk=document.getElementById('fMake'); if(mk){ mk.value='Ford'; }
            var yr=document.getElementById('fYear'); if(yr){ yr.value='2018'; }
            try{ runLookup(); }catch(e){}
            document.getElementById('vinIn').value='1FTEW1EP5JFA12345';
            var m=document.getElementById('lookMsg');
            m.innerHTML='Decoded VIN \\u2192 <b>2018 Ford F-150</b> \\u00b7 '+m.textContent;
        }""")
        page.wait_for_timeout(1200)
        page.screenshot(path=str(OUT / "14-programmers.png"), full_page=True)
        print("ok   14-programmers")

        b.close()
    print("Done — 3 moat screens re-captured in", OUT)

if __name__ == "__main__":
    main()
