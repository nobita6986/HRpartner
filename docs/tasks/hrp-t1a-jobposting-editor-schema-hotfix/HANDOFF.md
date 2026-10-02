# HANDOFF — T1A JobPosting Rich Text Editor: hotfix `Schema is missing its top node type ('doc')`

## TL;DR

`JobPostingRichTextEditor` (`src/shared/ui/editor/JobPostingRichTextEditor.tsx`) was
mounting the TipTap editor with `extensions: []` while an async dynamic-import
promise was still pending. Even with `immediatelyRender: false`, any dep-change
path that rebuilt the editor with a resolved extension list that did not register
the top-level `doc` node caused ProseMirror's `Schema` constructor to throw
`Schema is missing its top node type ('doc')` on `app/admin/jobs/job-postings/[id]`.

The fix is a static-import + `StarterKit`-owns-Document/Paragraph/Text
configuration: `Document`, `Paragraph`, `Text` are guaranteed present in the
schema on the very first `useEditor` invocation, and no extension is duplicated
(no `RangeError: Duplicate node names`). Safe default content
`{ type: 'doc', content: [{ type: 'paragraph' }] }` and `immediatelyRender: false`
are preserved.

A regression test (`JobPostingRichTextEditor.test.tsx`) proves:

- The approved extension list is non-empty and synchronous at module load.
- `getSchema(getApprovedExtensions())` does NOT throw the runtime error.
- The resolved schema has `topNodeType.name === 'doc'` plus the structural trio.
- The allowed node/mark surface matches the canonical profile; disallowed
  StarterKit defaults are stripped.
- Heading is restricted to allowed levels `{2, 3}`.
- Safe default content, full DRAFT content, `null` fallback, and empty
  `{ type: 'doc', content: [] }` all parse cleanly.
- No node / mark is registered twice.
- A negative-control test (intentionally stripping `document/paragraph/text`)
  reproduces the original ProseMirror error verbatim.

## Branch / commits

| Identity               | Value                                                   |
|------------------------|---------------------------------------------------------|
| Branch                   | `codex/t1a-jobposting-editor-schema-hotfix`            |
| Worktree                | `C:\CodeApp\HrP-worktrees\t1a-jobposting-editor-schema-hotfix` |
| Baseline (pre-fix) HEAD | `1f863656e417fbfbd65ef7081946b166c47c7940`             |
| `origin/main` @ branch creation | `1f863656e417fbfbd65ef7081946b166c47c7940`       |
| `origin/main` current  | `cdde6cef6fd5fdda8c098fb90d9d6d8989feda67` (one commit ahead) |
| Implementation SHA     | see commit created by this PR (recorded below)          |

## Root cause (precise)

Two cooperating defects in
`src/shared/ui/editor/JobPostingRichTextEditor.tsx` (pre-fix):

1. **First-render race**: `useEditor` was invoked with `extensions: (extensions ?? [])`
   where `extensions` came from a React state variable populated by an async
   `loadApprovedExtensions()` that resolved a `import('@tiptap/...')` promise.
   On the very first render the array was empty (`[]`), and any subsequent
   dep-change that rebuilt the editor with a resolved list lacking a `topNode`
   made ProseMirror's `Schema` ctor throw.
2. **Manual strip-then-readd of structural nodes**: the previous
   `StarterKit.configure({...})` disabled `document`, `paragraph`, and `text`
   (the trio StarterKit owns by default) and re-added them via separate
   `@tiptap/extension-document`, `@tiptap/extension-paragraph`,
   `@tiptap/extension-text` packages. Any future refactor that dropped the
   re-add step while keeping the strip silently produced the exact runtime
   error users reported.

The TipTap/ProseMirror error string reproduced by stripping `document/paragraph/text`
and not re-registering them is verbatim:
`Schema is missing its top node type ('doc')`. The negative-control test in
`JobPostingRichTextEditor.test.tsx` asserts this.

## Fix

Replaced the async dynamic-import path with **static imports**. `StarterKit`
now owns the structural nodes (`Document`, `Paragraph`, `Text`); no
standalone `@tiptap/extension-document|paragraph|text` import is added back
(avoids `RangeError: Duplicate node names`).

```ts
import { StarterKit } from '@tiptap/starter-kit';

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

export function getApprovedExtensions(): ReadonlyArray<AnyExtension> {
  return APPROVED_EXTENSIONS;
}
```

`useEditor` consumes the array synchronously, with:

```ts
content: initialContent ?? { type: 'doc', content: [{ type: 'paragraph' }] },
immediatelyRender: false,
```

`immediatelyRender: false` was already present and is correct for Next.js
Client Components (avoids SSR hydration mismatches). It is not the root cause
of the bug — it is a hardening requirement only.

## Files touched

