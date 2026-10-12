/**
 * hrp-t1c-media-global-pool-bulk-upload-hotfix
 *
 * Static fence test xác nhận Media Library client KHÔNG còn folder UI:
 * - Không còn sidebar/select/filter thư mục
 * - Không còn upload qua UploadModal cũ (đã thay bằng MediaBulkUpload)
 * - Không còn label folder trên Media card
 * - URL builder không truyền folder
 * - EditModal không patch folder
 *
 * Đây là tĩnh (static) test — đọc source file và kiểm tra regex/token.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const CLIENT_SRC = readFileSync(
  join(process.cwd(), 'app/admin/media/media-library-client.tsx'),
  'utf8'
);
const BULK_SRC = readFileSync(
  join(process.cwd(), 'app/admin/media/media-bulk-upload.tsx'),
  'utf8'
);
const PAGE_SRC = readFileSync(
  join(process.cwd(), 'app/admin/media/page.tsx'),
  'utf8'
);

describe('/admin/media — no folder UI (hrp-t1c global pool)', () => {
  it('Media Library client does not import or render folder UI components', () => {
    expect(CLIENT_SRC).not.toMatch(/mediaFolderLabel\s*\(/);
    expect(CLIENT_SRC).not.toMatch(/<Folder[A-Z][A-Za-z]+/);
    // No 'Thư mục' label (sidebar/select) left in rendered markup
    expect(CLIENT_SRC).not.toMatch(/>\s*Thư mục\s*</);
    // No <select> with folder-related values (folder=homepage / job-postings / etc.)
    expect(CLIENT_SRC).not.toMatch(/<option\s+value=["']homepage["']/);
    expect(CLIENT_SRC).not.toMatch(/<option\s+value=["']job-postings["']/);
    expect(CLIENT_SRC).not.toMatch(/<option\s+value=["']uncategorized["']/);
  });

  it('Media Library client uses MediaBulkUpload (not legacy UploadModal)', () => {
    expect(CLIENT_SRC).toMatch(/from ['"]\.\/media-bulk-upload['"]/);
    expect(CLIENT_SRC).toMatch(/<MediaBulkUpload\b/);
    // UploadModal cũ đã bỏ hoàn toàn
    expect(CLIENT_SRC).not.toMatch(/<UploadModal\b/);
    expect(CLIENT_SRC).not.toMatch(/UploadModal\s*:/);
  });

  it('Media Library client MediaCard does not display folder name', () => {
    // Tách ra phần render card
    const cardMatch = CLIENT_SRC.match(/function MediaCard[\s\S]*?\n}/);
    expect(cardMatch).not.toBeNull();
    const card = cardMatch![0];
    expect(card).not.toMatch(/>\s*Thư mục\s*</);
    expect(card).not.toMatch(/item\.folder/);
    expect(card).not.toMatch(/folder\s*[:=]/);
  });

  it('URL builder does not include folder in query string', () => {
    const navFn = CLIENT_SRC.match(/function navigate[\s\S]*?\n {2}\}/);
    expect(navFn).not.toBeNull();
    const body = navFn![0].replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(body).not.toMatch(/params\.set\(['"]folder['"]/);
    expect(body).not.toMatch(/folder/);
  });

  it('EditModal PATCH body does not include folder', () => {
    const editModal = CLIENT_SRC.match(/function EditModal[\s\S]*?\n}/m);
    expect(editModal).not.toBeNull();
    const body = editModal![0];
    expect(body).not.toMatch(/folder/);
  });

  it('Server page does not read or forward folder search param', () => {
    expect(PAGE_SRC).not.toMatch(/searchParams\.folder/);
    expect(PAGE_SRC).not.toMatch(/searchParams\[(['"])folder\1\]/);
  });

  it('MediaBulkUpload does not collect folder or alt input from user', () => {
    // Không có ô alt text
    expect(BULK_SRC).not.toMatch(/placeholder=["'][^"']*[Aa]lt[^"']*["']/);
    expect(BULK_SRC).not.toMatch(/label[^>]*[Aa]lt\s+text/);
    // Không có folder select
    expect(BULK_SRC).not.toMatch(/<select[\s\S]*folder[\s\S]*<\/select>/);
    // Không truyền folder khi upload
    const fetchCall = BULK_SRC.match(/fetch\([^)]*upload-url[^)]*\)/);
    if (fetchCall) {
      expect(fetchCall[0]).not.toMatch(/folder/);
    }
  });
});
