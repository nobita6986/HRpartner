'use client';

/**
 * JobPostingEditorShell — client component của AV2 editor shell.
 *
 * Render form chỉnh nội dung section content (intro / salary / support /
 * requirements / apply-instructions / footer banner) trong state cục bộ +
 * preview phản ánh đúng nội dung vừa nhập. KHÔNG có nút Lưu / Publish —
 * persistence cho section content chờ AV2 backend (xem banner).
 *
 * Vì sao dùng client component:
 *  - Cần `useState` cho state cục bộ của form + dirty indicator.
 *  - Parent là Server Component đọc JobPosting qua `withDbContext` (RLS).
 *  - Preview dùng đúng component UI04d đã có (ContentSection, BenefitsSection,
 *    SupportSection, FooterBannerSection) → render đúng kiểu.
 *
 * Vì sao KHÔNG có nút Lưu:
 *  - Instruction Tier 0: "không mở API ghi mới". Section content chưa có
 *    persistence cho JobPosting ở vòng này → dựng nút Lưu = báo thành công
 *    giả (cấm).
 *  - Contract với Tier 0: chỉ thêm "form trong state cục bộ và preview phản
 *    ánh đúng nội dung vừa nhập, ghi rõ 'chưa lưu'".
 */

import { useMemo, useState } from 'react';

import { ContentSection } from '@/src/domains/job-board/components/detail/content-section';
import { BenefitsSection } from '@/src/domains/job-board/components/detail/benefits-section';
import { SupportSection } from '@/src/domains/job-board/components/detail/support-section';
import { FooterBannerSection } from '@/src/domains/job-board/components/detail/footer-banner-section';
import type {
  ContentSectionContent,
  SalarySectionContent,
  SupportSectionContent,
  FooterBannerContent,
  StructuredContent,
  BenefitItem,
  SupportItem,
} from '@/src/domains/job-board/public-types';

import {
  demoIntroductionContent,
  demoRequirementsContent,
  demoCompensationContent,
  demoSupportContent,
  demoApplyInstructionsContent,
  demoFooterBannerContent,
} from '@/src/domains/job-board/fixtures/detail-sections.fixture';

interface DraftState {
  introduction: ContentSectionContent;
  requirements: ContentSectionContent;
  compensation: SalarySectionContent;
  support: SupportSectionContent;
  applyInstructions: ContentSectionContent;
  footerBanner: FooterBannerContent;
}

function initialDraft(): DraftState {
  return {
    introduction: cloneContent(demoIntroductionContent),
    requirements: cloneContent(demoRequirementsContent),
    compensation: cloneSalary(demoCompensationContent),
    support: cloneSupport(demoSupportContent),
    applyInstructions: cloneContent(demoApplyInstructionsContent),
    footerBanner: cloneFooter(demoFooterBannerContent),
  };
}

function cloneContent(c: ContentSectionContent): ContentSectionContent {
  return { ...c, blocks: c.blocks.map(cloneBlock) };
}
function cloneSalary(c: SalarySectionContent): SalarySectionContent {
  return {
    ...c,
    salaryDetail: c.salaryDetail.map(cloneBlock),
    bonusItems: c.bonusItems.map((b) => ({ ...b })),
    benefitItems: c.benefitItems.map((b) => ({ ...b })),
  };
}
function cloneSupport(c: SupportSectionContent): SupportSectionContent {
  return { ...c, items: c.items.map((it) => ({ ...it })) };
}
function cloneFooter(c: FooterBannerContent): FooterBannerContent {
  return { ...c };
}
function cloneBlock(b: StructuredContent): StructuredContent {
  switch (b.type) {
    case 'heading':
      return { ...b };
    case 'paragraph':
      return { ...b };
    case 'list':
      return { ...b, items: [...b.items] };
    case 'callout':
      return { ...b };
  }
}

function updateBlock(
  blocks: StructuredContent[],
  index: number,
  next: StructuredContent,
): StructuredContent[] {
  return blocks.map((b, i) => (i === index ? next : b));
}

function setBlockText(
  blocks: StructuredContent[],
  index: number,
  text: string,
): StructuredContent[] {
  const b = blocks[index];
  if (!b) return blocks;
  switch (b.type) {
    case 'heading':
    case 'paragraph':
    case 'callout':
      return updateBlock(blocks, index, { ...b, text });
    case 'list':
      // text cho list = cả danh sách nối "\n" để dễ edit
      return updateBlock(blocks, index, {
        ...b,
        items: text.split('\n').filter((s) => s.length > 0),
      });
  }
}

