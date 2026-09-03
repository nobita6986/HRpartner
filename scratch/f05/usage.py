import re, io, json, glob, os
D = json.load(io.open('scratch/f05/danger.json', encoding='utf-8'))
fields = {}
for owner, lst in D.items():
    for f, tgt, tbl in lst:
        fields.setdefault(f, set()).add((owner, tgt, tbl))
files = []
for pat in ('src/**/*.ts', 'app/**/*.ts', 'app/**/*.tsx', 'src/**/*.tsx'):
    files += glob.glob(pat, recursive=True)
files = sorted(set(f.replace(chr(92),'/') for f in files if '.test.' not in f and '/node_modules/' not in f))
print('quet', len(files), 'tep nguon (bo test)')
hits = {}
for p in files:
    s = io.open(p, encoding='utf-8', errors='replace').read()
    if 'include' not in s and 'select' not in s: continue
    lines = s.split('\n')
    for i, ln in enumerate(lines):
        for f in fields:
            # field used as a key inside an include/select object literal
            if re.search(r'(^|[\s{,])' + re.escape(f) + r'\s*:\s*(true|\{)', ln):
                # look back up to 25 lines for include:/select:
                ctx = '\n'.join(lines[max(0,i-25):i+1])
                if re.search(r'\b(include|select)\s*:\s*\{', ctx):
                    hits.setdefault(p, []).append((i+1, f, ln.strip()[:110]))
for p in sorted(hits):
    print('\n--- ' + p)
    for n, f, ln in hits[p]:
        print('   :%-5d %-16s %s' % (n, f, ln))
print('\nTONG', sum(len(v) for v in hits.values()), 'diem tren', len(hits), 'tep')
json.dump({k: v for k, v in hits.items()}, io.open('scratch/f05/hits.json','w',encoding='utf-8'), ensure_ascii=False, indent=1)
