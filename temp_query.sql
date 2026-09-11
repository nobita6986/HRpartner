SELECT p.id, p.code, p.name, p.source, p.createdAt
FROM "Project" p
ORDER BY p."createdAt" DESC
LIMIT 20;
