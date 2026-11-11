# Izohlardagi istaklarni (qavat, qasr, rang, mashina, basseyn...) uylarga qo'llaydi.
# Ishlatish: python -X utf8 tools/istaklar.py [--yoz]
import json, re, sys, os, collections
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
com = json.load(open(os.path.join(D, '.izohlar.json'), encoding='utf8'))
data = json.load(open(os.path.join(D, 'data.json'), encoding='utf8'))
res = data['residents']; idx = {r['n'].lower(): i for i, r in enumerate(res) if r.get('n') and not r.get('d')}

NUM = {'bir': 1, 'ikki': 2, 'iki': 2, 'uch': 3, "to'rt": 4, 'tort': 4, 'besh': 5, 'olti': 6, 'yetti': 7, 'sakkiz': 8, "to'qqiz": 9, "o'n": 10,
       "to'r": 4, 'бир': 1, 'икки': 2, 'еки': 2, 'екі': 2, 'эки': 2, 'уч': 3, 'турт': 4, 'беш': 5}
COL = [('pushti|pink|розов', 'pushti'), ('binafsha|purple|фиолет', 'binafsha'), ('oltin|oltn|олтин|алтын|zoloto|gold|tilla', 'oltin'), ('qizil|красн', 'qizil'),
       ("ko'k|kok rang|moviy|голуб|син", "ko'k"), ('yashil|зелен', 'yashil'), ('sariq|жёлт|желт', 'sariq'), ("qora|qop qora|чёрн|черн|dark|qo'rqinch|qorqinch|mafiya uy", 'qora'), (r'\boq\b|oppoq|oquy|\bок\b|бел', 'oq')]
CAR = r"mashina|moshina|mosina|машин|bmw|malibu|malubu|gentra|jentra|jentira|gentira|bugatti|rolls|byd|gelik|gelek|mers|nexia|cobalt|tesla|lambo|ferrari"
FLOOR = r"(\d+|" + '|'.join(NUM) + r")\s*-?\s*(?:ta\s*)?(?:qavat|qavad|qvat|qabat|kavat|qayat|qatli|qa atli|etaj|itaj|etash|etosh|etak\b|taj|этаж|етаж|кават|қават|кабат|honali)"

def norm(t):
    t = re.sub(r"[ʻʼ’‘`´]", "'", t.lower())
    for a, b in (('õ', "o'"), ('ö', "o'"), ('ô', "o'"), ('ò', "o'"), ('ó', "o'"), ('ş', 'sh'), ('ı', 'i'), ('ğ', "g'"), ('ň', 'n'), ('ç', 'ch')): t = t.replace(a, b)
    return t

