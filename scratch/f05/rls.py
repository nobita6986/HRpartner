import re, io, glob, json
tables = set()
for f in glob.glob('prisma/migrations/*/migration.sql'):
    s = io.open(f, encoding='utf-8', errors='replace').read()
    for m in re.finditer(r'ALTER\s+TABLE\s+(?:ONLY\s+)?"?(?:public"?\.)?"?(\w+)"?\s+(?:ENABLE|FORCE)\s+ROW\s+LEVEL\s+SECURITY', s, re.I):
        tables.add(m.group(1))
print(len(tables), 'bang bi RLS')
print(' '.join(sorted(tables)))
json.dump(sorted(tables), io.open('scratch/f05/rls.json','w',encoding='utf-8'))
