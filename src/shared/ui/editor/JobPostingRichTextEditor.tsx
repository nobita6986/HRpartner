'use client';

/**
 * src/shared/ui/editor/JobPostingRichTextEditor.tsx
 *
 * CLIENT editor wrapper. Owns Tiptap imports so vendor API never leaks into
 * the domain layer. Renders the shared profile:
 *   - nodes: doc, paragraph, text, heading (level 2 or 3), bulletList,
 *     orderedList, listItem
 *   - marks: bold, italic, link
 *
 * All StarterKit defaults outside the approved profile are DISABLED:
 *   - Heading → restricted to levels {2, 3} via configureHeading({levels: [2,3]})
 *   - code, codeBlock, blockquote, strike, horizontalRule, hardBreak, history,
 *     bold/italic/list/etc. outside the allowlist are removed explicitly via
 *     `StarterKit.configure({...}).setExtensions([...])` — the configure keys
 *     strip the corresponding extension from StarterKit, and we re-add only
 *     the ones we want via the explicit list below.
 *
 * IMPORTANT: This is the ONLY client component allowed to import
 * `@tiptap/react` directly. Domain services / routes must use the SHARED
 * PROFILE in `src/shared/content/job-posting-rich-text/**` instead.
 */

import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import type { JSONContent } from '@tiptap/core';

import {
  JOB_POSTING_RICH_TEXT_ALLOWED_HEADING_LEVELS,
  JOB_POSTING_RICH_TEXT_MAX_BYTES,
  JOB_POSTING_RICH_TEXT_MAX_NODES,
  JOB_POSTING_RICH_TEXT_MAX_DEPTH,
  JOB_POSTING_RICH_TEXT_MAX_URL_BYTES,
  JOB_POSTING_RICH_TEXT_SCHEMA_VERSION,
} from '@/src/shared/content/job-posting-rich-text';

const ALLOWED_HEADING_LEVELS = [...JOB_POSTING_RICH_TEXT_ALLOWED_HEADING_LEVELS];

/**
 * Build a Tiptap extension set that matches the approved profile.
 * `StarterKit.configure({...})` removes defaults we don't want, then we
 * re-add the approved subset via `extensions` so the allowlist is explicit.
 *
 * Loaded via `loadApprovedExtensions()` below — kept async so we never
 * block the editor's first paint and we can code-split if needed.
 */

let cachedExtensionsPromise: Promise<unknown[]> | null = null;

