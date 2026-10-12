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
 * Extension assembly happens once at module load (synchronous static imports —
 * no `await import(...)`). This guarantees `useEditor` always receives a
 * non-empty extension list on the very first render and ProseMirror's
 * `Schema` constructor is given a node marked `topNode: 'doc'`. The previous
 * async dynamic-import path was the source of the runtime error
 * `Schema is missing its top node type ('doc')` seen on
 * `app/admin/jobs/job-postings/[id]` (T1A hotfix, branch
 * `codex/t1a-jobposting-editor-schema-hotfix`).
 *
 * StarterKit owns Document / Paragraph / Text — those are NOT disabled and
 * NOT re-added as standalone extensions (re-registering would throw
 * `RangeError: Duplicate node names`). StarterKit defaults outside the
 * approved profile are DISABLED:
 *   - code, codeBlock, blockquote, strike, horizontalRule, hardBreak,
 *     underline, undoRedo, dropcursor, gapcursor, trailingNode, listKeymap
 *   - bold / italic / list extensions → re-added individually with explicit
 *     configuration so they remain in the schema with the right options.
 *   - Heading → restricted to levels {2, 3} via configure({levels: [2,3]}).
 *
 * IMPORTANT: This is the ONLY client component allowed to import
 * `@tiptap/react` directly. Domain services / routes must use the SHARED
 * PROFILE in `src/shared/content/job-posting-rich-text/**` instead.
 */

import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import type { JSONContent, AnyExtension } from '@tiptap/core';
import { StarterKit } from '@tiptap/starter-kit';

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
 * Approved extension set for the JobPosting rich-text editor.
 *
 * Synchronously assembled at module load (no dynamic `import()`) so the
 * extensions array is non-empty on the very first call to `useEditor`. This
 * guarantees ProseMirror's `Schema` constructor always receives a node marked
 * `topNode: 'doc'` and prevents the runtime error
 * `Schema is missing its top node type ('doc')`.
 *
 * StarterKit owns every extension we need: Document, Paragraph, Text,
 * Heading (with `levels`), Bold, Italic, BulletList, OrderedList, ListItem,
 * Link, plus the curated-disallowed ones (Code, CodeBlock, Blockquote,
 * Strike, Underline, HorizontalRule, HardBreak, UndoRedo, Dropcursor,
 * Gapcursor, TrailingNode, ListKeymap). We disable the disallowed ones in
 * `StarterKit.configure({...})` and tune the allowed ones via the same
 * config. No extension is re-registered outside StarterKit, which avoids
 * the `RangeError: Duplicate node names` trap.
 *
 * IMPORTANT: This is the ONLY client component allowed to import
 * `@tiptap/react` directly. Domain services / routes must use the SHARED
 * PROFILE in `src/shared/content/job-posting-rich-text/**` instead.
 */
const APPROVED_EXTENSIONS: ReadonlyArray<AnyExtension> = [
  StarterKit.configure({
    heading: { levels: ALLOWED_HEADING_LEVELS },
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
    link: {
      openOnClick: false,
      autolink: true,
      protocols: ['https'],
      HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
    },
  }),
];

/**
 * Exposed for the regression test. Not part of the public domain surface —
 * consumers must go through `JobPostingRichTextEditor`. The export keeps
 * the file self-contained so the test can build a Schema directly from the
 * approved extensions without mounting React.
 */
export function getApprovedExtensions(): ReadonlyArray<AnyExtension> {
  return APPROVED_EXTENSIONS;
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
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    extensions: APPROVED_EXTENSIONS as unknown as Parameters<typeof useEditor>[0]['extensions'],
    content: initialContent ?? { type: 'doc', content: [{ type: 'paragraph' }] },
    editable: !disabled,
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
