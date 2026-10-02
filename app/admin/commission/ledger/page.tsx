/**
 * /admin/commission/ledger — disabled in the current Chợ việc làm
 * operating window. The original STEP-05 (RQ-06) operational page is kept
 * intact on disk in the same directory under a `.disabled.tsx.txt` marker
 * file for reference and future re-enable. The route resolves, the layout
 * still renders the sidebar with the disabled entry, and direct URL access
 * shows the canonical "Tính năng đang phát triển" placeholder.
 *
 * Source / API / schema / RLS are untouched. This is a UI status change
 * only.
 */
import { UnderDevelopment } from '../../_components/UnderDevelopment';

export default function AdminCommissionLedgerPage() {
  return <UnderDevelopment feature="Sổ cái hoa hồng" />;
}
