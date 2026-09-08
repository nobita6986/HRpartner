# TIER 2 PROMPT — hrp-v6-p1-labor-profile-schema

## Context

- Task: `hrp-v6-p1-labor-profile-schema`
- Contract: `docs/tasks/hrp-v6-p1-labor-profile-schema/TASK.md` (v1.0)
- Status: `READY_FOR_EXECUTION`
- Branch: `codex/hrp-v6-p1a-labor-profile-schema`
- Baseline: `main @ 4758809` — schema chưa có LaborProfile/EmploymentEpisode
- Work tree: WORKTREE (branch tách từ main, không ảnh hưởng worktree chính)

## Mục tiêu

Thêm 3 model mới (ADD-only, không DROP) + migration RLS forward-only + evidence + HANDOFF.

## Phases cần làm

### STEP-01: Thêm 3 model vào schema.prisma

Thêm vào `prisma/schema.prisma`:

**Model `LaborProfile`** → `@@map("labor_profiles")`:
```prisma
model LaborProfile {
  id                          String   @id @default(uuid())
  fullName                    String?
  normalizedPhone              String?  @map("normalized_phone")
  phone                       String?
  cccdNumber                  String?  @map("cccd_number")
  identityVerification        String   @default("UNVERIFIED")
  completeness                String   @default("MINIMAL")
  consentAt                   DateTime? @map("consent_at")
  createdAt                   DateTime @default(now()) @map("created_at")
  updatedAt                   DateTime @updatedAt @map("updated_at")
  workerId                    String?  @unique @map("worker_id")

  worker      Worker?           @relation(fields: [workerId], references: [id])
  submissions CandidateSubmission[]
  intakes     LaborProfileIntake[]
  episodes    EmploymentEpisode[]

  @@map("labor_profiles")
  @@index([normalizedPhone])
  @@index([cccdNumber])
}
```

**Model `LaborProfileIntake`** → `@@map("labor_profile_intakes")`:
```prisma
model LaborProfileIntake {
  id                 String   @id @default(uuid())
  laborProfileId     String   @map("labor_profile_id")
  channel            String   // PUBLIC_SELF / STAFF_ASSISTED / AFF / IMPORT
  sourceSubmissionId String?  @map("source_submission_id")
  capturedByUserId   String?  @map("captured_by_user_id")
  consentAt          DateTime? @map("consent_at")
  effectiveAt        DateTime? @map("effective_at")
  note               String?
  createdAt          DateTime @default(now()) @map("created_at")

  laborProfile LaborProfile @relation(fields: [laborProfileId], references: [id])

  @@map("labor_profile_intakes")
  @@index([laborProfileId])
}
```

**Model `EmploymentEpisode`** → `@@map("employment_episodes")`:
```prisma
model EmploymentEpisode {
  id             String    @id @default(uuid())
  laborProfileId String    @map("labor_profile_id")
  workerId       String?   @map("worker_id")
  status         String    @default("ACTIVE") // ACTIVE / ENDED
  startedAt      DateTime  @map("started_at")
  endedAt        DateTime? @map("ended_at")
  endReason      String?   @map("end_reason")
  createdAt      DateTime  @default(now()) @map("created_at")

  laborProfile LaborProfile @relation(fields: [laborProfileId], references: [id])
  worker       Worker?       @relation(fields: [workerId], references: [id])

  @@map("employment_episodes")
  @@index([laborProfileId])
}
```

### STEP-02: Thêm móc trên model cũ

Thêm vào `Worker` model (tìm block `model Worker`):
```prisma
laborProfile LaborProfile? @relation(fields: [laborProfileId], references: [id])
laborProfileId String? @map("labor_profile_id")
```
Thêm vào `CandidateSubmission` model:
```prisma
laborProfileId String? @map("labor_profile_id")
laborProfile   LaborProfile? @relation(fields: [laborProfileId], references: [id])
```
Thêm index cho `candidate_submissions`:
```prisma
@@index([laborProfileId])
```

### STEP-03: Sinh migration

```powershell
# Baseline
git show HEAD:prisma/schema.prisma > docs/tasks/hrp-v6-p1-labor-profile-schema/evidence/baseline-head.prisma

# Tạo migration THÊM-thuần
npx prisma migrate dev --name add_labor_profile_employment_episode_schema --create-only

# Chứng minh ADD-only: SQL không có DROP
$npx prisma migrate diff --from-schema-datamodel docs/tasks/hrp-v6-p1-labor-profile-schema/evidence/baseline-head.prisma --to-schema-datamodel prisma/schema.prisma --script
```

Nếu SQL chứa DROP → STOP, revert và hỏi Tier 1.

### STEP-04: Migration RLS forward-only

Tạo `prisma/migrations/<timestamp>_add_labor_profile_rls/migration.sql`:

```sql
-- ENABLE RLS for 3 new tables
ALTER TABLE labor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_profile_intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE employment_episodes ENABLE ROW LEVEL SECURITY;

ALTER TABLE labor_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE labor_profile_intakes FORCE ROW LEVEL SECURITY;
ALTER TABLE employment_episodes FORCE ROW LEVEL SECURITY;

-- Policy: nhân sự only (app.role = 'hr_manager' or 'admin')
CREATE POLICY labor_profiles_hr_scope ON labor_profiles
  FOR ALL USING (current_setting('app.role', true) IN ('hr_manager', 'admin'));

CREATE POLICY labor_profile_intakes_hr_scope ON labor_profile_intakes
  FOR ALL USING (current_setting('app.role', true) IN ('hr_manager', 'admin'));

CREATE POLICY employment_episodes_hr_scope ON employment_episodes
  FOR ALL USING (current_setting('app.role', true) IN ('hr_manager', 'admin'));
```

