-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED');

-- CreateEnum
CREATE TYPE "DependentRelationship" AS ENUM ('SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'OTHER');

-- CreateEnum
CREATE TYPE "TicketType" AS ENUM ('TIMESHEET_DISPUTE', 'ADVANCE_SALARY', 'LEAVE_REQUEST', 'OTHER');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('PENDING', 'HR_APPROVED', 'REJECTED', 'CANCELLED', 'APPROVED', 'PAID', 'CLOSED');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TicketActorRole" AS ENUM ('WORKER', 'HR_STAFF', 'HR_MANAGER', 'ACCOUNTANT', 'PM', 'ADMIN');

-- CreateEnum
CREATE TYPE "TicketAction" AS ENUM ('CREATE', 'REVIEW', 'APPROVE_HR', 'APPROVE_FINAL', 'REJECT', 'CANCEL', 'PAY', 'CLOSE', 'COMMENT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT,
    "aff_code" TEXT,
    "name" TEXT,
    "role" TEXT NOT NULL,
    "vendor_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "full_name" TEXT,
    "phone" TEXT,
    "cccd_number" TEXT,
    "cccd_image_url" TEXT,
    "selfie_image_url" TEXT,
    "date_of_birth" DATE,
    "gender" "Gender",
    "marital_status" "MaritalStatus",
    "permanent_address" TEXT,
    "current_address" TEXT,
    "hometown" TEXT,
    "ethnic_group" TEXT,
    "religion" TEXT,
    "nationality" TEXT NOT NULL DEFAULT 'VN',
    "cccd_issued_date" DATE,
    "cccd_issued_place" TEXT,
    "cccd_expiry_date" DATE,
    "cccd_chip_data" JSONB,
    "tax_code" TEXT,
    "insurance_code" TEXT,
    "bank_account" TEXT,
    "bank_name" TEXT,
    "bank_branch" TEXT,
    "profile_status" TEXT NOT NULL DEFAULT 'INCOMPLETE',
    "employment_status" TEXT NOT NULL DEFAULT 'NONE',
    "risk_status" TEXT NOT NULL DEFAULT 'NORMAL',
    "owner_id" TEXT,
    "assigned_to_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dependents" (
    "id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "relationship" "DependentRelationship" NOT NULL,
    "national_id" TEXT,
    "tax_dependent_code" TEXT,
    "registered_at" TIMESTAMP(3),
    "valid_from" DATE NOT NULL,
    "valid_to" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dependents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_companies" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tax_code" TEXT,
    "industry" TEXT,
    "company_size" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PROSPECT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_leads" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "client_company_id" TEXT,
    "contact_name" TEXT,
    "contact_phone" TEXT,
    "expected_revenue_vnd" BIGINT,
    "expected_close_date" DATE,
    "stage" TEXT NOT NULL DEFAULT 'NEW',
    "probability" INTEGER NOT NULL DEFAULT 10,
    "owner_user_id" TEXT,
    "converted_project_id" TEXT,
    "converted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outsourcing_projects" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "client_company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pm_user_id" TEXT,
    "site_address" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "budget_vnd" BIGINT,
    "billing_terms" JSONB,
    "quota" INTEGER NOT NULL DEFAULT 0,
    "filled" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outsourcing_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staffing_orders" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "deadline_date" DATE,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staffing_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staffing_order_slots" (
    "id" TEXT NOT NULL,
    "staffing_order_id" TEXT NOT NULL,
    "position_code" TEXT NOT NULL,
    "position_title" TEXT NOT NULL,
    "slots_needed" INTEGER NOT NULL,
    "slots_filled" INTEGER NOT NULL DEFAULT 0,
    "hourly_rate_vnd" BIGINT,
    "shift_start" TEXT,
    "shift_end" TEXT,
    "valid_from" DATE NOT NULL,
    "valid_to" DATE,
    "work_location" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staffing_order_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sites" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "radius_meters" INTEGER NOT NULL DEFAULT 200,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tax_code" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "area" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_submissions" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT,
    "ctv_id" TEXT,
    "project_id" TEXT,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "cccd_number" TEXT,
    "date_of_birth" DATE,
    "gender" TEXT,
    "experience" TEXT,
    "cccd_image_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "merged_worker_id" TEXT,
    "dedup_worker_id" TEXT,
    "block_code" TEXT,
    "override_case" TEXT,
    "reviewed_by" TEXT,
    "review_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_claims" (
    "id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "claim_type" TEXT NOT NULL,
    "vendor_id" TEXT,
    "ctv_id" TEXT,
    "submission_id" TEXT,
    "registration_channel" TEXT NOT NULL DEFAULT 'SALE_ADDED',
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "accepted_by" TEXT,
    "claimed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_assignments" (
    "id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "staffing_order_id" TEXT,
    "employee_code" TEXT NOT NULL,
    "employment_type" TEXT NOT NULL,
    "work_setting" TEXT,
    "valid_from" TIMESTAMPTZ(3) NOT NULL,
    "valid_to" TIMESTAMPTZ(3),
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "is_primary" BOOLEAN NOT NULL DEFAULT true,
    "manager_id" TEXT,
    "referrer_id" TEXT,
    "salary_per_day_vnd" BIGINT NOT NULL DEFAULT 0,
    "salary_type" TEXT NOT NULL DEFAULT 'DAILY',
    "salary_month_vnd" BIGINT,
    "transfer_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_import_batches" (
    "id" TEXT NOT NULL,
    "uploaded_by_actor_id" TEXT NOT NULL,
    "uploaded_by_role" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_hash" TEXT NOT NULL,
    "total_rows" INTEGER NOT NULL,
    "matched_rows" INTEGER NOT NULL DEFAULT 0,
    "unmatched_rows" INTEGER NOT NULL DEFAULT 0,
    "anomaly_rows" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errors" JSONB NOT NULL DEFAULT '[]',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "attendance_import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_import_rows" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "row_number" INTEGER NOT NULL,
    "raw_employee_code" TEXT NOT NULL,
    "raw_date" TEXT NOT NULL,
    "raw_time" TEXT NOT NULL,
    "raw_type" TEXT NOT NULL,
    "parsed_date" DATE,
    "parsed_time" TEXT,
    "matched_worker_id" TEXT,
    "anomaly_type" TEXT,
    "anomaly_note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "attendance_import_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_templates" (
    "id" TEXT NOT NULL,
    "partner_name" TEXT NOT NULL,
    "column_mapping" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holidays" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PUBLIC_HOLIDAY',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker_deductions" (
    "id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "amount_vnd" BIGINT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "worker_deductions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_events" (
    "id" TEXT NOT NULL,
    "external_event_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'APPENDED',
    "worker_id" TEXT,
    "project_id" TEXT,
    "assignment_id" TEXT,
    "work_date" DATE NOT NULL,
    "check_in_time" TEXT,
    "check_out_time" TEXT,
    "shift_code" TEXT,
    "payload_hash" TEXT NOT NULL,
    "captured_at" TIMESTAMP(3),
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "import_batch_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timesheet_periods" (
    "id" TEXT NOT NULL,
    "project_id" TEXT,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "version" INTEGER NOT NULL DEFAULT 1,
    "approved_by" TEXT,
    "locked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timesheet_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timesheet_lines" (
    "id" TEXT NOT NULL,
    "period_id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "assignment_id" TEXT,
    "work_date" DATE NOT NULL,
    "shift_code" TEXT,
    "regular_hours" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "ot15_hours" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "ot20_hours" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "ot30_hours" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "allowance" JSONB,
    "exception" JSONB,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "anomaly_type" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timesheet_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timesheet_adjustments" (
    "id" TEXT NOT NULL,
    "period_id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "work_date" DATE,
    "delta_hours" DECIMAL(5,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timesheet_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "contract_no" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "project_id" TEXT,
    "sign_date" DATE,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "file_url" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "parent_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_parties" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "party_type" TEXT NOT NULL,
    "party_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'PARTY',

    CONSTRAINT "contract_parties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_rate_cards" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "rate_type" TEXT NOT NULL,
    "price" BIGINT NOT NULL,
    "work_type" TEXT,
    "site_id" TEXT,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_rate_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_rate_cards" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "rate_type" TEXT NOT NULL,
    "price" BIGINT NOT NULL,
    "work_type" TEXT,
    "site_id" TEXT,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_rate_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_statements" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "period_month" INTEGER NOT NULL,
    "period_year" INTEGER NOT NULL,
    "total_amount" BIGINT NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "sent_at" TIMESTAMP(3),
    "locked_at" TIMESTAMP(3),
    "dispute_count" INTEGER NOT NULL DEFAULT 0,
    "confirm_deadline_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_statements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_statement_lines" (
    "id" TEXT NOT NULL,
    "statement_id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "assignment_id" TEXT,
    "total_hours" DECIMAL(8,2) NOT NULL,
    "rate" BIGINT NOT NULL,
    "amount" BIGINT NOT NULL,

    CONSTRAINT "vendor_statement_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_statements" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "period_month" INTEGER NOT NULL,
    "period_year" INTEGER NOT NULL,
    "total_amount" BIGINT NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "sent_at" TIMESTAMP(3),
    "locked_at" TIMESTAMP(3),
    "dispute_count" INTEGER NOT NULL DEFAULT 0,
    "confirm_deadline_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_statements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_statement_lines" (
    "id" TEXT NOT NULL,
    "statement_id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "assignment_id" TEXT,
    "total_hours" DECIMAL(8,2) NOT NULL,
    "rate" BIGINT NOT NULL,
    "amount" BIGINT NOT NULL,

    CONSTRAINT "client_statement_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value_json" JSONB NOT NULL,
    "value_type" TEXT NOT NULL,
    "description" TEXT,
    "legal_ref" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_to" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_brackets" (
    "id" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "lower_bound_vnd" BIGINT NOT NULL,
    "upper_bound_vnd" BIGINT,
    "rate_percent" DECIMAL(5,2) NOT NULL,
    "cumulative_tax_vnd" BIGINT NOT NULL,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_to" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "legal_ref" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_brackets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "type" "TicketType" NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "TicketPriority" NOT NULL DEFAULT 'NORMAL',
    "worker_id" TEXT NOT NULL,
    "created_by_actor_id" TEXT NOT NULL,
    "created_by_role" "TicketActorRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignment_id" TEXT,
    "work_date" DATE,
    "current_hours" DECIMAL(5,2),
    "requested_hours" DECIMAL(5,2),
    "delta_hours" DECIMAL(5,2),
    "reason_code" TEXT,
    "amount_vnd" BIGINT NOT NULL DEFAULT 0,
    "requested_pay_date" DATE,
    "deduct_month" INTEGER,
    "deduct_year" INTEGER,
    "deduction_vnd" BIGINT NOT NULL DEFAULT 0,
    "leave_from_date" DATE,
    "leave_to_date" DATE,
    "leave_days" DECIMAL(4,1),
    "leave_type_code" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB DEFAULT '{}',
    "sla_due_at" TIMESTAMP(3),
    "is_overdue" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_history" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "action" "TicketAction" NOT NULL,
    "from_status" "TicketStatus",
    "to_status" "TicketStatus" NOT NULL,
    "actor_id" TEXT,
    "actor_role" "TicketActorRole" NOT NULL,
    "actor_name" TEXT,
    "note" TEXT,
    "payload" JSONB DEFAULT '{}',
    "ip_address" TEXT,
    "user_agent" TEXT,
    "idempotency_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_comments" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "author_role" "TicketActorRole" NOT NULL,
    "author_name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_notifications" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "recipient_role" "TicketActorRole" NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'IN_APP',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "failure_reason" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link_url" TEXT,
    "payload" JSONB DEFAULT '{}',
    "scheduled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),

    CONSTRAINT "ticket_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT,
    "actor_role" TEXT,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "diff" JSONB DEFAULT '{}',
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_aff_code_key" ON "users"("aff_code");

-- CreateIndex
CREATE INDEX "users_role_is_active_idx" ON "users"("role", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "workers_user_id_key" ON "workers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "workers_phone_key" ON "workers"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "workers_cccd_number_key" ON "workers"("cccd_number");

-- CreateIndex
CREATE UNIQUE INDEX "workers_tax_code_key" ON "workers"("tax_code");

-- CreateIndex
CREATE UNIQUE INDEX "workers_insurance_code_key" ON "workers"("insurance_code");

-- CreateIndex
CREATE INDEX "workers_profile_status_employment_status_idx" ON "workers"("profile_status", "employment_status");

-- CreateIndex
CREATE INDEX "workers_owner_id_assigned_to_id_idx" ON "workers"("owner_id", "assigned_to_id");

-- CreateIndex
CREATE UNIQUE INDEX "dependents_tax_dependent_code_key" ON "dependents"("tax_dependent_code");

-- CreateIndex
CREATE INDEX "dependents_worker_id_is_active_idx" ON "dependents"("worker_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "client_companies_code_key" ON "client_companies"("code");

-- CreateIndex
CREATE UNIQUE INDEX "client_companies_tax_code_key" ON "client_companies"("tax_code");

-- CreateIndex
CREATE INDEX "crm_leads_stage_idx" ON "crm_leads"("stage");

-- CreateIndex
CREATE UNIQUE INDEX "outsourcing_projects_code_key" ON "outsourcing_projects"("code");

-- CreateIndex
CREATE INDEX "outsourcing_projects_status_is_public_idx" ON "outsourcing_projects"("status", "is_public");

-- CreateIndex
CREATE UNIQUE INDEX "staffing_orders_code_key" ON "staffing_orders"("code");

-- CreateIndex
CREATE INDEX "staffing_orders_project_id_status_idx" ON "staffing_orders"("project_id", "status");

-- CreateIndex
CREATE INDEX "staffing_order_slots_staffing_order_id_valid_from_idx" ON "staffing_order_slots"("staffing_order_id", "valid_from");

-- CreateIndex
CREATE INDEX "sites_project_id_idx" ON "sites"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_code_key" ON "vendors"("code");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_tax_code_key" ON "vendors"("tax_code");

-- CreateIndex
CREATE INDEX "candidate_submissions_vendor_id_phone_idx" ON "candidate_submissions"("vendor_id", "phone");

-- CreateIndex
CREATE INDEX "candidate_submissions_cccd_number_idx" ON "candidate_submissions"("cccd_number");

-- CreateIndex
CREATE INDEX "candidate_submissions_status_idx" ON "candidate_submissions"("status");

-- CreateIndex
CREATE INDEX "source_claims_worker_id_accepted_idx" ON "source_claims"("worker_id", "accepted");

-- CreateIndex
CREATE INDEX "project_assignments_worker_id_status_idx" ON "project_assignments"("worker_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "project_assignments_project_id_employee_code_key" ON "project_assignments"("project_id", "employee_code");

-- CreateIndex
CREATE INDEX "attendance_import_batches_status_started_at_idx" ON "attendance_import_batches"("status", "started_at");

-- CreateIndex
CREATE INDEX "attendance_import_rows_batch_id_status_idx" ON "attendance_import_rows"("batch_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_import_rows_batch_id_row_number_key" ON "attendance_import_rows"("batch_id", "row_number");

-- CreateIndex
CREATE UNIQUE INDEX "holidays_date_key" ON "holidays"("date");

-- CreateIndex
CREATE INDEX "worker_deductions_worker_id_status_idx" ON "worker_deductions"("worker_id", "status");

-- CreateIndex
CREATE INDEX "attendance_events_worker_id_work_date_idx" ON "attendance_events"("worker_id", "work_date");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_events_source_external_event_id_key" ON "attendance_events"("source", "external_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "timesheet_periods_project_id_month_year_version_key" ON "timesheet_periods"("project_id", "month", "year", "version");

-- CreateIndex
CREATE INDEX "timesheet_lines_worker_id_work_date_idx" ON "timesheet_lines"("worker_id", "work_date");

-- CreateIndex
CREATE UNIQUE INDEX "contract_parties_contract_id_party_type_party_id_key" ON "contract_parties"("contract_id", "party_type", "party_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_statements_vendor_id_period_month_period_year_versio_key" ON "vendor_statements"("vendor_id", "period_month", "period_year", "version");

-- CreateIndex
CREATE UNIQUE INDEX "client_statements_client_id_period_month_period_year_versio_key" ON "client_statements"("client_id", "period_month", "period_year", "version");

-- CreateIndex
CREATE INDEX "payroll_config_key_is_active_effective_from_idx" ON "payroll_config"("key", "is_active", "effective_from");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_config_key_version_key" ON "payroll_config"("key", "version");

-- CreateIndex
CREATE INDEX "tax_brackets_is_active_effective_from_idx" ON "tax_brackets"("is_active", "effective_from");

-- CreateIndex
CREATE UNIQUE INDEX "tax_brackets_ordinal_effective_from_key" ON "tax_brackets"("ordinal", "effective_from");

-- CreateIndex
CREATE INDEX "tickets_type_status_idx" ON "tickets"("type", "status");

-- CreateIndex
CREATE INDEX "tickets_worker_id_status_idx" ON "tickets"("worker_id", "status");

-- CreateIndex
CREATE INDEX "tickets_status_priority_created_at_idx" ON "tickets"("status", "priority", "created_at");

-- CreateIndex
CREATE INDEX "tickets_sla_due_at_idx" ON "tickets"("sla_due_at");

-- CreateIndex
CREATE INDEX "ticket_history_ticket_id_created_at_idx" ON "ticket_history"("ticket_id", "created_at");

-- CreateIndex
CREATE INDEX "ticket_comments_ticket_id_created_at_idx" ON "ticket_comments"("ticket_id", "created_at");

-- CreateIndex
CREATE INDEX "ticket_notifications_status_scheduled_at_idx" ON "ticket_notifications"("status", "scheduled_at");

-- CreateIndex
CREATE INDEX "ticket_notifications_recipient_id_status_idx" ON "ticket_notifications"("recipient_id", "status");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at");

-- AddForeignKey
ALTER TABLE "dependents" ADD CONSTRAINT "dependents_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_client_company_id_fkey" FOREIGN KEY ("client_company_id") REFERENCES "client_companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outsourcing_projects" ADD CONSTRAINT "outsourcing_projects_client_company_id_fkey" FOREIGN KEY ("client_company_id") REFERENCES "client_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staffing_orders" ADD CONSTRAINT "staffing_orders_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "outsourcing_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staffing_order_slots" ADD CONSTRAINT "staffing_order_slots_staffing_order_id_fkey" FOREIGN KEY ("staffing_order_id") REFERENCES "staffing_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sites" ADD CONSTRAINT "sites_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "outsourcing_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_submissions" ADD CONSTRAINT "candidate_submissions_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_submissions" ADD CONSTRAINT "candidate_submissions_ctv_id_fkey" FOREIGN KEY ("ctv_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_submissions" ADD CONSTRAINT "candidate_submissions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "outsourcing_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_submissions" ADD CONSTRAINT "candidate_submissions_merged_worker_id_fkey" FOREIGN KEY ("merged_worker_id") REFERENCES "workers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_claims" ADD CONSTRAINT "source_claims_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_claims" ADD CONSTRAINT "source_claims_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_claims" ADD CONSTRAINT "source_claims_ctv_id_fkey" FOREIGN KEY ("ctv_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_claims" ADD CONSTRAINT "source_claims_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "candidate_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "outsourcing_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_staffing_order_id_fkey" FOREIGN KEY ("staffing_order_id") REFERENCES "staffing_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_import_rows" ADD CONSTRAINT "attendance_import_rows_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "attendance_import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timesheet_lines" ADD CONSTRAINT "timesheet_lines_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "timesheet_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_parties" ADD CONSTRAINT "contract_parties_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_rate_cards" ADD CONSTRAINT "vendor_rate_cards_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_rate_cards" ADD CONSTRAINT "client_rate_cards_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_statement_lines" ADD CONSTRAINT "vendor_statement_lines_statement_id_fkey" FOREIGN KEY ("statement_id") REFERENCES "vendor_statements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_statement_lines" ADD CONSTRAINT "client_statement_lines_statement_id_fkey" FOREIGN KEY ("statement_id") REFERENCES "client_statements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_config" ADD CONSTRAINT "payroll_config_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "project_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_history" ADD CONSTRAINT "ticket_history_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_notifications" ADD CONSTRAINT "ticket_notifications_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
