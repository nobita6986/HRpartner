import { describe, expect, it } from 'vitest';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  getHomepageSettings,
  updateHomepageSettings,
} from '@/src/domains/job-board/public-settings.service';

const writerUrl = process.env.DATABASE_URL_TEST ?? '';
const adminUrl = process.env.DATABASE_URL_ADMIN_TEST ?? '';
const suite = describe.skipIf(!writerUrl && !adminUrl);

type HomepageSettingsRow = {
  id: string;
  best_jobs_page_size: number;
  listing_page_size: number;
  zalo_chat_url: string | null;
  messenger_chat_url: string | null;
  phone_call_number: string | null;
  news_section_enabled: boolean;
  sticky_announcement: unknown;
  created_at: string;
  updated_at: string;
  updated_by_id: string | null;
};

const originalSelect = Prisma.sql`
  SELECT id, best_jobs_page_size, listing_page_size, zalo_chat_url,
         messenger_chat_url, phone_call_number, news_section_enabled,
         sticky_announcement, created_at::text AS created_at,
         updated_at::text AS updated_at, updated_by_id
  FROM homepage_settings
  WHERE id = 'default'
`;

suite('UI2 public HomepageSettings synthetic PostgreSQL integration', () => {
  it('verifies migration, constraints, service round-trip, and restores the original singleton', async () => {
    let originalRows: HomepageSettingsRow[] | undefined;
    let prisma: PrismaClient | undefined;

    try {
      expect(writerUrl).toBeTruthy();
      expect(adminUrl).toBeTruthy();

      const writer = new URL(writerUrl);
      const admin = new URL(adminUrl);
      expect(writer.hostname).toMatch(/^ep-empty-forest-azlhfyo9(?:-|[.])/);
      expect(writer.hostname).not.toMatch(/^ep-shy-tree-/);
      expect(admin.hostname).toBe(writer.hostname);
      expect(admin.port).toBe(writer.port);
      expect(admin.pathname).toBe(writer.pathname);

      prisma = new PrismaClient({
        datasources: { db: { url: writerUrl } },
        log: [],
        transactionOptions: { timeout: 15_000 },
      });

      const [database, writerPosture, migrationRows, columns, constraints] =
        await Promise.all([
          prisma.$queryRaw<Array<{ database: string }>>`
            SELECT current_database() AS database
          `,
          prisma.$queryRaw<Array<{ rolsuper: boolean; rolbypassrls: boolean }>>`
            SELECT role.rolsuper, role.rolbypassrls
            FROM pg_roles AS role
            WHERE role.rolname = current_user
          `,
          prisma.$queryRaw<Array<{ migration_name: string }>>`
            SELECT migration_name
            FROM _prisma_migrations
            WHERE migration_name = '20261004230000_ui2_public_content_controls'
              AND finished_at IS NOT NULL
              AND rolled_back_at IS NULL
          `,
          prisma.$queryRaw<Array<{
            column_name: string;
            data_type: string;
            is_nullable: string;
            column_default: string | null;
          }>>`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND table_name = 'homepage_settings'
              AND column_name IN ('news_section_enabled', 'sticky_announcement')
            ORDER BY column_name
          `,
          prisma.$queryRaw<Array<{ convalidated: boolean; definition: string }>>`
            SELECT constraint_row.convalidated,
                   pg_get_constraintdef(constraint_row.oid) AS definition
            FROM pg_constraint AS constraint_row
            WHERE constraint_row.conrelid = 'homepage_settings'::regclass
              AND constraint_row.conname =
                'homepage_settings_sticky_announcement_check'
          `,
        ]);

      expect(database).toEqual([{ database: decodeURIComponent(writer.pathname.slice(1)) }]);
      expect(writerPosture).toEqual([{ rolsuper: false, rolbypassrls: false }]);
      expect(migrationRows).toHaveLength(1);
      expect(columns).toEqual([
        {
          column_name: 'news_section_enabled',
          data_type: 'boolean',
          is_nullable: 'NO',
          column_default: 'true',
        },
        {
          column_name: 'sticky_announcement',
          data_type: 'jsonb',
          is_nullable: 'YES',
          column_default: null,
        },
      ]);
      expect(constraints).toHaveLength(1);
      expect(constraints[0].convalidated).toBe(true);
      expect(constraints[0].definition).toContain("jsonb_typeof(sticky_announcement) = 'object'");
      expect(constraints[0].definition).toContain('octet_length');
      expect(constraints[0].definition).toContain('4096');

      originalRows = await prisma.$queryRaw<HomepageSettingsRow[]>(originalSelect);

      const beforeRead = await getHomepageSettings(prisma);
      expect(typeof beforeRead.newsSectionEnabled).toBe('boolean');
      expect(beforeRead.stickyAnnouncement).toBeDefined();

      const stickyAnnouncement = {
        enabled: true,
        message: 'UI2 synthetic integration',
        ctaLabel: 'View jobs',
        ctaUrl: 'https://hrpartner.vn/jobs?source=ui2-integration',
        dismissible: true,
        textColor: 'on-secondary-container' as const,
        font: 'SERIF' as const,
        emphasis: 'EXTRA_BOLD' as const,
        animation: 'MARQUEE' as const,
        contentRevision: 'ui2-integration-revision',
      };
      const write = await updateHomepageSettings(
        prisma,
        { newsSectionEnabled: false, stickyAnnouncement },
        null,
      );

      expect(write.settings.newsSectionEnabled).toBe(false);
      expect(write.settings.stickyAnnouncement).toEqual(stickyAnnouncement);

      const readBack = await getHomepageSettings(prisma);
      expect(readBack.newsSectionEnabled).toBe(false);
      expect(readBack.stickyAnnouncement).toEqual(stickyAnnouncement);

      await expect(
        updateHomepageSettings(
          prisma,
          {
            stickyAnnouncement: {
              ...stickyAnnouncement,
              ctaUrl: 'javascript:alert(1)',
            },
          },
          null,
        ),
      ).rejects.toThrow('ctaUrl không hợp lệ.');

      const unchangedAfterInvalidCta = await getHomepageSettings(prisma);
      expect(unchangedAfterInvalidCta.newsSectionEnabled).toBe(false);
      expect(unchangedAfterInvalidCta.stickyAnnouncement).toEqual(stickyAnnouncement);

      await expect(
        updateHomepageSettings(
          prisma,
          {
            stickyAnnouncement: {
              ...stickyAnnouncement,
              message: 'x'.repeat(281),
            },
          },
          null,
        ),
      ).rejects.toThrow();

      const unchangedAfterInvalidPayload = await getHomepageSettings(prisma);
      expect(unchangedAfterInvalidPayload.stickyAnnouncement).toEqual(stickyAnnouncement);

      await expect(prisma.$executeRaw`
        UPDATE homepage_settings
        SET sticky_announcement = '"not-an-object"'::jsonb
        WHERE id = 'default'
      `).rejects.toThrow();

      await expect(prisma.$executeRaw`
        UPDATE homepage_settings
        SET sticky_announcement = jsonb_build_object('message', repeat('x', 5000))
        WHERE id = 'default'
      `).rejects.toThrow();

      const unchangedAfterConstraintChecks = await getHomepageSettings(prisma);
      expect(unchangedAfterConstraintChecks.stickyAnnouncement).toEqual(stickyAnnouncement);
    } finally {
      try {
        if (prisma && originalRows !== undefined) {
          if (originalRows.length === 0) {
            await prisma.$executeRaw`
              DELETE FROM homepage_settings WHERE id = 'default'
            `;
          } else {
            const original = originalRows[0];
            await prisma.$executeRaw`
              UPDATE homepage_settings
              SET best_jobs_page_size = ${original.best_jobs_page_size},
                  listing_page_size = ${original.listing_page_size},
                  zalo_chat_url = ${original.zalo_chat_url},
                  messenger_chat_url = ${original.messenger_chat_url},
                  phone_call_number = ${original.phone_call_number},
                  news_section_enabled = ${original.news_section_enabled},
                  sticky_announcement =
                    ${original.sticky_announcement === null
                      ? null
                      : JSON.stringify(original.sticky_announcement)}::jsonb,
                  created_at = ${original.created_at}::timestamptz,
                  updated_at = ${original.updated_at}::timestamptz,
                  updated_by_id = ${original.updated_by_id}
              WHERE id = ${original.id}
            `;
          }

          const restoredRows = await prisma.$queryRaw<HomepageSettingsRow[]>(originalSelect);
          expect(restoredRows).toEqual(originalRows);
        }
      } finally {
        await prisma?.$disconnect();
      }
    }
  }, 60_000);
});