KHÔNG policy `anon`, KHÔNG `TO PUBLIC`, KHÔNG `CREATE OR REPLACE` hàm cũ.

### STEP-05: Verify và đóng scope

Chạy và lưu output vào `docs/tasks/hrp-v6-p1-labor-profile-schema/evidence/`:

```powershell
# AC-01: validate + models tồn tại
npx prisma validate > docs/tasks/hrp-v6-p1-labor-profile-schema/evidence/ac01-models.txt 2>&1
$?

# AC-02: soft dedup (không @unique trên phone/cccd)
rg -n "@unique" prisma/schema.prisma | rg -i "normalized|cccd|phone" > docs/tasks/hrp-v6-p1-labor-profile-schema/evidence/ac02-soft-dedup.txt 2>&1

# AC-03: workerId @unique + back-relation
rg -n "workerId String.*@unique" prisma/schema.prisma > docs/tasks/hrp-v6-p1-labor-profile-schema/evidence/ac03-worker-link.txt 2>&1
rg -n "laborProfile LaborProfile\?" prisma/schema.prisma >> docs/tasks/hrp-v6-p1-labor-profile-schema/evidence/ac03-worker-link.txt

# AC-04: EmploymentEpisode nửa mở
rg -n "startedAt DateTime" prisma/schema.prisma > docs/tasks/hrp-v6-p1-labor-profile-schema/evidence/ac04-episode.txt 2>&1
rg -n "endedAt DateTime\?" prisma/schema.prisma >> docs/tasks/hrp-v6-p1-labor-profile-schema/evidence/ac04-episode.txt

# AC-05: CandidateSubmission chỉ thêm
git diff --cached -- prisma/schema.prisma > docs/tasks/hrp-v6-p1-labor-profile-schema/evidence/ac05-submission-hook.txt 2>&1

# AC-06: migration ADD-only
$sql = npx prisma migrate diff --from-schema-datamodel docs/tasks/hrp-v6-p1-labor-profile-schema/evidence/baseline-head.prisma --to-schema-datamodel prisma/schema.prisma --script 2>&1 | Out-String
$sql | Select-String -Pattern "DROP" > docs/tasks/hrp-v6-p1-labor-profile-schema/evidence/ac06-additive.txt 2>&1
$sql > docs/tasks/hrp-v6-p1-labor-profile-schema/evidence/ac06-sql-diff.txt 2>&1

# AC-07: RLS migration
Select-String -Pattern "ROW LEVEL SECURITY" -Path prisma/migrations/*labor_profile_rls*/migration.sql > docs/tasks/hrp-v6-p1-labor-profile-schema/evidence/ac07-rls.txt 2>&1
Select-String -Pattern "CREATE POLICY" -Path prisma/migrations/*labor_profile_rls*/migration.sql >> docs/tasks/hrp-v6-p1-labor-profile-schema/evidence/ac07-rls.txt 2>&1
Select-String -Pattern "TO PUBLIC" -Path prisma/migrations/*labor_profile_rls*/migration.sql >> docs/tasks/hrp-v6-p1-labor-profile-schema/evidence/ac07-rls.txt 2>&1

# AC-08: không trùng Application
rg -nE "^model Application|^enum Application" prisma/schema.prisma > docs/tasks/hrp-v6-p1-labor-profile-schema/evidence/ac08-vocab.txt 2>&1; $LASTEXITCODE

# AC-09: generate + typecheck
npx prisma generate > docs/tasks/hrp-v6-p1-labor-profile-schema/evidence/ac09-typecheck.txt 2>&1; $?
npx tsc --noEmit >> docs/tasks/hrp-v6-p1-labor-profile-schema/evidence/ac09-typecheck.txt 2>&1; $?

# AC-10: scope check
git status --porcelain > docs/tasks/hrp-v6-p1-labor-profile-schema/evidence/ac10-scope.txt 2>&1
git diff --cached --name-only >> docs/tasks/hrp-v6-p1-labor-profile-schema/evidence/ac10-scope.txt 2>&1
```

### STEP-06: Viết HANDOFF.md

Tạo `docs/tasks/hrp-v6-p1-labor-profile-schema/HANDOFF.md`:

- Ghi tóm tắt 3 model đã thêm
- Ghi migration files đã tạo (schema + RLS)
- Ghi evidence file list
- Ghi trạng thái: pending Tier 3 audit round 1
- Ghi 3 Open Questions (OQ-01: backfill, OQ-02: initial status, OQ-03: ClientCompany.publicName)

## Commit

Sau khi tất cả evidence lưu xong, commit scoped:

```powershell
git add prisma/schema.prisma
git add prisma/migrations/<schema_migration>/ prisma/migrations/<rls_migration>/
git add docs/tasks/hrp-v6-p1-labor-profile-schema/
git commit -m "feat(schema): add LaborProfile, LaborProfileIntake, EmploymentEpisode — hrp-v6-p1-labor-profile-schema STEP-01-05"
```

## Cấm

- `git add -A` / `git add .`
- Chạy `prisma migrate dev` / `migrate deploy` / `migrate reset` / `migrate status` trên DB sống
- Sửa `src/**`, `app/**`, `tests/**`
- Sửa `.env`, `package.json`, `vitest.config.ts`, `tsconfig.json`, `.gitignore`
- In secret, connection string, PII vào evidence
- Tạo model/enum tên `Application`