function getBlockText(b: StructuredContent): string {
  switch (b.type) {
    case 'heading':
    case 'paragraph':
    case 'callout':
      return b.text;
    case 'list':
      return b.items.join('\n');
  }
}

function getBlockTypeLabel(b: StructuredContent): string {
  switch (b.type) {
    case 'heading': return `Tiêu đề H${b.level}`;
    case 'paragraph': return 'Đoạn văn';
    case 'list': return b.ordered ? 'Danh sách có thứ tự' : 'Danh sách (mỗi dòng 1 mục)';
    case 'callout': return `Callout (${b.variant})`;
  }
}

export function JobPostingEditorShell() {
  const [draft, setDraft] = useState<DraftState>(() => initialDraft());

  const setIntroduction = (next: ContentSectionContent) =>
    setDraft((d) => ({ ...d, introduction: next }));
  const setRequirements = (next: ContentSectionContent) =>
    setDraft((d) => ({ ...d, requirements: next }));
  const setCompensation = (next: SalarySectionContent) =>
    setDraft((d) => ({ ...d, compensation: next }));
  const setSupport = (next: SupportSectionContent) =>
    setDraft((d) => ({ ...d, support: next }));
  const setApplyInstructions = (next: ContentSectionContent) =>
    setDraft((d) => ({ ...d, applyInstructions: next }));
  const setFooterBanner = (next: FooterBannerContent) =>
    setDraft((d) => ({ ...d, footerBanner: next }));

  const resetAll = () => setDraft(initialDraft());

  const isDirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(initialDraft()), [draft]);

  return (
    <div className="flex flex-col gap-6">
      {/* Trạng thái + reset */}
      <section
        className="rounded-lg border p-3 text-sm"
        style={{
          borderColor: isDirty ? '#f5b5b5' : 'var(--outline)',
          backgroundColor: isDirty ? '#fdecec' : 'var(--color-surface-container)',
          color: isDirty ? '#8a1c1c' : 'var(--on-surface-variant)',
        }}
        role="status"
        aria-live="polite"
      >
        {isDirty
          ? 'Đang có thay đổi CHƯA LƯU. Các nội dung bên dưới chỉ tồn tại trong tab này — tải lại trang sẽ mất.'
          : 'Chưa có thay đổi. Sửa bất kỳ ô nào để xem preview phản ánh ngay.'}
        {isDirty && (
          <button
            type="button"
            onClick={resetAll}
            className="ml-3 rounded border px-2 py-0.5 text-xs font-medium"
            style={{ borderColor: '#8a1c1c', color: '#8a1c1c' }}
          >
            Huỷ thay đổi
          </button>
        )}
      </section>

      {/* Editor + Preview cặp cho mỗi section */}
      <SectionPair
        title="Giới thiệu công việc"
        description="Đoạn mở đầu + tiêu đề phụ + callout nổi bật."
        editor={
          <ContentBlocksEditor
            blocks={draft.introduction.blocks}
            onChange={(blocks) => setIntroduction({ ...draft.introduction, blocks })}
          />
        }
        preview={<ContentSection content={draft.introduction} />}
      />

      <SectionPair
        title="Yêu cầu và lưu ý"
        description="Hồ sơ cần chuẩn bị + yêu cầu khác."
        editor={
          <ContentBlocksEditor
            blocks={draft.requirements.blocks}
            onChange={(blocks) => setRequirements({ ...draft.requirements, blocks })}
          />
        }
        preview={<ContentSection content={draft.requirements} />}
      />

      <SectionPair
        title="Lương & phúc lợi"
        description="Loại lương + mô tả chi tiết + thưởng + phúc lợi."
        editor={
          <SalaryEditor
            value={draft.compensation}
            onChange={setCompensation}
          />
        }
        preview={<BenefitsSection content={draft.compensation} />}
      />

      <SectionPair
        title="Hỗ trợ HRP"
        description="Các mục hỗ trợ ứng viên (có/tùy vị trí)."
        editor={
          <SupportEditor value={draft.support} onChange={setSupport} />
        }
        preview={<SupportSection content={draft.support} />}
      />

      <SectionPair
        title="Hướng dẫn ứng tuyển"
        description="Các bước nộp hồ sơ + callout."
        editor={
          <ContentBlocksEditor
            blocks={draft.applyInstructions.blocks}
            onChange={(blocks) => setApplyInstructions({ ...draft.applyInstructions, blocks })}
          />
        }
        preview={<ContentSection content={draft.applyInstructions} />}
      />

      <SectionPair
        title="Footer banner"
        description="CTA + hình ảnh kêu gọi xem thêm việc làm."
        editor={
          <FooterBannerEditor
            value={draft.footerBanner}
            onChange={setFooterBanner}
          />
        }
        preview={<FooterBannerSection content={draft.footerBanner} />}
      />
    </div>
  );
}

