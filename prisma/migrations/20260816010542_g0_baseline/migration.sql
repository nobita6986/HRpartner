-- Migration: g0_baseline
-- Phase 0 - TASK.md hrp-phase0-foundation v1.0 / STEP-03
-- Add-only: chi CREATE TABLE + CREATE INDEX, KHONG DROP/RENAME/TRUNCATE.
-- Muc dich: tao bang portal_timesheets con thieu trong 2 migration truoc.
-- Verify: prisma validate + kiem tra khong doi voi 38 model khac.

CREATE TABLE "portal_timesheets" (
    "id" TEXT NOT NULL,
    "employee_code" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "project" TEXT NOT NULL,
    "period_month" INTEGER,
    "period_year" INTEGER,
    "total_work_days" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "ot_hours" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "absent_days" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "daily_data" JSONB,
    "payroll_data" JSONB,
    "total_income" DECIMAL(12,2) DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "portal_timesheets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "portal_timesheets_employee_code_idx" ON "portal_timesheets"("employee_code");
