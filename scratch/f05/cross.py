import re, io, json, glob, os
S = json.load(io.open('scratch/f05/schema.json', encoding='utf-8'))
RLS = set(json.load(io.open('scratch/f05/rls.json', encoding='utf-8')))
models, rel = S['models'], S['rel']
# required relation fields whose TARGET table is RLS-covered
danger = {}
for owner, fields in rel.items():
    for f in fields:
        if f['req'] and models.get(f['target']) in RLS:
            danger.setdefault(owner, []).append((f['field'], f['target'], models[f['target']]))
print('=== QUAN HE BAT BUOC tro tay bang bi RLS (theo model chu) ===')
tot = 0
for k in sorted(danger):
    print('  %-26s owner_table=%-24s' % (k, models[k]), ', '.join('%s->%s(%s)' % t for t in danger[k]))
    tot += len(danger[k])
print('TONG', tot, 'truong tren', len(danger), 'model')
json.dump({k: danger[k] for k in danger}, io.open('scratch/f05/danger.json','w',encoding='utf-8'), ensure_ascii=False, indent=1)
