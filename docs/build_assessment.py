"""Builds docs/assessment.html (with the full schema inlined) and prints it to
docs/matthew_feyler_task_manager_assessment.pdf using headless Chrome/Edge.

    python docs/build_assessment.py
"""
import html
import pathlib
import shutil
import subprocess

DOCS = pathlib.Path(__file__).resolve().parent
ROOT = DOCS.parent
SCHEMA = (ROOT / "supabase" / "schema.sql").read_text(encoding="utf8")
LIVE = "https://flowboard-btz.pages.dev"
REPO = "https://github.com/MonklyS/flowboard"

CSS = """
@font-face { font-family: Inter; src: url(fonts/inter.woff2) format('woff2'); font-weight: 100 900; }
@font-face { font-family: 'JetBrains Mono'; src: url(fonts/jetbrains-mono.woff2) format('woff2'); font-weight: 100 800; }
@page { size: Letter; margin: 0.7in 0.75in 0.75in; }
:root { --ink:#1d1d2b; --muted:#5f6175; --line:#e4e4ee; --accent:#5b54d6; --soft:#f4f4fa;
        --todo:#8a8fa3; --prog:#d98a17; --rev:#9a4fd6; --done:#1f9d73; }
* { box-sizing: border-box; }
body { font-family: Inter, 'Segoe UI', sans-serif; color: var(--ink); font-size: 10.2pt; line-height: 1.55;
       font-feature-settings: 'cv11','ss01'; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; }
h1 { font-size: 26pt; letter-spacing: -0.02em; margin: 0 0 4pt; line-height: 1.1; }
h2 { font-size: 14.5pt; letter-spacing: -0.01em; margin: 22pt 0 8pt; padding-top: 4pt; break-after: avoid; }
h2 .n { color: var(--accent); font-variant-numeric: tabular-nums; margin-right: 6pt; }
h3 { font-size: 11pt; margin: 14pt 0 4pt; break-after: avoid; }
p { margin: 0 0 7pt; }
ul { margin: 0 0 8pt; padding-left: 15pt; } li { margin: 2pt 0; }
a { color: var(--accent); text-decoration: none; font-weight: 500; }
code { font-variant-ligatures: none; font-family: 'JetBrains Mono', Consolas, monospace; font-size: 8.6pt; background: var(--soft);
       border: 1px solid var(--line); border-radius: 3pt; padding: 0 3pt; }
pre { font-variant-ligatures: none; font-family: 'JetBrains Mono', Consolas, monospace; font-size: 7.2pt; line-height: 1.45; background: #f7f7fb;
      border: 1px solid var(--line); border-radius: 6pt; padding: 9pt 11pt; white-space: pre-wrap; word-break: break-word; margin: 0 0 8pt; }
pre.cmd { font-size: 8.4pt; }
.muted { color: var(--muted); }
.cover { border-bottom: 1px solid var(--line); padding-bottom: 14pt; margin-bottom: 4pt; }
.brand { display: flex; align-items: center; gap: 9pt; margin-bottom: 18pt; color: var(--muted); font-size: 9pt; font-weight: 500; }
.brand svg { width: 22pt; height: 22pt; }
.subtitle { font-size: 12pt; color: var(--muted); margin-bottom: 14pt; }
.meta { display: grid; grid-template-columns: auto 1fr; gap: 3pt 14pt; font-size: 9.6pt; }
.meta dt { color: var(--muted); } .meta dd { margin: 0; }
.links { display: grid; grid-template-columns: 1fr 1fr; gap: 10pt; margin: 14pt 0 6pt; }
.link { border: 1px solid var(--line); border-radius: 8pt; padding: 9pt 12pt; background: linear-gradient(180deg,#fff,#fafaff); }
.link .k { font-size: 8pt; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }
.link a { font-size: 10.5pt; }
figure { margin: 10pt 0 12pt; break-inside: avoid; }
figure img { width: 100%; border-radius: 7pt; border: 1px solid var(--line); display: block; }
figcaption { font-size: 8.6pt; color: var(--muted); margin-top: 5pt; }
.row { display: grid; grid-template-columns: 1fr 1fr; gap: 12pt; }
.row-mobile { display: grid; grid-template-columns: 1.9fr 1fr; gap: 12pt; align-items: start; }
table { width: 100%; border-collapse: collapse; font-size: 9pt; margin: 4pt 0 10pt; break-inside: auto; }
th { text-align: left; font-weight: 600; color: var(--muted); font-size: 8pt; text-transform: uppercase; letter-spacing: .05em;
     border-bottom: 1px solid var(--line); padding: 5pt 6pt; }
td { border-bottom: 1px solid var(--line); padding: 5pt 6pt; vertical-align: top; }
tr { break-inside: avoid; }
td code { font-size: 8pt; }
.pill { display: inline-block; font-size: 7.8pt; font-weight: 600; border-radius: 99pt; padding: 1pt 6pt; }
.yes { background: #e6f6ef; color: #17805d; }
.swatches { display: flex; gap: 8pt; flex-wrap: wrap; margin: 6pt 0 10pt; }
.sw { display: flex; align-items: center; gap: 5pt; font-size: 8.6pt; border: 1px solid var(--line); border-radius: 99pt; padding: 2pt 8pt 2pt 3pt; }
.sw i { width: 11pt; height: 11pt; border-radius: 99pt; display: inline-block; }
.callout { border: 1px solid #dcdaf7; background: #f6f5ff; border-radius: 8pt; padding: 9pt 12pt; margin: 8pt 0 10pt; break-inside: avoid; }
.callout b { color: var(--accent); }
.pb { break-before: page; }
.check { columns: 2; column-gap: 18pt; font-size: 8.8pt; padding-left: 13pt; }
"""

