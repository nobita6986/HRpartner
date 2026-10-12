import {
  MEDIA_DEFAULT_FOLDERS,
  type MediaFolder,
  type MediaStatusEnum,
} from './media.types';

export const MEDIA_FOLDER_LABELS: Readonly<Record<MediaFolder, string>> = {
  uncategorized: 'Chưa phân loại',
  'job-postings': 'Tin tuyển dụng',
  homepage: 'Trang chủ',
  news: 'Tin tức',
  banners: 'Biểu ngữ',
};

export const MEDIA_STATUS_LABELS: Readonly<Record<MediaStatusEnum, string>> = {
  PUBLIC: 'Công khai',
  INTERNAL: 'Nội bộ',
};

export function mediaFolderLabel(folder: string): string {
  const knownFolder = MEDIA_DEFAULT_FOLDERS.find((value) => value === folder);
  return knownFolder ? MEDIA_FOLDER_LABELS[knownFolder] : folder;
}

export function mediaStatusLabel(status: MediaStatusEnum): string {
  return MEDIA_STATUS_LABELS[status];
}
