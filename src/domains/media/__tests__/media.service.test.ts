/**
 * media.service.test.ts — AV4 Media service unit tests
 *
 * Test scope:
 * - Validation (filename, size, mime, alt)
 * - Mapper (DTO shapes)
 * - CRUD happy path với Prisma mock
 * - Assignment conflicts
 * - Public read filter
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  MediaNotFoundError,
  MediaAssignmentConflictError,
  MediaValidationError,
  assignMedia,
  createMedia,
  deleteMedia,
  getMedia,
  isAllowedMime,
  isAllowedOwnerType,
  listAssignmentsForMedia,
  listMedia,
  listPublicMediaForOwner,
  toMediaAssignmentDto,
  toMediaItemDto,
  toPublicMediaItemDto,
  unassignMedia,
  updateMedia,
  validateCreateInput,
  validateUpdateInput,
} from '../media.service';
import type { Media, MediaAssignment } from '@prisma/client';

function mockRow(overrides: Partial<Media> = {}): Media {
  return {
    id: 'm1',
    url: 'https://blob.example/hrp/test.png',
    alt: 'Test image',
    caption: null,
    order: 0,
    status: 'PUBLIC',
    cover: false,
    folder: 'uncategorized',
    tags: [],
    filename: 'test.png',
    size: 1024,
    mimeType: 'image/png',
    publicUrl: 'https://blob.example/hrp/test.png',
    ownerId: 'u1',
    createdAt: new Date('2026-09-12T00:00:00Z'),
    updatedAt: new Date('2026-09-12T00:00:00Z'),
    createdById: null,
    ...overrides,
  };
}

function mockAssignment(overrides: Partial<MediaAssignment> = {}): MediaAssignment {
  return {
    id: 'ma1',
    mediaId: 'm1',
    ownerType: 'JobPosting',
    ownerId: 'jp1',
    order: 0,
    cover: false,
    createdAt: new Date('2026-09-12T00:00:00Z'),
    ...overrides,
  };
}

function makeClient() {
  const media = {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const assignment = {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  };
  return {
    media,
    mediaAssignment: assignment,
    _client: { media, mediaAssignment: assignment },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('validateCreateInput', () => {
  it('accepts valid input', () => {
    expect(() =>
      validateCreateInput({
        url: 'https://blob.example/hrp/test.png',
        alt: 'Test image',
        filename: 'test.png',
        size: 1024,
        mimeType: 'image/png',
        ownerId: 'u1',
      }),
    ).not.toThrow();
  });

  it('rejects http:// url (must be https)', () => {
    expect(() =>
      validateCreateInput({
        url: 'http://blob.example/hrp/test.png',
        alt: 'Test image',
        filename: 'test.png',
        size: 1024,
        mimeType: 'image/png',
        ownerId: 'u1',
      }),
    ).toThrow(MediaValidationError);
  });

  it('rejects non-allowed mime', () => {
    expect(() =>
      validateCreateInput({
        url: 'https://blob.example/hrp/test.png',
        alt: 'Test image',
        filename: 'test.png',
        size: 1024,
        mimeType: 'image/svg+xml',
        ownerId: 'u1',
      }),
    ).toThrow(/mimeType phải là một trong/);
  });

  it('rejects oversize > 5MB', () => {
    expect(() =>
      validateCreateInput({
        url: 'https://blob.example/hrp/test.png',
        alt: 'Test image',
        filename: 'test.png',
        size: 6 * 1024 * 1024,
        mimeType: 'image/png',
        ownerId: 'u1',
      }),
    ).toThrow(/size phải nằm trong/);
  });

  it('rejects empty alt when status PUBLIC', () => {
    expect(() =>
      validateCreateInput({
        url: 'https://blob.example/hrp/test.png',
        alt: '   ',
        filename: 'test.png',
        size: 1024,
        mimeType: 'image/png',
        ownerId: 'u1',
      }),
    ).toThrow(/alt là bắt buộc khi status = PUBLIC/);
  });

  it('allows empty alt when status INTERNAL', () => {
    expect(() =>
      validateCreateInput({
        url: 'https://blob.example/hrp/test.png',
        alt: '',
        filename: 'test.png',
        size: 1024,
        mimeType: 'image/png',
        ownerId: 'u1',
        status: 'INTERNAL',
      }),
    ).not.toThrow();
  });
});

describe('validateUpdateInput', () => {
  it('rejects url update via PATCH', () => {
    expect(() =>
      validateUpdateInput(
        { url: 'https://new.example/x.png' } as never,
        'PUBLIC',
      ),
    ).toThrow(/url không được cập nhật qua PATCH/);
  });

  it('rejects empty alt when staying PUBLIC', () => {
    expect(() => validateUpdateInput({ alt: '' }, 'PUBLIC')).toThrow(
      /alt là bắt buộc/,
    );
  });

  it('rejects tag longer than 50 chars', () => {
    expect(() => validateUpdateInput({ tags: ['a'.repeat(51)] }, 'PUBLIC')).toThrow(
      /1\.\.50 ký tự/,
    );
  });
});

describe('isAllowedMime / isAllowedOwnerType', () => {
  it('accepts allowed mime types', () => {
    expect(isAllowedMime('image/png')).toBe(true);
    expect(isAllowedMime('image/webp')).toBe(true);
    expect(isAllowedMime('image/jpeg')).toBe(true);
    expect(isAllowedMime('image/gif')).toBe(true);
  });

  it('rejects non-allowed mime', () => {
    expect(isAllowedMime('image/svg+xml')).toBe(false);
    expect(isAllowedMime('application/pdf')).toBe(false);
  });

  it('accepts allowlist owner types', () => {
    expect(isAllowedOwnerType('JobPosting')).toBe(true);
    expect(isAllowedOwnerType('HomepageSection')).toBe(true);
  });

  it('rejects unknown owner type', () => {
    expect(isAllowedOwnerType('RandomEntity')).toBe(false);
  });
});

describe('mappers', () => {
  it('toMediaItemDto maps row + createdBy + assignmentCount', () => {
    const dto = toMediaItemDto(mockRow(), { id: 'u1', name: 'Admin' }, 3);
    expect(dto.id).toBe('m1');
    expect(dto.createdAt).toBe('2026-09-12T00:00:00.000Z');
    expect(dto.createdBy?.name).toBe('Admin');
    expect(dto.assignmentCount).toBe(3);
  });

  it('toMediaAssignmentDto maps MediaAssignment row', () => {
    const dto = toMediaAssignmentDto(mockAssignment());
    expect(dto.id).toBe('ma1');
    expect(dto.ownerType).toBe('JobPosting');
  });

  it('toPublicMediaItemDto uses publicUrl fallback to url', () => {
    const row: MediaAssignment & { media: Media } = {
      ...mockAssignment(),
      media: mockRow({ publicUrl: '' }),
    };
    const dto = toPublicMediaItemDto(row);
    expect(dto.url).toBe('https://blob.example/hrp/test.png');
  });
});

describe('createMedia', () => {
  it('persists record via prisma', async () => {
    const c = makeClient();
    c._client.media.create.mockResolvedValue(mockRow());
    const item = await createMedia(c as never, {
      url: 'https://blob.example/hrp/test.png',
      alt: 'Test image',
      filename: 'test.png',
      size: 1024,
      mimeType: 'image/png',
      ownerId: 'u1',
    });
    expect(item.id).toBe('m1');
    expect(c._client.media.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          url: 'https://blob.example/hrp/test.png',
          publicUrl: 'https://blob.example/hrp/test.png',
          ownerId: 'u1',
        }),
      }),
    );
  });
});

describe('getMedia / updateMedia / deleteMedia', () => {
  it('getMedia throws if missing', async () => {
    const c = makeClient();
    c._client.media.findUnique.mockResolvedValue(null);
    await expect(getMedia(c as never, 'missing')).rejects.toBeInstanceOf(MediaNotFoundError);
  });

  it('getMedia returns DTO with assignment count', async () => {
    const c = makeClient();
    c._client.media.findUnique.mockResolvedValue({
      ...mockRow(),
      createdBy: { id: 'u1', name: 'Admin' },
      _count: { assignments: 5 },
    });
    const item = await getMedia(c as never, 'm1');
    expect(item.assignmentCount).toBe(5);
  });

  it('updateMedia throws if missing', async () => {
    const c = makeClient();
    c._client.media.findUnique.mockResolvedValue(null);
    await expect(updateMedia(c as never, 'missing', { alt: 'x' })).rejects.toBeInstanceOf(
      MediaNotFoundError,
    );
  });

  it('updateMedia updates fields', async () => {
    const c = makeClient();
    c._client.media.findUnique.mockResolvedValue({ status: 'PUBLIC' });
    c._client.media.update.mockResolvedValue({
      ...mockRow({ alt: 'Updated', status: 'INTERNAL' }),
      createdBy: null,
      _count: { assignments: 0 },
    });
    const item = await updateMedia(c as never, 'm1', { alt: 'Updated', status: 'INTERNAL' });
    expect(item.alt).toBe('Updated');
    expect(item.status).toBe('INTERNAL');
  });

  it('deleteMedia calls blobDeleter then prisma delete', async () => {
    const c = makeClient();
    c._client.media.findUnique.mockResolvedValue({ url: 'https://blob.example/hrp/test.png' });
    c._client.media.delete.mockResolvedValue(mockRow());
    const deleter = vi.fn().mockResolvedValue(undefined);
    await deleteMedia(c as never, 'm1', deleter);
    expect(deleter).toHaveBeenCalledWith('https://blob.example/hrp/test.png');
    expect(c._client.media.delete).toHaveBeenCalledWith({ where: { id: 'm1' } });
  });

  it('deleteMedia throws when media missing', async () => {
    const c = makeClient();
    c._client.media.findUnique.mockResolvedValue(null);
    await expect(deleteMedia(c as never, 'missing', vi.fn())).rejects.toBeInstanceOf(
      MediaNotFoundError,
    );
  });
});

describe('listMedia', () => {
  it('caps take at 50 and offset at 0', async () => {
    const c = makeClient();
    c._client.media.findMany.mockResolvedValue([]);
    c._client.media.count.mockResolvedValue(0);
    await listMedia(c as never, { take: 999, skip: -5 });
    expect(c._client.media.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50, skip: 0 }),
    );
  });

  it('returns paginated response', async () => {
    const c = makeClient();
    c._client.media.findMany.mockResolvedValue([
      { ...mockRow(), createdBy: null, _count: { assignments: 1 } },
    ]);
    c._client.media.count.mockResolvedValue(1);
    const result = await listMedia(c as never, { take: 20, skip: 0 });
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });
});

describe('assignMedia / unassignMedia / listAssignments', () => {
  it('assigns when no duplicate', async () => {
    const c = makeClient();
    c._client.media.findUnique.mockResolvedValue({ id: 'm1' });
    c._client.mediaAssignment.findUnique.mockResolvedValue(null);
    c._client.mediaAssignment.create.mockResolvedValue(mockAssignment());
    const dto = await assignMedia(c as never, {
      mediaId: 'm1',
      ownerType: 'JobPosting',
      ownerId: 'jp1',
    });
    expect(dto.id).toBe('ma1');
  });

  it('throws conflict on duplicate', async () => {
    const c = makeClient();
    c._client.media.findUnique.mockResolvedValue({ id: 'm1' });
    c._client.mediaAssignment.findUnique.mockResolvedValue(mockAssignment());
    await expect(
      assignMedia(c as never, { mediaId: 'm1', ownerType: 'JobPosting', ownerId: 'jp1' }),
    ).rejects.toBeInstanceOf(MediaAssignmentConflictError);
  });

  it('throws when media missing', async () => {
    const c = makeClient();
    c._client.media.findUnique.mockResolvedValue(null);
    await expect(
      assignMedia(c as never, { mediaId: 'missing', ownerType: 'JobPosting', ownerId: 'jp1' }),
    ).rejects.toBeInstanceOf(MediaNotFoundError);
  });

  it('rejects ownerType not in allowlist', async () => {
    const c = makeClient();
    await expect(
      assignMedia(c as never, {
        mediaId: 'm1',
        ownerType: 'RandomEntity' as never,
        ownerId: 'x',
      }),
    ).rejects.toThrow(MediaValidationError);
  });

  it('unassignMedia throws when assignment missing', async () => {
    const c = makeClient();
    c._client.mediaAssignment.findUnique.mockResolvedValue(null);
    await expect(unassignMedia(c as never, 'missing')).rejects.toThrow(/không tồn tại/);
  });

  it('unassignMedia deletes when found', async () => {
    const c = makeClient();
    c._client.mediaAssignment.findUnique.mockResolvedValue(mockAssignment());
    c._client.mediaAssignment.delete.mockResolvedValue(mockAssignment());
    await unassignMedia(c as never, 'ma1');
    expect(c._client.mediaAssignment.delete).toHaveBeenCalledWith({ where: { id: 'ma1' } });
  });

  it('listAssignmentsForMedia returns DTOs', async () => {
    const c = makeClient();
    c._client.mediaAssignment.findMany.mockResolvedValue([mockAssignment()]);
    const items = await listAssignmentsForMedia(c as never, 'm1');
    expect(items).toHaveLength(1);
  });
});

describe('listPublicMediaForOwner', () => {
  it('returns only PUBLIC media projection', async () => {
    const c = makeClient();
    c._client.mediaAssignment.findMany.mockResolvedValue([
      {
        ...mockAssignment(),
        media: mockRow(),
      },
    ]);
    const result = await listPublicMediaForOwner(c as never, 'JobPosting', 'jp1');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].url).toBe('https://blob.example/hrp/test.png');
  });
});