LOGO = """<svg viewBox="0 0 24 24"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8b7cf6"/><stop offset="1" stop-color="#5b5bd6"/></linearGradient></defs><rect width="24" height="24" rx="7" fill="url(#g)"/><rect x="5.5" y="6" width="3.6" height="12" rx="1.6" fill="#fff" opacity=".95"/><rect x="10.2" y="6" width="3.6" height="8" rx="1.6" fill="#fff" opacity=".75"/><rect x="14.9" y="6" width="3.6" height="5" rx="1.6" fill="#fff" opacity=".55"/></svg>"""

YES = '<span class="pill yes">Built</span>'

BODY = f"""
<section class="cover">
  <div class="brand">{LOGO} Task Manager Assessment</div>
  <h1>Flowboard</h1>
  <div class="subtitle">A Linear-inspired Kanban board with private guest workspaces, built on React, TypeScript and Supabase.</div>
  <dl class="meta">
    <dt>Author</dt><dd>Matthew Feyler</dd>
    <dt>Date</dt><dd>November 4, 2026</dd>
    <dt>Stack</dt><dd>React 19 · TypeScript · Vite · Tailwind CSS v4 · shadcn/ui (Radix) · dnd-kit · Framer Motion · TanStack Query · Supabase · Cloudflare Pages</dd>
  </dl>
  <div class="links">
    <div class="link"><div class="k">Live demo</div><a href="{LIVE}">{LIVE.replace('https://', '')}</a></div>
    <div class="link"><div class="k">GitHub repository</div><a href="{REPO}">{REPO.replace('https://', '')}</a></div>
  </div>
</section>

<figure>
  <img src="screenshots/board-dark.jpg" alt="Flowboard board in dark mode">
  <figcaption>The board in dark mode with the sample data loaded: status-colored columns, labeled cards, priority and due-date badges, assignee avatars and the summary strip.</figcaption>
</figure>

<h2><span class="n">01</span>Overview</h2>
<p>Flowboard is a single-page web app where each visitor gets a private board with four columns: <b>To Do</b>, <b>In Progress</b>, <b>In Review</b> and <b>Done</b>.
Tasks can be created with a title, description, priority, due date, assignees and labels, then dragged between and within columns. Every change persists to Supabase immediately.
On first launch the app creates a Supabase <b>anonymous</b> user automatically, so there is no sign-up. Row Level Security ensures each guest can only ever read or write their own rows.</p>
<p>Beyond the required board, all seven suggested advanced features are implemented: team members and multi-assignees, comments, an activity log, labels, due-date urgency indicators, search and filters, and a board summary.
The app also has realtime sync across tabs, light/dark themes, keyboard shortcuts and a responsive mobile layout.</p>

<h2><span class="n">02</span>Design decisions</h2>
<h3>Visual system</h3>
<p>The look follows Linear and Asana: calm neutrals, one accent color, dense but readable cards, and color used for meaning rather than decoration.
All colors are OKLCH design tokens defined once in CSS and mapped into Tailwind, so light and dark themes are the same tokens with different values.</p>
<div class="swatches">
  <span class="sw"><i style="background:#5b54d6"></i>Accent · indigo-violet</span>
  <span class="sw"><i style="background:var(--todo)"></i>To Do</span>
  <span class="sw"><i style="background:var(--prog)"></i>In Progress</span>
  <span class="sw"><i style="background:var(--rev)"></i>In Review</span>
  <span class="sw"><i style="background:var(--done)"></i>Done</span>
  <span class="sw"><i style="background:#e5484d"></i>Overdue / high priority</span>
</div>
<ul>
  <li><b>Typography:</b> Inter Variable for the UI (with its alternate glyph sets for a crisper look), JetBrains Mono for counts and IDs, and tabular numerals so numbers don't shift.</li>
  <li><b>Hierarchy:</b> columns are recessed, tinted surfaces with a colored status bar, a status glyph and a count. Cards are raised surfaces with a hairline shadow. Inside a card, labels come first, then a bold title, a muted two-line description, and a quiet metadata row (priority, due badge, comments, avatars).</li>
  <li><b>Status color as a system:</b> each status hue is reused in the column header, the progress-style status icon (an empty ring that fills to a check), activity entries and the stats strip.</li>
  <li><b>Components:</b> shadcn/ui on Radix primitives gives accessible dialogs, popovers, command menus and sheets, all restyled with the tokens. Icons are Lucide.</li>
</ul>

<h3>Drag and drop</h3>
<ul>
  <li><b>dnd-kit</b> with three sensors: mouse (6px threshold, so a click still opens the card), touch (long-press, so the board still scrolls on phones) and keyboard (<code>Space</code> to lift and drop, arrow keys to move, <code>Esc</code> to cancel), plus screen-reader announcements.</li>
  <li>A custom collision strategy prefers whatever is under the pointer and snaps to the nearest card in that column, which keeps cross-column moves predictable. The dragged card floats in an overlay with a slight tilt and lift shadow, and a dashed placeholder shows where it will land.</li>
  <li><b>Ordering</b> uses fractional positions: a dropped card takes the midpoint between its neighbors, so a move writes exactly one row.</li>
  <li>On drop the query cache is patched <i>synchronously</i> before the network request, so the card never flickers back. If the request fails the cache rolls back and a toast explains what happened.</li>
</ul>

<h3>Data and architecture</h3>
<ul>
  <li><b>Supabase is called directly from the browser</b>, with no custom API. RLS is the security boundary either way, and skipping a middle tier removes a deployment and a failure point. The app is static hosting plus Supabase.</li>
  <li><b>TanStack Query</b> handles caching, loading and error states, and optimistic mutations with rollback. Tasks load in a single request that embeds assignees, labels and comment counts.</li>
  <li><b>The activity log is written by Postgres triggers</b>, not by the client. Every write path (drag, edit, assignment, label, comment) is recorded the same way, and clients have no insert permission, so history can't be forged.</li>
  <li><b>Realtime:</b> the app subscribes to Postgres changes filtered to the current user. Supabase applies RLS to these events too. Bursts are debounced and held back while a drag is in progress.</li>
</ul>

<h3>Loading, empty and error states</h3>
<div class="row">
  <ul>
    <li>Splash while the guest session is created; skeleton columns and cards while data loads.</li>
    <li>A welcome banner on an empty board, with "Create task" and one-click <b>sample data</b>.</li>
    <li>Per-column empty states that change during a drag ("Drop here…") and when filters hide everything.</li>
  </ul>
  <ul>
    <li>Full-page and inline error states with <b>Try again</b> (session, board, comments, activity).</li>
    <li>Toasts for failed mutations, with automatic rollback of optimistic changes.</li>
    <li>Friendly messages for common setup issues (anonymous sign-ins disabled, network down, missing env vars).</li>
  </ul>
</div>

<div class="row">
  <figure><img src="screenshots/task-detail-activity.jpg" alt="Task detail panel"><figcaption>Task detail panel with inline-editable fields and the trigger-generated activity timeline.</figcaption></figure>
  <figure><img src="screenshots/board-light.jpg" alt="Light theme"><figcaption>Light theme, using the same tokens with light values.</figcaption></figure>
</div>
<div class="row-mobile">
  <figure><img src="screenshots/search-filter.jpg" alt="Search and filter"><figcaption>Search narrows every column, shows "x/y" counts, and gives each empty column its own message.</figcaption></figure>
  <figure><img src="screenshots/mobile.jpg" alt="Mobile layout" style="max-width:150pt"><figcaption>Phone layout: columns snap one at a time and the sidebar moves into a drawer.</figcaption></figure>
</div>

<h2><span class="n">03</span>Features</h2>
<table>
  <tr><th style="width:27%">Feature</th><th>How it works</th><th style="width:9%"></th></tr>
  <tr><td><b>Kanban board</b> (required)</td><td>Four default columns; drag between and within columns; status and position persist on drop; updates appear live in other open tabs.</td><td>{YES}</td></tr>
  <tr><td><b>Guest accounts</b> (required)</td><td><code>signInAnonymously()</code> on first launch; the session persists in localStorage; every row stores <code>user_id</code> (defaulting to <code>auth.uid()</code>); RLS on every table. "Start as a new guest" in the account menu demonstrates isolation.</td><td>{YES}</td></tr>
  <tr><td><b>Create tasks</b> (required)</td><td>Dialog (or <code>C</code> shortcut, or a column's +) with title, description, status, priority, due date, assignees and labels; validation; "Create more" mode; <code>Ctrl+Enter</code> to submit.</td><td>{YES}</td></tr>
  <tr><td><b>1. Team &amp; assignees</b></td><td>Add members (name + color swatch, initials avatar). Multiple assignees per task via a <code>task_assignees</code> join table. Avatar stacks on cards; the sidebar lists the team with open-task counts and filters on click.</td><td>{YES}</td></tr>
  <tr><td><b>2. Comments</b></td><td>Detail panel with chronological comments, relative and exact timestamps, optimistic posting and delete. Stored in a separate <code>comments</code> table; the comment count shows on cards.</td><td>{YES}</td></tr>
  <tr><td><b>3. Activity log</b></td><td>Triggers on <code>tasks</code>, <code>task_assignees</code>, <code>task_labels</code> and <code>comments</code> write to <code>task_activity</code>. The timeline reads "Moved from To Do → In Review · 2 hours ago", "Assigned Ava Chen", "Changed priority from Normal to High".</td><td>{YES}</td></tr>
  <tr><td><b>4. Labels</b></td><td>Custom colored labels (unique per user), several per task, created inline from the picker or in Workspace settings; filter from the toolbar or sidebar.</td><td>{YES}</td></tr>
  <tr><td><b>5. Due-date indicators</b></td><td>Overdue: red badge plus a red accent bar on the card. Today and next 2 days: amber badges ("Today", "Tomorrow", weekday). Later dates are muted. Done tasks never show as overdue.</td><td>{YES}</td></tr>
  <tr><td><b>6. Search &amp; filtering</b></td><td>Search across title and description (<code>/</code> to focus); filters for priority, assignee (including unassigned), label, and overdue / due soon; removable chips and "Showing x of y".</td><td>{YES}</td></tr>
  <tr><td><b>7. Board summary</b></td><td>Header strip: total and active, completed with a progress bar, overdue, and due soon. The overdue and due-soon tiles are toggle filters.</td><td>{YES}</td></tr>
</table>

<h2><span class="n">04</span>Database schema</h2>
<p>Seven tables, all with RLS enabled. The full SQL is in the appendix and in the repository at <code>supabase/schema.sql</code>; it is idempotent and can be re-run safely.</p>
<table>
  <tr><th style="width:19%">Table</th><th>Columns</th></tr>
  <tr><td><code>tasks</code></td><td><code>id uuid pk</code>, <code>title text not null</code>, <code>description text</code>, <code>status text</code> (todo · in_progress · in_review · done), <code>priority text</code> (low · normal · high), <code>due_date date</code>, <code>position float8</code>, <code>assignee_id uuid → team_members</code>, <code>user_id uuid → auth.users</code>, <code>created_at</code>, <code>updated_at</code></td></tr>
  <tr><td><code>team_members</code></td><td><code>id</code>, <code>user_id</code>, <code>name</code>, <code>color</code> (hex, checked), <code>avatar_url</code>, <code>created_at</code></td></tr>
  <tr><td><code>labels</code></td><td><code>id</code>, <code>user_id</code>, <code>name</code> (unique per user), <code>color</code>, <code>created_at</code></td></tr>
  <tr><td><code>task_assignees</code></td><td><code>(task_id, member_id)</code> pk, <code>user_id</code>, <code>created_at</code>: many-to-many assignees</td></tr>
  <tr><td><code>task_labels</code></td><td><code>(task_id, label_id)</code> pk, <code>user_id</code>, <code>created_at</code>: many-to-many labels</td></tr>
  <tr><td><code>comments</code></td><td><code>id</code>, <code>task_id → tasks</code>, <code>user_id</code>, <code>body</code>, <code>created_at</code></td></tr>
  <tr><td><code>task_activity</code></td><td><code>id</code>, <code>task_id → tasks</code>, <code>user_id</code>, <code>type</code>, <code>payload jsonb</code>, <code>created_at</code>: append-only, trigger-written</td></tr>
</table>
<p class="muted">Check constraints enforce valid statuses, priorities, colors and text lengths. Foreign keys cascade on delete. Indexes cover <code>(user_id, status, position)</code> and the per-task lookups for comments and activity. The single <code>assignee_id</code> column from the brief is kept; the multi-assignee feature uses the join table.</p>

<h2><span class="n">05</span>Security</h2>
<ul>
  <li><b>RLS on every table.</b> Policies compare <code>user_id</code> to <code>auth.uid()</code> for select, insert, update and delete. Insert and update checks stop a user writing rows owned by someone else.</li>
  <li><b>Join tables check both sides.</b> You can only link <i>your</i> task to <i>your</i> member or label, and a task's <code>assignee_id</code> must be one of your members.</li>
  <li><b>Tamper-proof history.</b> Clients can only read <code>task_activity</code>. Triggers write it through a locked-down <code>SECURITY DEFINER</code> function with a fixed <code>search_path</code>, and <code>EXECUTE</code> is revoked from client roles.</li>
  <li><b>Least privilege.</b> All table privileges are revoked from the <code>anon</code> role; guests act as <code>authenticated</code> after anonymous sign-in.</li>
  <li><b>Keys.</b> Only the public publishable (anon) key is used in the frontend. It is supplied through <code>.env.local</code>, which is gitignored; the service-role key is never used anywhere.</li>
</ul>
<div class="callout"><b>Verified end to end.</b> <code>scripts/verify-rls.mjs</code> signs in two separate anonymous guests against the live project and runs 19 checks: B cannot read any of A's tasks, members, labels, comments or activity (even by exact id); B's update and delete of A's task affect 0 rows; B cannot comment on A's task, spoof <code>user_id</code>, attach A's member or label, or forge activity; unauthenticated requests read nothing. All 19 pass.</div>

<h2><span class="n">06</span>Running locally</h2>
<ol>
  <li>Create a free Supabase project. In <b>SQL Editor</b>, run the contents of <code>supabase/schema.sql</code>.</li>
  <li>Enable <b>Authentication → Sign In / Providers → Allow anonymous sign-ins</b>.</li>
  <li>Clone the repo and configure environment variables:</li>
</ol>
<pre class="cmd">git clone {REPO}.git
cd flowboard
cp .env.example .env.local
# VITE_SUPABASE_URL=https://&lt;project-ref&gt;.supabase.co
# VITE_SUPABASE_ANON_KEY=&lt;anon or sb_publishable_ key&gt;
npm install
npm run dev            # http://localhost:5173
npm run build          # type-check + production build to dist/
node --env-file=.env.local scripts/verify-rls.mjs   # optional RLS test</pre>
<p>Deployment: <code>npm run build</code>, then upload <code>dist/</code> to any static host. The live demo uses Cloudflare Pages (<code>wrangler pages deploy dist</code>).</p>

<h2><span class="n">07</span>Tradeoffs and what I'd improve with more time</h2>
<ul>
  <li><b>Guest data lives with the browser.</b> Clearing site data or switching devices loses access to that guest's board. Next step: let a guest upgrade to an email or OAuth account; Supabase can link an identity to an existing anonymous user so the data carries over.</li>
  <li><b>Abuse protection.</b> Anonymous sign-ins can be scripted. In production I'd add Cloudflare Turnstile on sign-in, rely on Supabase's auth rate limits, and run a scheduled job to delete stale anonymous users and their data.</li>
  <li><b>Fractional ordering.</b> Repeated midpoints eventually run out of float precision. Rare in practice, but a periodic rebalance, or switching to string keys (LexoRank-style), would remove the edge case.</li>
  <li><b>Realtime granularity.</b> Change events trigger a debounced refetch of the board. That is simple and always consistent, but large boards would benefit from patching individual rows from the event payload.</li>
  <li><b>Team members are not users.</b> They are names and colors inside one guest's workspace, so comments are always by "You". Real collaboration needs shared workspaces with membership-based RLS policies.</li>
  <li><b>Testing.</b> Coverage today is the RLS integration script plus manual testing in the browser (drag and drop, create, edit, comments, filters, themes, mobile). I'd add Vitest unit tests (filters, ordering, due-date logic) and Playwright end-to-end tests, including a scripted drag.</li>
  <li><b>Bundle size.</b> About 160 KB gzipped in one chunk. Lazy-loading the task panel, calendar and command menu would cut first-load JavaScript.</li>
  <li><b>Polish backlog.</b> Undo for deletes and moves, WIP limits per column, custom columns, a list view, and rich text in descriptions and comments.</li>
</ul>

<div class="pb"></div>
<h2><span class="n">A</span>Appendix: full SQL schema</h2>
<p class="muted">Contents of <code>supabase/schema.sql</code>.</p>
<pre>{html.escape(SCHEMA)}</pre>
"""

page = f"<!doctype html><html lang=en><head><meta charset=utf-8><title>Flowboard: Task Manager Assessment · Matthew Feyler</title><style>{CSS}</style></head><body>{BODY}</body></html>"
out_html = DOCS / "assessment.html"
out_html.write_text(page, encoding="utf8")

browser = next(
    p for p in [
        shutil.which("chrome"), shutil.which("msedge"),
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    ] if p and pathlib.Path(p).exists()
)
pdf = DOCS / "matthew_feyler_task_manager_assessment.pdf"
subprocess.run([
    browser, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
    "--virtual-time-budget=5000", f"--print-to-pdf={pdf}", out_html.as_uri(),
], check=True, capture_output=True)
print(f"Wrote {pdf} ({pdf.stat().st_size // 1024} KB)")