# Bino peshtoqidagi yozuv (kasb / biznes istaklari). Tartib muhim: aniqroqlari oldin.
SIGN = [
    (r"masjid|maschid|masjd|msjid|machit|\bmajid\b|мачит|масжд|масжид|мечет", 'MASJID'),
    (r"\bbank|\bbonk|банк", 'BANK'),
    (r"game ?club|gamer|geym|ko?mp[yi]?u?ter ?(x|h)on|komputer hon|kampitur|\bgg\b", 'GAME CLUB'),
    (r"avt[oa] ?salon|mashina salon|авт[оа] ?салон|афтоа? ?салон|mers bazasi", 'AVTOSALON'),
    (r"uchastkavoy|pal[ie]t[si]*iya|politsiya|militsiya|полиц", 'POLITSIYA'), (r"biznes", 'BIZNES MARKAZI'),
    (r"qassob", 'QASSOBXONA'), (r"sartarosh", 'SARTAROSHXONA'),
    (r"to'?y ?xona|туйхона", "TO'YXONA"), (r"shashlikxona", 'SHASHLIKXONA'), (r"restoran|ресторан|\bkafe", 'RESTORAN'),
    (r"sport ?zal|sport akadem|sport qura|sport sevar", 'SPORT ZAL'), (r"maktab|maktan\b|школ", 'MAKTAB'), (r"kutubxona", 'KUTUBXONA'),
    (r"stomatolog", 'STOMATOLOGIYA'), (r"shifoxona|kasalxona|bolnitsa", 'SHIFOXONA'),
    (r"\bo'?fis\b|офис", 'OFIS'), (r"mehmonxona|гостиниц|гаснитс|\bhotel|\botel\b", 'MEHMONXONA'), (r"zavo'?[dt]\b|завод", 'ZAVOD'),
    (r"tungi klub|night ?club", 'TUNGI KLUB'), (r"o'?quv markaz", "O'QUV MARKAZI"), (r"\bferma|\bfermer", 'FERMA'),
    (r"a[ei]r[oa]?port", 'AEROPORT'), (r"korzinka", 'KORZINKA'), (r"uzum market", 'UZUM MARKET'),
    (r"kiyim d[o'u]+k[oi]n", "KIYIM DO'KONI"), (r"telefon d[o'u]+k[oi]n", "TELEFON DO'KONI"), (r"skuter d[o'u]+k[oi]n", "SKUTER DO'KONI"),
    (r"\bsalon|салон", 'SALON'), (r"wi ?-?fi|vayfay|\bvi fi\b|вайфа", 'FREE WI-FI'),
]
def parse(t):
    t = re.sub(r"@[\w.]+", " ", norm(t)); w = {}
    m = re.search(FLOOR, t)
    if m:
        v = m.group(1); n = int(v) if v.isdigit() else NUM[v]
        w['f'] = n; w['l'] = 0 if n <= 1 else 1 if n == 2 else 2 if n <= 9 else 4
    if re.search(r"burj|xalifa|halifa|minora|efil|eyfel|eng baland|eng uzun|osmon|bulut|baland bino|kattakon bino|katta bino", t): w['l'] = 4
    if re.search(r"\bvip\b|вип|vep\b", t): w['l'] = 4
    if re.search(r"qasr|qasir|\bkasr\b|zamok|замок|🏰|tojmahal", t): w['l'] = 3
    if re.search(r"villa|vila\b|hashamat|shaxamat|dacha|katta hovli|kotta hovli|kattaa hovli|uchaska", t) and 'l' not in w: w['l'] = 1
    if re.search(r"basseyn|basen|bassen|baseyn|basein|bassien|basseн|бассейн", t): w['pool'] = 1
    if re.search(r"mushuk|mishuk|мушук|🐈|😸", t): w['cat'] = 1
    if re.search(r"daraxt|derah|bog'|bogladi", t): w['tree'] = 1
    if re.search(r"d[o'u]+k[oi]n|magazin|magzin|магазин|market|savdo|targov", t): w['shop'] = 1
    for pat, name in SIGN:
        if re.search(pat, t):
            w['sg'] = name
            if name == 'MASJID': w['dome'] = 1
            break
    if re.search(r"teskari", t): w['flip'] = 1
    if re.search(r"\d+ ?ta ot|chavondos", t): w['horse'] = 1
    if re.search(r"\bup mult", t): w['bal'] = 1
    if re.search(r"stad[iy]?[oi]n|station|futbol+ ?(maydon|dupil)|fudbol+ ?maydon|darvozabon|futbol(ch|is)|fudbolch", t): w['pitch'] = 1
    if 'l' not in w:  # o'lcham so'zlari (qavat/qasr/vip aytilmagan bo'lsa)
        if re.search(r"bal[a]?d(roq)? ?(uy|bino|beno)|shishadan|[bp]ulut|ninora|eng baland|b[uo]r[cg]h? ?[hxf]al|бурч", t): w['l'] = 4
        elif re.search(r"saroy|сарай|сорой|saltanat|eng (katta|kotta|zo'?r|chiroyli|boy)|premium|qimmatbaho|[hx]ashama[td]", t): w['l'] = 3
        elif re.search(r"k[o'u]+[pn]\.? ?(qavat|qatli|kavat)|коп ?кабат|\bbino\b|\bbeno\b|\bdom\b|\bдом\b", t): w['l'] = 2
        elif re.search(r"\bkat+a+\b|\bkot+a+\b|kattan|ката|ulkan|\bkeng\b|zamonaviy|hi ?tech|amerikan|rivojlangan|\bhovli", t): w['l'] = 1
        if 'l' in w: w['_weak'] = 1
    cm = re.search(CAR, t)
    for pat, name in COL:
        for mm in re.finditer(pat, t):
            after = t[mm.end():mm.end() + 18]
            if cm and re.search(CAR, after): w['carc'] = name
            elif 'w' not in w: w['w'] = name
    if cm: w['car'] = 1
    return w

wish = collections.OrderedDict(); src = {}
for c in sorted(com, key=lambda c: 0):
    if c['u'] == 'verte.uz': continue
    w = parse(c['t'])
    if not w: continue
    who = c['u'].lower()
    if who not in idx:  # izohda boshqa nik yozilgan bo'lsa
        for m in re.findall(r"@?([a-z0-9_.]{4,30})", c['t'].lower()):
            if m in idx: who = m; break
    if who not in idx: continue
    cur = wish.setdefault(who, {})
    if w.pop('_weak', 0) and 'l' in cur: w.pop('l')   # umumiy "katta uy" oldingi aniq istakni bosmasin
    cur.update(w); src[who] = c['t'].strip().replace('\n', ' ')[:140]

stat = collections.Counter()
for who, w in wish.items():
    for k, v in w.items(): stat[k if k not in ('l', 'w') else f'{k}={v}'] += 1
print('istak yozgan aholi:', len(wish)); print(dict(stat))
for who, w in list(wish.items())[:25]: print(who, w, '|', src[who][:70])
hok = [c['u'] for c in com if re.search(r"hokim|xokim|hakim|rais|prezident|prizdent|prizident|мэр", norm(c['t']))]
print('hokimlikka nomzodlar:', len(set(hok)))
if '--yoz' in sys.argv:
    for who, w in wish.items():
        r = res[idx[who]]
        if 'l' in w: r['l'] = w['l']
        x = {k: v for k, v in w.items() if k != 'l'}
        if x: r['c'] = x
        r['iz'] = src[who]
    data['candidates'] = sorted(set(hok))
    tmp = os.path.join(D, 'data.json.tmp'); json.dump(data, open(tmp, 'w', encoding='utf8'), ensure_ascii=False); os.replace(tmp, os.path.join(D, 'data.json'))
    print('data.json yangilandi')