/** Lazily load the approved extension set. Cached after first load. */
function loadApprovedExtensions(): Promise<unknown[]> {
  if (cachedExtensionsPromise) return cachedExtensionsPromise;
  cachedExtensionsPromise = (async () => {
    const [StarterKitMod, DocumentMod, ParagraphMod, TextMod, HeadingMod, BulletListMod, OrderedListMod, ListItemMod, BoldMod, ItalicMod, LinkMod] =
      await Promise.all([
        import('@tiptap/starter-kit'),
        import('@tiptap/extension-document'),
        import('@tiptap/extension-paragraph'),
        import('@tiptap/extension-text'),
        import('@tiptap/extension-heading'),
        import('@tiptap/extension-bullet-list'),
        import('@tiptap/extension-ordered-list'),
        import('@tiptap/extension-list-item'),
        import('@tiptap/extension-bold'),
        import('@tiptap/extension-italic'),
        import('@tiptap/extension-link'),
      ]);

    // Strip every StarterKit extension we do not allow. Tiptap 3.31 uses
    // `undoRedo` (not `history`); `history` is no longer a valid option key.
    const stripped = StarterKitMod.default.configure({
      heading: false,
      bold: false,
      italic: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
      paragraph: false,
      document: false,
      text: false,
      code: false,
      codeBlock: false,
      blockquote: false,
      hardBreak: false,
      horizontalRule: false,
      strike: false,
      underline: false,
      undoRedo: false,
      dropcursor: false,
      gapcursor: false,
      trailingNode: false,
      listKeymap: false,
      link: false,
    });

    return [
      stripped,
      DocumentMod.default,
      ParagraphMod.default,
      TextMod.default,
      HeadingMod.default.configure({
        levels: ALLOWED_HEADING_LEVELS,
      }),
      BulletListMod.default,
      OrderedListMod.default,
      ListItemMod.default,
      BoldMod.default,
      ItalicMod.default,
      LinkMod.default.configure({
        openOnClick: false,
        autolink: true,
        protocols: ['https'],
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
    ];
  })();
  return cachedExtensionsPromise;
}

export interface JobPostingRichTextEditorProps {
  /** Initial JSON doc. Empty/undefined → start with a single empty paragraph. */
  initialContent?: JSONContent | null;
  /** Called whenever the user edits; receives the validated JSON shape. */
  onChange: (doc: JSONContent | null) => void;
  /** Placeholder when the document is empty. */
  placeholder?: string;
  /** Disable editing while a save is in flight. */
  disabled?: boolean;
  /** Optional aria-label for accessibility. */
  ariaLabel?: string;
}

/**
 * Counts node + depth to enforce limits at the input layer. This is a
 * pre-flight check; the SERVER validator is the source of truth.
 */
function countNodesAndDepth(doc: JSONContent | null | undefined): { nodes: number; depth: number } {
  if (!doc) return { nodes: 0, depth: 0 };
  let nodes = 0;
  let maxDepth = 0;
  const visit = (node: JSONContent | null | undefined, depth: number): void => {
    if (!node) return;
    nodes += 1;
    if (depth > maxDepth) maxDepth = depth;
    if (Array.isArray(node.content)) {
      for (const child of node.content) visit(child, depth + 1);
    }
  };
  visit(doc, 1);
  return { nodes, depth: maxDepth };
}

function bytesOf(doc: JSONContent | null): number {
  return new TextEncoder().encode(JSON.stringify(doc ?? null)).length;
}

interface ToolbarProps {
  editor: Editor | null;
  disabled?: boolean;
}

function Toolbar({ editor, disabled }: ToolbarProps) {
  if (!editor) return null;
  const onToggleBold = () => {
    if (disabled) return;
    editor.chain().focus().toggleBold().run();
  };
  const onToggleItalic = () => {
    if (disabled) return;
    editor.chain().focus().toggleItalic().run();
  };
  const onToggleBulletList = () => {
    if (disabled) return;
    editor.chain().focus().toggleBulletList().run();
  };
  const onToggleOrderedList = () => {
    if (disabled) return;
    editor.chain().focus().toggleOrderedList().run();
  };
  const onToggleHeading = (level: 2 | 3) => {
    if (disabled) return;
    editor.chain().focus().toggleHeading({ level }).run();
  };
  const onSetLink = () => {
    if (disabled) return;
    const previous = (editor.getAttributes('link').href as string | undefined) ?? '';
    const input = window.prompt('Link URL (chỉ https://, tối đa 2048 bytes):', previous);
    if (input === null) return;
    const trimmed = input.trim();
    if (trimmed === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    if (new TextEncoder().encode(trimmed).length > JOB_POSTING_RICH_TEXT_MAX_URL_BYTES) {
      window.alert(`Link URL vượt ${JOB_POSTING_RICH_TEXT_MAX_URL_BYTES} bytes.`);
      return;
    }
    if (!trimmed.toLowerCase().startsWith('https://')) {
      window.alert('Link URL chỉ chấp nhận https:// tuyệt đối.');
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: trimmed }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-t border border-b-0 px-2 py-1 text-xs" style={{ borderColor: 'var(--outline)' }}>
      <ToolbarButton onClick={onToggleBold} active={editor.isActive('bold')} disabled={disabled}>
        B
      </ToolbarButton>
      <ToolbarButton onClick={onToggleItalic} active={editor.isActive('italic')} disabled={disabled}>
        I
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton
        onClick={() => onToggleHeading(2)}
        active={editor.isActive('heading', { level: 2 })}
        disabled={disabled}
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        onClick={() => onToggleHeading(3)}
        active={editor.isActive('heading', { level: 3 })}
        disabled={disabled}
      >
        H3
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton onClick={onToggleBulletList} active={editor.isActive('bulletList')} disabled={disabled}>
        • List
      </ToolbarButton>
      <ToolbarButton onClick={onToggleOrderedList} active={editor.isActive('orderedList')} disabled={disabled}>
        1. List
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton onClick={onSetLink} active={editor.isActive('link')} disabled={disabled}>
        Link
      </ToolbarButton>
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className="rounded border px-2 py-0.5 text-xs"
      style={{
        borderColor: 'var(--outline)',
        backgroundColor: active ? 'var(--color-surface-container-high)' : 'transparent',
        color: 'var(--on-surface)',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <span aria-hidden className="mx-1 h-4 w-px" style={{ backgroundColor: 'var(--outline)' }} />;
}

export function JobPostingRichTextEditor({
  initialContent,
  onChange,
  placeholder: _placeholder,
  disabled,
  ariaLabel,
}: JobPostingRichTextEditorProps) {
  const [extensions, setExtensions] = useState<unknown[] | null>(null);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let cancelled = false;
    void loadApprovedExtensions().then((ext) => {
      if (!cancelled) setExtensions(ext);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const editor = useEditor({
    extensions: (extensions ?? []) as Parameters<typeof useEditor>[0] extends infer O
      ? O extends { extensions?: infer E }
        ? E
        : never
      : never,
    content: initialContent ?? { type: 'doc', content: [{ type: 'paragraph' }] },
    editable: !disabled && extensions !== null,
    immediatelyRender: false,
    onUpdate({ editor }) {
      const doc = editor.getJSON();
      const bytes = bytesOf(doc);
      const { nodes, depth } = countNodesAndDepth(doc);
      if (bytes > JOB_POSTING_RICH_TEXT_MAX_BYTES) {
        setLimitMessage(`Vượt ${JOB_POSTING_RICH_TEXT_MAX_BYTES} bytes serialized.`);
        return;
      }
      if (nodes > JOB_POSTING_RICH_TEXT_MAX_NODES) {
        setLimitMessage(`Vượt ${JOB_POSTING_RICH_TEXT_MAX_NODES} node.`);
        return;
      }
      if (depth > JOB_POSTING_RICH_TEXT_MAX_DEPTH) {
        setLimitMessage(`Vượt ${JOB_POSTING_RICH_TEXT_MAX_DEPTH} cấp sâu.`);
        return;
      }
      setLimitMessage(null);
      onChangeRef.current(doc as JSONContent);
    },
  });

  // Keep `disabled` prop in sync (Tiptap API: editor.setEditable).
  useEffect(() => {
    if (editor) editor.setEditable(!disabled);
  }, [editor, disabled]);

  return (
    <div className="flex flex-col">
      <Toolbar editor={editor} disabled={disabled} />
      <div
        className="rounded-b border px-3 py-2 text-sm"
        style={{
          borderColor: 'var(--outline)',
          backgroundColor: 'var(--surface-container-lowest)',
          color: 'var(--on-surface)',
          minHeight: 120,
          opacity: disabled ? 0.6 : 1,
        }}
        aria-label={ariaLabel ?? 'JobPosting rich content editor'}
      >
        <EditorContent editor={editor} />
      </div>
      <div className="mt-1 flex items-center justify-between text-xs" style={{ color: 'var(--on-surface-variant)' }}>
        <span>
          contentSchemaVersion={JOB_POSTING_RICH_TEXT_SCHEMA_VERSION}
        </span>
        {limitMessage && (
          <span role="alert" style={{ color: '#8a1c1c' }}>
            {limitMessage}
          </span>
        )}
      </div>
    </div>
  );
}

/** Read the editor's current JSON doc. Useful for tests/automation. */
export function readEditorJson(editor: Editor | null): JSONContent | null {
  if (!editor) return null;
  return editor.getJSON();
}
