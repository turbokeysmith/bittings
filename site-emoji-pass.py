#!/usr/bin/env python
# One-time pass: replace decorative EMOJI with clean inline SVGs (or remove) across the
# whole site, so every page matches the premium look. Protects data-i18n / data-i18n-html
# attribute VALUES (SEO rule: never change those). Keeps typographic → ← and the ★ review star.
import glob, re, sys

def svg(paths, stroke=True, color='#C2C6CA', sw='1.7'):
    style = 'display:inline-block;vertical-align:-.15em'
    if stroke:
        return (f'<svg class="emi" viewBox="0 0 24 24" width="1em" height="1em" style="{style}" '
                f'fill="none" stroke="{color}" stroke-width="{sw}" stroke-linecap="round" '
                f'stroke-linejoin="round" aria-hidden="true">{paths}</svg>')
    return (f'<svg class="emi" viewBox="0 0 24 24" width="1em" height="1em" style="{style}" '
            f'fill="{color}" aria-hidden="true">{paths}</svg>')

CAR   = svg('<path d="M3 13l1.6-4.2A2 2 0 016.5 7.6h11A2 2 0 0119.4 9L21 13"/><path d="M2.5 13h19v4h-19z"/><circle cx="7" cy="17.5" r="1.3"/><circle cx="17" cy="17.5" r="1.3"/>')
HOUSE = svg('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>')
BLDG  = svg('<path d="M4 21V5a1 1 0 011-1h9a1 1 0 011 1v16"/><path d="M15 9h4a1 1 0 011 1v11"/><path d="M2 21h20"/><path d="M7.5 8h2M7.5 12h2M7.5 16h2"/>')
ALERT = svg('<path d="M12 3l9 16H3z"/><path d="M12 9v5"/><circle cx="12" cy="16.6" r=".5" fill="#C2C6CA" stroke="none"/>')
CARD  = svg('<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 9.5h19"/><path d="M6 14.5h4"/>')
SHIELD= svg('<path d="M12 3l8 3v5c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z"/><path d="M8.7 12l2.3 2.3L15.5 9.7"/>')
CLOCK = svg('<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5l3 2"/>')
VAN   = svg('<path d="M2 7h11v9H2z"/><path d="M13 10h4.2l2.8 3v3H13z"/><circle cx="6.5" cy="16" r="1.4"/><circle cx="17" cy="16" r="1.4"/>')
CHAT  = svg('<path d="M4 5h16a1 1 0 011 1v9a1 1 0 01-1 1H9l-4 4V6a1 1 0 011-1z"/>')
ENV   = svg('<path d="M3 6h18v12H3z"/><path d="M3 7l9 6 9-6"/>')
STAR  = svg('<path d="M12 3.2l2.6 5.6 6 .7-4.4 4.2 1.1 6L12 16.9 6.7 19.7l1.1-6L3.4 9.5l6-.7z"/>', stroke=False, color='#C2C6CA')
GREEN = svg('<circle cx="12" cy="12" r="7"/>', stroke=False, color='#3ddc97')
CHECK = svg('<path d="M5 13l4 4L19 7"/>', color='#3ddc97')

# emoji (with optional trailing VARIATION SELECTOR U+FE0F) -> replacement
RAW = {
    '\U0001F697': CAR, '\U0001F3E0': HOUSE, '\U0001F3E2': BLDG, '\U0001F6A8': ALERT,
    '\U0001F4B3': CARD, '\U0001F6E1': SHIELD, '\U0001F552': CLOCK, '\U0001F690': VAN,
    '\U0001F4AC': CHAT, '✉': ENV, '⭐': STAR, '\U0001F7E2': GREEN, '✅': CHECK,
    # decorative award/header prefixes -> remove (and a trailing space if present)
    '\U0001F3C6': '', '\U0001F3E1': '', '⚠': '',
}

PROT = re.compile(r'data-i18n(?:-html)?="[^"]*"')

def process(text):
    # 1) protect data-i18n attribute values
    store = []
    def stash(m):
        store.append(m.group(0)); return f'\x00{len(store)-1}\x00'
    text = PROT.sub(stash, text)
    # 2) replace emoji (each optionally followed by FE0F; trim one following space for removals)
    n = 0
    for emo, rep in RAW.items():
        for variant in (emo + '️', emo):
            if rep == '':
                # drop the emoji and a single following space if present
                pat = re.compile(re.escape(variant) + r'\s?')
            else:
                pat = re.compile(re.escape(variant))
            text, c = pat.subn(rep, text)
            n += c
    # 3) restore protected attrs
    text = re.sub(r'\x00(\d+)\x00', lambda m: store[int(m.group(1))], text)
    return text, n

total_files = total_repl = 0
for p in glob.glob('site/**/*.html', recursive=True):
    s = open(p, encoding='utf-8').read()
    out, n = process(s)
    if n:
        open(p, 'w', encoding='utf-8').write(out)
        total_files += 1; total_repl += n
print('files changed:', total_files, ' emoji replaced:', total_repl)
