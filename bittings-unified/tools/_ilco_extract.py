# Extract Ilco 2025 Auto/Truck reference -> a clean code-series dataset for the app.
# model->make from the MODEL INDEX (authoritative); rows from pdfplumber tables.
import pdfplumber, re, json
PDF = r"C:\Users\sakar\Desktop\2025-auto-truck-key-blank-reference-guide.pdf"
pdf = pdfplumber.open(PDF)

MAKES = {"ACURA","AUDI","BMW","BUICK","CADILLAC","CHEVROLET","CHRYSLER","DODGE","EAGLE","FIAT","FORD",
"GENESIS","GEO","GMC","HONDA","HUMMER","HYUNDAI","INFINITI","ISUZU","JAGUAR","JEEP","KIA","LAND ROVER",
"LEXUS","LINCOLN","MAZDA","MERCEDES","MERCURY","MINI","MITSUBISHI","NISSAN","OLDSMOBILE","PLYMOUTH",
"PONTIAC","PORSCHE","RAM","SAAB","SATURN","SCION","SMART","SUBARU","SUZUKI","TESLA","TOYOTA",
"VOLKSWAGEN","VOLVO"}
makes_sorted = sorted(MAKES, key=len, reverse=True)
MK_ALT = "|".join(re.escape(m) for m in makes_sorted)

def norm_model(s):
    s = (s or "").upper().strip()
    s = re.sub(r"\bW/\s*PROX\b|\bW/\s*REGULAR IGNITION\b|\bW/\s*PUSH.*$|\(TRUCK\)|\(ALL\)|\(LAL\)|\bHYBRID\b|\bEV\b", "", s)
    s = re.sub(r"\b(CREW|CAB|EXTENDED|DOUBLE|REGULAR|QUAD|KING|SUPER ?CREW|SUPER ?CAB|PICKUP|PICK ?UP|SEDAN|COUPE|WAGON|CONVERTIBLE|HATCHBACK|TYPE \d)\b","",s)
    s = re.split(r"[,/]", s)[0]            # first model in a comma/slash list
    s = re.sub(r"\s*-\s*", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

# model -> make
model2make = {}
for idx in range(2, 12):
    t = (pdf.pages[idx].extract_text() or "")
    if "MAKE PAGE" not in t.upper().replace("\n"," ") and "MODEL INDEX" not in t.upper(): continue
    for ln in t.split("\n"):
        for mm in re.finditer(r"([A-Z0-9][A-Z0-9\.\-/ ,&]+?)\s+("+MK_ALT+r")\s+\d", ln):
            model = re.sub(r"^\d+(-\d+)?\s+","",mm.group(1)).strip()
            nm = norm_model(model)
            if nm and 1 < len(nm) < 28: model2make.setdefault(nm, mm.group(2).upper())

def clean(x): return re.sub(r"\s+"," ", (x or "").replace("\n"," ")).strip()
yr = re.compile(r"^(19|20)\d{2}$")
# a "code series" looks like A0001-A9999, 10,001-11,500, 1X-1706X, V0001-V5573 ...
ser_re = re.compile(r"^[A-Z0-9][A-Z0-9]{0,3}[\-,\d X]*\d")
# keyway tokens (Lishi/Ilco mechanical): HU101, HU100, B119, P1117 etc -> prefer HU/letters+digits
key_re = re.compile(r"\b(HU\d+[A-Z]?|HY\d+[A-Z]?|TOY\d+[A-Z]?|NSN\d+|DA\d+|FO\d+|GM\d+|B1\d\d|VAC\d+|SIP\d+)\b")
card_re = re.compile(r"^\d{2,5}[A-Z]?$")

rows = []
for idx in range(11, 132):
    for tb in (pdf.pages[idx].extract_tables() or []):
        if not tb or len(tb[0]) < 9: continue
        last = ""
        for row in tb:
            c = [clean(x) for x in row]
            if len(c) < 9: continue
            if c[0].upper().startswith("MODEL") or c[0].upper()=="LOCK": continue
            model = c[0] or last
            if c[0]: last = c[0]
            start, end, series = c[1], c[2], c[4]
            if not (yr.match(start) or yr.match(end)): continue
            if not series or not ser_re.match(series): continue
            joined = " ".join(c)
            kw = key_re.search(joined)
            cardm = next((x for x in reversed(c) if card_re.match(x)), "")
            transp = next((x for x in c if re.search(r"Encrypted|Philips|Texas Instruments|Hitag|Megamos|PCF\d", x)), "")
            nm = norm_model(model)
            make = model2make.get(nm) or model2make.get(nm.split(" ")[0])
            ys = start if yr.match(start) else end
            ye = end if yr.match(end) else start
            rows.append({"make":make,"model":nm,"model_raw":model,"ys":int(ys),"ye":int(ye),
                         "series":re.sub(r"\s*\(LAL\)","",series).strip(),
                         "card":cardm,"keyway":(kw.group(1) if kw else ""),"transp":transp})

# keep attributed + dedupe by (make,model,ys,ye), prefer one with keyway+card
rows = [r for r in rows if r["make"]]
best = {}
for r in rows:
    k=(r["make"],r["model"],r["ys"],r["ye"])
    if k not in best or (len(r["keyway"])+len(r["card"]) > len(best[k]["keyway"])+len(best[k]["card"])):
        best[k]=r
out = sorted(best.values(), key=lambda r:(r["make"],r["model"],r["ys"]))
json.dump(out, open(__file__.replace("_ilco_extract.py","_ilco_extracted.json"),"w"), indent=1)
print("model->make:",len(model2make)," | unique vehicle rows:",len(out),
      " | makes:",len({r['make'] for r in out}))
# validation
for mk,md in [("LINCOLN","MKS"),("LINCOLN","MKZ"),("CHEVROLET","SILVERADO"),("FORD","F 150"),("TOYOTA","CAMRY")]:
    h=[r for r in out if r["make"]==mk and md in r["model"]]
    print(f"\n{mk} {md} ({len(h)}):")
    for r in h[:5]: print(f"  {r['model']:16} {r['ys']}-{r['ye']} series={r['series']:18} card={r['card']:6} kw={r['keyway']}")
