/**
 * hero-pickers-no-folder.test.tsx — hrp-t1c-media-global-pool-bulk-upload-hotfix (RQ-12, AC-3, AC-12)
 *
 * Static fence test xác nhận Hero pickers:
 * - Bỏ `folder=homepage` query param.
 * - Đọc chung toàn bộ kho Media (không lọc theo folder).
 * - Empty-state copy bỏ đề cập folder.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const HERO_PICKER_SRC = readFileSync(
  join(process.cwd(), 'app/admin/settings/_components/hero-image-picker.tsx'),
  'utf8'
);
const SLIDES_SRC = readFileSync(
  join(process.cwd(), 'app/admin/settings/_components/hero-slides-editor.tsx'),
  'utf8'
);

describe('Hero pickers — no folder (hrp-t1c global pool)', () => {
  it('HeroImagePicker does not pass folder query', () => {
    expect(HERO_PICKER_SRC).not.toMatch(/folder\s*=\s*['"`]/);
    // Bỏ FOLDER constant cũ
    expect(HERO_PICKER_SRC).not.toMatch(/const\s+FOLDER\s*=/);
    // Empty state không nhắc folder
    expect(HERO_PICKER_SRC).not.toMatch(/folder[\s`]*\}/);
  });

  it('HeroSlidesEditor does not pass folder query', () => {
    expect(SLIDES_SRC).not.toMatch(/folder\s*=\s*['"`]/);
    expect(SLIDES_SRC).not.toMatch(/const\s+FOLDER\s*=/);
    // Empty state copy không nhắc folder
    expect(SLIDES_SRC).not.toMatch(/folder\s+\$\{FOLDER\}/);
  });

  it('Hero pickers still gate via CAN_MANAGE_MEDIA and use canonical /api/admin/media', () => {
    // HeroImagePicker fetch /api/admin/media
    expect(HERO_PICKER_SRC).toMatch(/fetch\([`'"][^`'"]*\/api\/admin\/media/);
    // HeroSlidesEditor fetch /api/admin/media
    expect(SLIDES_SRC).toMatch(/fetch\([`'"][^`'"]*\/api\/admin\/media/);
  });
});