function SectionPair({
  title,
  description,
  editor,
  preview,
}: {
  title: string;
  description: string;
  editor: React.ReactNode;
  preview: React.ReactNode;
}) {
  return (
    <section
      className="rounded-xl border"
      style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--color-surface)' }}
    >
      <header
        className="border-b px-4 py-3"
        style={{ borderColor: 'var(--outline-variant)' }}
      >
        <h2 className="text-base font-semibold" style={{ color: 'var(--on-surface)' }}>
          {title}
        </h2>
        <p className="mt-0.5 text-xs" style={{ color: 'var(--on-surface-variant)' }}>
          {description}
        </p>
      </header>
      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
        <div>
          <div
            className="mb-2 text-xs font-semibold uppercase tracking-wide"
            style={{ color: 'var(--on-surface-variant)' }}
          >
            Form chỉnh (chưa lưu)
          </div>
          <div className="flex flex-col gap-2">{editor}</div>
        </div>
        <div>
          <div
            className="mb-2 text-xs font-semibold uppercase tracking-wide"
            style={{ color: 'var(--on-surface-variant)' }}
          >
            Preview phản ánh nội dung vừa nhập
          </div>
          <div className="rounded-lg" style={{ backgroundColor: 'var(--surface)' }}>
            {preview}
          </div>
        </div>
      </div>
    </section>
  );
}

function ContentBlocksEditor({
  blocks,
  onChange,
}: {
  blocks: StructuredContent[];
  onChange: (next: StructuredContent[]) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {blocks.map((b, idx) => (
        <div
          key={idx}
          className="rounded-lg border p-2"
          style={{ borderColor: 'var(--outline-variant)' }}
        >
          <div className="mb-1 flex items-center justify-between text-xs">
            <span style={{ color: 'var(--on-surface-variant)' }}>{getBlockTypeLabel(b)}</span>
            <button
              type="button"
              onClick={() => onChange(blocks.filter((_, i) => i !== idx))}
              className="rounded px-1.5 py-0.5 text-xs"
              style={{ color: '#8a1c1c', borderColor: '#f5b5b5' }}
              aria-label={`Xoá block ${idx + 1}`}
            >
              Xoá
            </button>
          </div>
          {b.type === 'list' && (
            <label className="mb-1 block text-xs" style={{ color: 'var(--on-surface-variant)' }}>
              <input
                type="checkbox"
                checked={b.ordered}
                onChange={(e) =>
                  onChange(updateBlock(blocks, idx, { ...b, ordered: e.target.checked }))
                }
                className="mr-1"
              />
              Đánh số thứ tự
            </label>
          )}
          {b.type === 'callout' && (
            <label className="mb-1 block text-xs" style={{ color: 'var(--on-surface-variant)' }}>
              Variant:{' '}
              <select
                value={b.variant}
                onChange={(e) =>
                  onChange(updateBlock(blocks, idx, {
                    ...b,
                    variant: e.target.value as 'info' | 'warning' | 'success',
                  }))
                }
                className="rounded border px-1 py-0.5 text-xs"
                style={{ borderColor: 'var(--outline)' }}
              >
                <option value="info">info</option>
                <option value="warning">warning</option>
                <option value="success">success</option>
              </select>
            </label>
          )}
          {b.type === 'heading' && (
            <label className="mb-1 block text-xs" style={{ color: 'var(--on-surface-variant)' }}>
              Cấp:{' '}
              <select
                value={b.level}
                onChange={(e) =>
                  onChange(updateBlock(blocks, idx, {
                    ...b,
                    level: Number(e.target.value) as 2 | 3 | 4,
                  }))
                }
                className="rounded border px-1 py-0.5 text-xs"
                style={{ borderColor: 'var(--outline)' }}
              >
                <option value={2}>H2</option>
                <option value={3}>H3</option>
                <option value={4}>H4</option>
              </select>
            </label>
          )}
          <textarea
            value={getBlockText(b)}
            onChange={(e) => onChange(setBlockText(blocks, idx, e.target.value))}
            rows={b.type === 'list' ? Math.max(3, b.items.length) : 3}
            className="w-full rounded border px-2 py-1 text-sm"
            style={{
              borderColor: 'var(--outline)',
              backgroundColor: 'var(--surface-container-lowest)',
              color: 'var(--on-surface)',
            }}
          />
        </div>
      ))}
      <AddBlockButton
        onAdd={(newBlock) => onChange([...blocks, newBlock])}
      />
    </div>
  );
}

