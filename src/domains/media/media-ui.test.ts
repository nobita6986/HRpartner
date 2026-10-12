import { describe, expect, it } from 'vitest';

import {
  MEDIA_FOLDER_LABELS,
  MEDIA_STATUS_LABELS,
  mediaFolderLabel,
  mediaStatusLabel,
} from './media-ui';
import { MEDIA_DEFAULT_FOLDERS } from './media.types';

describe('media UI labels', () => {
  it('covers every canonical folder and status value', () => {
    expect(Object.keys(MEDIA_FOLDER_LABELS)).toEqual([...MEDIA_DEFAULT_FOLDERS]);
    expect(Object.keys(MEDIA_STATUS_LABELS)).toEqual(['PUBLIC', 'INTERNAL']);
  });

  it('translates canonical values and preserves custom folder names', () => {
    expect(MEDIA_FOLDER_LABELS).toEqual({
      uncategorized: 'Chưa phân loại',
      'job-postings': 'Tin tuyển dụng',
      homepage: 'Trang chủ',
      news: 'Tin tức',
      banners: 'Biểu ngữ',
    });
    expect(mediaFolderLabel('job-postings')).toBe('Tin tuyển dụng');
    expect(mediaFolderLabel('homepage')).toBe('Trang chủ');
    expect(mediaFolderLabel('custom-folder')).toBe('custom-folder');
    expect(mediaStatusLabel('PUBLIC')).toBe('Công khai');
    expect(mediaStatusLabel('INTERNAL')).toBe('Nội bộ');
  });
});
