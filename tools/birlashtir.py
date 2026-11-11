# Eski izohlar (.izohlar.old.json) bilan yangi yig'ilganlarni (.izohlar.json) birlashtiradi (takrorlarsiz).
# Ishlatish: python -X utf8 tools/birlashtir.py
import json, os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
old = json.load(open(os.path.join(D, '.izohlar.old.json'), encoding='utf8'))
new = json.load(open(os.path.join(D, '.izohlar.json'), encoding='utf8'))
key = lambda c: c.get('cid') or ('re', c.get('re'), c['u'], c['t'])
seen = set(); out = []
for c in old + new:   # eski oldin: keyingi (yangi) istak ustun bo'ladi
    k = key(c)
    if k in seen: continue
    seen.add(k); out.append(c)
tmp = os.path.join(D, '.izohlar.json.tmp')
json.dump(out, open(tmp, 'w', encoding='utf8'), ensure_ascii=False); os.replace(tmp, os.path.join(D, '.izohlar.json'))
print('eski:', len(old), 'yangi:', len(new), 'jami:', len(out), "qo'shildi:", len(out) - len(old))