function AddBlockButton({ onAdd }: { onAdd: (b: StructuredContent) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      <button
        type="button"
        onClick={() => onAdd({ type: 'paragraph', text: '' })}
        className="rounded border px-2 py-1 text-xs"
        style={{ borderColor: 'var(--outline)', color: 'var(--primary)' }}
      >
        + Đoạn văn
      </button>
      <button
        type="button"
        onClick={() => onAdd({ type: 'heading', level: 3, text: '' })}
        className="rounded border px-2 py-1 text-xs"
        style={{ borderColor: 'var(--outline)', color: 'var(--primary)' }}
      >
        + Tiêu đề H3
      </button>
      <button
        type="button"
        onClick={() => onAdd({ type: 'list', ordered: false, items: [''] })}
        className="rounded border px-2 py-1 text-xs"
        style={{ borderColor: 'var(--outline)', color: 'var(--primary)' }}
      >
        + Danh sách
      </button>
      <button
        type="button"
        onClick={() => onAdd({ type: 'callout', variant: 'info', text: '' })}
        className="rounded border px-2 py-1 text-xs"
        style={{ borderColor: 'var(--outline)', color: 'var(--primary)' }}
      >
        + Callout
      </button>
    </div>
  );
}

function SalaryEditor({
  value,
  onChange,
}: {
  value: SalarySectionContent;
  onChange: (next: SalarySectionContent) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <label className="block text-xs" style={{ color: 'var(--on-surface-variant)' }}>
        Loại lương:{' '}
        <select
          value={value.salaryType}
          onChange={(e) =>
            onChange({ ...value, salaryType: e.target.value as 'BASIC' | 'EXPECTED' | 'NEGOTIABLE' })
          }
          className="rounded border px-1 py-0.5 text-xs"
          style={{ borderColor: 'var(--outline)' }}
        >
          <option value="BASIC">BASIC</option>
          <option value="EXPECTED">EXPECTED</option>
          <option value="NEGOTIABLE">NEGOTIABLE</option>
        </select>
      </label>
      <div className="text-xs font-semibold" style={{ color: 'var(--on-surface-variant)' }}>
        Mô tả lương
      </div>
      <ContentBlocksEditor
        blocks={value.salaryDetail}
        onChange={(salaryDetail) => onChange({ ...value, salaryDetail })}
      />
      <BenefitListEditor
        title="Thưởng"
        items={value.bonusItems}
        onChange={(bonusItems) => onChange({ ...value, bonusItems })}
      />
      <BenefitListEditor
        title="Phúc lợi"
        items={value.benefitItems}
        onChange={(benefitItems) => onChange({ ...value, benefitItems })}
      />
    </div>
  );
}

function BenefitListEditor({
  title,
  items,
  onChange,
}: {
  title: string;
  items: BenefitItem[];
  onChange: (next: BenefitItem[]) => void;
}) {
  return (
    <div>
      <div className="text-xs font-semibold" style={{ color: 'var(--on-surface-variant)' }}>
        {title} ({items.length})
      </div>
      <div className="mt-1 flex flex-col gap-2">
        {items.map((it, idx) => (
          <div
            key={idx}
            className="rounded border p-2"
            style={{ borderColor: 'var(--outline-variant)' }}
          >
            <div className="grid grid-cols-2 gap-1">
              <input
                value={it.icon}
                onChange={(e) =>
                  onChange(items.map((x, i) => (i === idx ? { ...x, icon: e.target.value } : x)))
                }
                placeholder="material icon"
                className="rounded border px-1 py-0.5 text-xs"
                style={{ borderColor: 'var(--outline)' }}
              />
              <input
                value={it.title}
                onChange={(e) =>
                  onChange(items.map((x, i) => (i === idx ? { ...x, title: e.target.value } : x)))
                }
                placeholder="tiêu đề"
                className="rounded border px-1 py-0.5 text-xs"
                style={{ borderColor: 'var(--outline)' }}
              />
              <input
                value={it.description ?? ''}
                onChange={(e) =>
                  onChange(
                    items.map((x, i) =>
                      i === idx ? { ...x, description: e.target.value || null } : x,
                    ),
                  )
                }
                placeholder="mô tả"
                className="col-span-2 rounded border px-1 py-0.5 text-xs"
                style={{ borderColor: 'var(--outline)' }}
              />
              <input
                value={it.value ?? ''}
                onChange={(e) =>
                  onChange(
                    items.map((x, i) =>
                      i === idx ? { ...x, value: e.target.value || null } : x,
                    ),
                  )
                }
                placeholder="giá trị"
                className="col-span-2 rounded border px-1 py-0.5 text-xs"
                style={{ borderColor: 'var(--outline)' }}
              />
            </div>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, i) => i !== idx))}
              className="mt-1 text-xs underline"
              style={{ color: '#8a1c1c' }}
            >
              Xoá
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            onChange([
              ...items,
              { icon: 'star', title: '', description: null, value: null },
            ])
          }
          className="rounded border px-2 py-1 text-xs"
          style={{ borderColor: 'var(--outline)', color: 'var(--primary)' }}
        >
          + Thêm
        </button>
      </div>
    </div>
  );
}