| File | Change |
|---|---|
| `src/shared/ui/editor/JobPostingRichTextEditor.tsx` | Static imports; `StarterKit`-owned Document/Paragraph/Text; `APPROVED_EXTENSIONS` assembled at module load; exported `getApprovedExtensions()` for the regression test; removed async `loadApprovedExtensions()` state; preserved safe-default content and `immediatelyRender: false`. |
| `src/shared/ui/editor/JobPostingRichTextEditor.test.tsx` | NEW. 11 regression assertions covering the contract above. |
| `docs/tasks/hrp-t1a-jobposting-editor-schema-hotfix/TASK.md` | Task contract (already present at baseline). |
| `docs/tasks/hrp-t1a-jobposting-editor-schema-hotfix/HANDOFF.md` | THIS FILE. |
| `pnpm-lock.yaml` | Re-resolved by `npm install` in this fresh worktree (no dependency added; canonical lockfile drift only). |

No public API change. No contract change. No new dependency. No DB /
migration / production config touched.

## Verification gates

All canonical gates executed from the worktree root on
`C:\CodeApp\HrP-worktrees\t1a-jobposting-editor-schema-hotfix`.

| # | Gate | Result |
|---|---|---|
| 1 | `node .ai-pipeline/scripts/verify-encoding.mjs` (changed surface) | **PASS** (4 files, 0 BOM, strict UTF-8). |
| 2 | `git diff --check HEAD` | exit 0 (no whitespace/line-ending issues). |
| 3 | `npx vitest run --config vitest.unit.config.ts src/shared/ui/editor/JobPostingRichTextEditor.test.tsx` | **PASS** — 11/11 assertions. |
| 4 | `npm run typecheck` | exit 0. |
| 5 | `npx eslint src/shared/ui/editor/JobPostingRichTextEditor.tsx src/shared/ui/editor/JobPostingRichTextEditor.test.tsx` | exit 0. |
| 6 | `npx vitest run --config vitest.unit.config.ts` (full unit lane) | **PASS** — 213 files, 3535 tests, 9 skipped. |
| 7 | `npm run build` | exit 0. |
| 8 | `node .ai-pipeline/scripts/verify-encoding-range.mjs origin/main HEAD` | PASS — range is empty (no committed delta yet at handoff write; will be re-checked after the implementation commit lands). |

Range-based strict encoding re-run after the implementation commit:

> Implementation commit not yet created at handoff write. The implementation
> commit is recorded in the `commit-sha` field of the final report returned
> in chat; the range verifier is rerun against
> `<baseline>..HEAD` immediately before push so the committed surface is
> verified clean.

## Regression test — before/after

### Before (reproduces the original bug)

```ts
const broken = [
  StarterKit.configure({
    document: false,
    paragraph: false,
    text: false,
    heading: { levels: [...JOB_POSTING_RICH_TEXT_ALLOWED_HEADING_LEVELS] },
    code: false, codeBlock: false, blockquote: false,
    hardBreak: false, horizontalRule: false,
    strike: false, underline: false,
    undoRedo: false, dropcursor: false, gapcursor: false,
    trailingNode: false, listKeymap: false,
  }),
];
expect(() => getSchema(broken as Parameters<typeof getSchema>[0]))
  .toThrowError("Schema is missing its top node type ('doc')");
```

### After (the actual fix)

```ts
const schema = getSchema(getApprovedExtensions() as Parameters<typeof getSchema>[0]);
expect(schema.topNodeType.name).toBe('doc');
expect(schema.nodes.doc).toBeDefined();
expect(schema.nodes.paragraph).toBeDefined();
expect(schema.nodes.text).toBeDefined();
```

Plus four content-shape regression cases (DRAFT JSON, `null` fallback,
empty `{ type: 'doc', content: [] }`, and the safe default
`{ type: 'doc', content: [{ type: 'paragraph' }] }`) that all parse
cleanly through `Node.fromJSON(schema, ...)`.

## Stop conditions respected

- Did not merge to `main`.
- Did not deploy.
- Did not write / migrate production DB.
- Did not add dev dependencies (jsdom / happy-dom); the regression test
  uses ProseMirror's `Schema` + `Node` APIs already shipped transitively
  via `@tiptap/pm`.
- Did not modify `page.tsx`, `editor-shell.tsx`, or `RichFieldCard` — the
  fix is local to the editor component.

## Rollback

`git revert <implementation-sha>` on `codex/t1a-jobposting-editor-schema-hotfix`,
or `gh pr close <pr-number>` before merge. No data, schema, or production
config is mutated by this PR, so rollback is purely code-level.

## CI

PR will trigger the standard Vercel Preview + Next.js typecheck/lint/test
gates inherited from `main`. No CI workflow file is modified.

## Implementation commit

Recorded in the final report. Implementation SHA + PR URL appear in the
agent's chat reply at the close of this handoff.