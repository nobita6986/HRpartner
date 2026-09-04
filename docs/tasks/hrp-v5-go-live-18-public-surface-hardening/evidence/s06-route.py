# -*- coding: utf-8 -*-
# STEP-06 cua hrp-v5-go-live-18 / RQ-07 / DEC-09: nhanh 404 nhan Cache-Control: no-store.
import io

P = "app/api/public/applications/[trackingCode]/route.ts"
raw = io.open(P, "rb").read().decode("utf-8")
EOL = "\r\n" if "\r\n" in raw else "\n"
t0 = raw.replace("\r\n", "\n")

OLD = u"    return NextResponse.json({ error: 'NOT_FOUND', message: 'Application not found' }, { status: 404 });"
NEW = (u"    return NextResponse.json({ error: 'NOT_FOUND', message: 'Application not found' }, "
       u"{ status: 404, headers: { 'Cache-Control': 'no-store' } });")

assert t0.count(OLD) == 1, "404 branch not found exactly once"
t = t0.replace(OLD, NEW, 1)

# Than 404 KHONG doi mot byte: dung ba khoa cu, khong khoa moi (AC-11, DEC-09).
assert t.count(u"{ error: 'NOT_FOUND', message: 'Application not found' }") == 1
# Nhanh 200 khong doi.
assert t.count(u"  return NextResponse.json({ application: dto }, { headers: { 'Cache-Control': 'no-store' } });") == 1
# Dung MOT dong doi: moi dong khac giu nguyen.
a, b = t0.split(u"\n"), t.split(u"\n")
assert len(a) == len(b), "line count changed"
diff = [i for i in range(len(a)) if a[i] != b[i]]
assert diff == [t0.split(u"\n").index(OLD)], "unexpected changed lines: %r" % diff
print("STEP-06 OK line", diff[0] + 1, "| len", len(a[diff[0]]), "->", len(b[diff[0]]))

io.open(P, "wb").write(t.replace(u"\n", EOL).encode("utf-8"))