function SupportEditor({
  value,
  onChange,
}: {
  value: SupportSectionContent;
  onChange: (next: SupportSectionContent) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {value.items.map((it: SupportItem, idx) => (
        <div
          key={idx}
          className="rounded border p-2"
          style={{ borderColor: 'var(--outline-variant)' }}
        >
          <div className="grid grid-cols-2 gap-1">
            <input
              value={it.icon}
              onChange={(e) =>
                onChange({
                  ...value,
                  items: value.items.map((x, i) => (i === idx ? { ...x, icon: e.target.value } : x)),
                })
              }
              placeholder="icon"
              className="rounded border px-1 py-0.5 text-xs"
              style={{ borderColor: 'var(--outline)' }}
            />
            <input
              value={it.label}
              onChange={(e) =>
                onChange({
                  ...value,
                  items: value.items.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)),
                })
              }
              placeholder="nhãn"
              className="rounded border px-1 py-0.5 text-xs"
              style={{ borderColor: 'var(--outline)' }}
            />
            <input
              value={it.description}
              onChange={(e) =>
                onChange({
                  ...value,
                  items: value.items.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x)),
                })
              }
              placeholder="mô tả"
              className="col-span-2 rounded border px-1 py-0.5 text-xs"
              style={{ borderColor: 'var(--outline)' }}
            />
            <label className="col-span-2 text-xs" style={{ color: 'var(--on-surface-variant)' }}>
              <input
                type="checkbox"
                checked={it.available}
                onChange={(e) =>
                  onChange({
                    ...value,
                    items: value.items.map((x, i) => (i === idx ? { ...x, available: e.target.checked } : x)),
                  })
                }
                className="mr-1"
              />
              Đang hỗ trợ
            </label>
          </div>
          <button
            type="button"
            onClick={() =>
              onChange({ ...value, items: value.items.filter((_, i) => i !== idx) })
            }
            className="mt-1 text-xs underline"
            style={{ color: '#8a1c1c' }}
          >
            Xoá
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange({
            ...value,
            items: [
              ...value.items,
              { icon: 'help', label: '', description: '', available: true },
            ],
          })
        }
        className="rounded border px-2 py-1 text-xs"
        style={{ borderColor: 'var(--outline)', color: 'var(--primary)' }}
      >
        + Thêm mục hỗ trợ
      </button>
    </div>
  );
}

function FooterBannerEditor({
  value,
  onChange,
}: {
  value: FooterBannerContent;
  onChange: (next: FooterBannerContent) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="block text-xs" style={{ color: 'var(--on-surface-variant)' }}>
        CTA label:
        <input
          value={value.ctaLabel}
          onChange={(e) => onChange({ ...value, ctaLabel: e.target.value })}
          className="ml-2 w-2/3 rounded border px-1 py-0.5 text-xs"
          style={{ borderColor: 'var(--outline)' }}
        />
      </label>
      <label className="block text-xs" style={{ color: 'var(--on-surface-variant)' }}>
        CTA href:
        <input
          value={value.ctaHref}
          onChange={(e) => onChange({ ...value, ctaHref: e.target.value })}
          className="ml-2 w-2/3 rounded border px-1 py-0.5 text-xs"
          style={{ borderColor: 'var(--outline)' }}
        />
      </label>
      <label className="block text-xs" style={{ color: 'var(--on-surface-variant)' }}>
        Image URL:
        <input
          value={value.imageUrl}
          onChange={(e) => onChange({ ...value, imageUrl: e.target.value })}
          className="ml-2 w-2/3 rounded border px-1 py-0.5 text-xs"
          style={{ borderColor: 'var(--outline)' }}
        />
      </label>
    </div>
  );
}
