# T1A — JobPosting Rich Text Editor: hotfix `Schema is missing its top node type ('doc')`

## Outcome

JobPosting admin detail page (`app/admin/jobs/job-postings/[id]`) renders the rich-text editor for all 4 fields (description / requirements / benefits / applicationInstructions) without throwing the ProseMirror schema error.

Editor mounts with the canonical extension set the moment it receives an initial doc — `Document`, `Paragraph`, `Text` are guaranteed to be in the schema on first `useEditor` invocation. `null` and empty initial content fall back to a safe doc containing one paragraph; existing `DRAFT` content round-trips correctly.

## Boundary

**In scope**
- `src/shared/ui/editor/JobPostingRichTextEditor.tsx` — extension list, safe initial content, mounting path
- Regression test (no new dev dependencies; reuse existing test lane + ProseMirror Schema constructor already shipped via `@tiptap/pm`)
- `docs/tasks/hrp-t1a-jobposting-editor-schema-hotfix/HANDOFF.md`

**Out of scope**
- Public renderer (`src/shared/content/job-posting-rich-text/renderer.tsx`) — already `Document`-free and SSR-safe via Tiptap `static-renderer`
- Service contract (`job-posting-rich-text/profile.ts`, validator) — unchanged; only client-side mounting changes
- `page.tsx` (`AdminJobPostingDetailPage`) — server component, already defers to client editor shell; no changes needed
- Production DB, migration, deploy, VPS / Nginx / Vercel configuration
- Other admin editors / detail pages

## Root cause (Tier 1 finding, pre-implementation evidence)

`JobPostingRichTextEditor` was loading extensions via `import('@tiptap/...')` inside an `async loadApprovedExtensions()` and calling `useEditor({ extensions: (extensions ?? []) })`. Two cooperating defects:

1. **First render race**: when `extensions` state is `null`, `useEditor` is called with `extensions: []`. With `@tiptap/core` 3.31.3 the constructor (`new Editor({...})` → `createSchema()`) builds a ProseMirror `Schema` immediately when `immediatelyRender !== false`. The current code sets `immediatelyRender: false`, but on any dep-change path (e.g. when the cached `extensionsPromise` resolves to a new array reference, the editor is rebuilt with the resolved extensions — and if any extension that registers the top-level `doc` node is dropped or unconfigured, ProseMirror's `Schema` ctor throws `Schema is missing its top node type ('doc')`).
2. **Top-level node stripping**: `StarterKit.configure({...})` was disabling `document`, `paragraph`, and `text` (lines 79–81 of `JobPostingRichTextEditor.tsx`) and re-adding them via separate `@tiptap/extension-document`, `@tiptap/extension-paragraph`, `@tiptap/extension-text` imports. Any future refactor that drops the re-add step while keeping the `StarterKit` strip silently produces the exact runtime error users report.

The user's reproduction stack shows `RichFieldCard` → `JobPostingEditorShell` → `AdminJobPostingDetailPage`. The error is thrown by ProseMirror's `Schema` ctor when `extensions` is resolved to a list with no node marked as `topNode: 'doc'`. Both the dynamic-load and the manual-strip-then-readd patterns amplify this risk.

## Fix (minimal)

Replace the async dynamic import + manual strip/readd with **static imports** and **StarterKit defaults for the structural nodes** (Document / Paragraph / Text), keeping only the curated extensions on top. Per task brief: ưu tiên `StarterKit` mặc định, không đăng ký trùng node giữa `StarterKit` và extension rời.

Concretely:
- Static `import { StarterKit } from '@tiptap/starter-kit'` and the standalone extensions we re-add (Heading, BulletList, OrderedList, ListItem, Bold, Italic, Link).
- `StarterKit.configure({ heading: false, bold: false, italic: false, bulletList: false, orderedList: false, listItem: false, code: false, codeBlock: false, blockquote: false, hardBreak: false, horizontalRule: false, strike: false, underline: false, undoRedo: false, dropcursor: false, gapcursor: false, trailingNode: false, listKeymap: false, link: false })` — DO NOT disable `document`, `paragraph`, or `text`. Let StarterKit own those three foundational nodes so the ProseMirror schema always has a `topNode: 'doc'`.
- Re-add only what the approved profile requires beyond StarterKit's defaults: `Heading.configure({ levels: [2, 3] })`, `BulletList`, `OrderedList`, `ListItem`, `Bold`, `Italic`, `Link.configure({ openOnClick: false, autolink: true, protocols: ['https'], HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } })`.
- Keep `immediatelyRender: false` (already present, correct for Next.js client components).
- Keep `content: initialContent ?? { type: 'doc', content: [{ type: 'paragraph' }] }`.
- `RichFieldCard` keeps its null fallback in the `onChange` path.

This is the smallest change that guarantees the schema has a top node. No new dependency. No behavior change beyond making the editor actually mount on first render.

## Lane / Audit

- Lane: **STANDARD** — public contract for `JobPostingRichTextEditor` is observable on the admin detail page; an editor that throws a schema error is a hard regression for the route.
- Audit mode: **NONE** — surface is local to one Client Component; canonical gates (typecheck, build, existing unit tests, new regression test) provide the evidence required by `tier1.md`. No public API/auth/RLS/migration involved.

## BUILD_VS_ADOPT

- **N/A** — task does not create capability kỹ thuật phạng thông (no new editor / form / table / chart / document export). It only repairs the existing TipTap wiring by adopting the **already-pinned** StarterKit defaults (3.31.3, no manifest change). No new package added.

## BUILD_VS_AUTOMATE

- **N/A** — task does not create or change any connector / scheduler / notification / retry / approval-loop / multi-system workflow.

## File ownership

| File | Change |
|---|---|
| `src/shared/ui/editor/JobPostingRichTextEditor.tsx` | Replace async dynamic-import path with static imports; remove `document:false`, `paragraph:false`, `text:false` from `StarterKit.configure(...)`; remove the cached-promise `loadApprovedExtensions()`. |
| `src/shared/ui/editor/JobPostingRichTextEditor.test.tsx` | **NEW**. Mounts the component (or its extension surface) with: (a) valid DRAFT JSON content, (b) `null` initial content, (c) empty `{type:'doc',content:[]}` initial content. Each case proves no `Schema is missing its top node type ('doc')` is thrown and the resolved schema has `topNode === 'doc'`. |

## Canonical gates

1. `npm run typecheck` (must exit 0)
2. `npx eslint src/shared/ui/editor/JobPostingRichTextEditor.tsx src/shared/ui/editor/JobPostingRichTextEditor.test.tsx` (must exit 0)
3. `npx vitest run --config vitest.unit.config.ts src/shared/ui/editor/JobPostingRichTextEditor.test.tsx` (must exit 0)
4. `npx vitest run --config vitest.unit.config.ts` — full unit lane regression (must exit 0)
5. `npm run build` (must exit 0; lint boundary part of next build via eslint)
6. `git diff --check` (must exit 0)
7. `pwsh .ai-pipeline/scripts/verify-encoding.ps1` over `src/shared/ui/editor/JobPostingRichTextEditor.tsx` and `.test.tsx` (no BOM, valid UTF-8)

## Self-review (≤3 risks, since Audit = NONE)

1. **`immediatelyRender: false` correctness**: with the static-import fix, `useEditor({ extensions: [...all extensions present from first render] })` is called every render. With `None: deferred`, the manager returns `null` until deps change; this matches today's behavior and avoids hydration mismatches. Risk: with synchronous extensions and `immediatelyRender: false`, the editor instance is created on first `useEffect` after `editorManager.refreshEditorInstance` decides. Risk: if deps were empty AND no `previousDeps` was set AND `editor` is null, no recreate fires. **Mitigation**: regression test `T3` covers the synchronous extension list assembly path independently of mount; component import alone proves no schema error is thrown for any `extensions` configuration that includes StarterKit's Document/Paragraph/Text trio.
2. **Duplicate node registration**: explicitly adding Document/Paragraph/Text on top of StarterKit would throw `Schema is missing its top node type` as `Duplicate node name`. **Mitigation**: fix removes the manual `Document`/`Paragraph`/`Text` imports and lets StarterKit own them.
3. **Curated profile regression**: the approved list (`doc, paragraph, text, heading(2|3), bulletList, orderedList, listItem, bold/italic/link`) must remain intact. **Mitigation**: extension list is explicit in the fix; `JOB_POSTING_RICH_TEXT_ALLOWED_NODES` and `JOB_POSTING_RICH_TEXT_ALLOWED_MARKS` are unchanged; the renderer test in `src/shared/content/job-posting-rich-text/__tests__/renderer.test.tsx` continues to pass.

## Stop conditions

- Do not merge / deploy.
- Do not touch production DB / migration.
- Do not modify `page.tsx`, `editor-shell.tsx`, `RichFieldCard` beyond comments if needed.
- Do not add dev dependencies (jsdom / happy-dom) — regression test relies on `renderToStaticMarkup` + ProseMirror `Schema` ctor already shipped via `@tiptap/pm` (a transitive production dep).