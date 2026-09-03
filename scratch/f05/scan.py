import re, io, os, glob, json
src = io.open('prisma/schema.prisma', encoding='utf-8').read()
# parse models
models = {}
for m in re.finditer(r'^model\s+(\w+)\s*\{(.*?)^\}', src, re.S | re.M):
    name, body = m.group(1), m.group(2)
    tbl = re.search(r'@@map\("([^"]+)"\)', body)
    models[name] = {'table': tbl.group(1) if tbl else name, 'body': body}
# required scalar-relation fields: "field  Model  @relation(...)" with no '?' and no '[]'
rel = {}
for name, d in models.items():
    for ln in d['body'].split('\n'):
        s = ln.strip()
        mm = re.match(r'^(\w+)\s+(\w+)(\??)(\[\])?\s', s + ' ')
        if not mm: continue
        f, typ, opt, lst = mm.groups()
        if typ not in models: continue
        rel.setdefault(name, []).append({'field': f, 'target': typ, 'req': (opt != '?' and not lst), 'list': bool(lst)})
print('MODELS', len(models), 'with-relations', len(rel))
json.dump({'models': {k: v['table'] for k, v in models.items()}, 'rel': rel}, io.open('scratch/f05/schema.json','w',encoding='utf-8'), ensure_ascii=False, indent=1)
