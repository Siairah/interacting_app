/**
 * Generates product_backlog_trello.csv — Scrum backlog for Trello / Sheets import.
 * Run: node scripts/generate-product-backlog.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "..", "docs", "product_backlog_trello.csv");

function esc(s) {
  if (s == null || s === undefined) return '""';
  const t = String(s).replace(/\r\n/g, "\n");
  return `"${t.replace(/"/g, '""')}"`;
}

const header = [
  "List",
  "Title",
  "Labels",
  "Priority",
  "Story_Type",
  "Epic_Group",
  "Story_ID",
  "Dependencies",
  "Description",
];

const rows = [];

function add(
  list,
  title,
  labels,
  priority,
  storyType,
  epic,
  storyId,
  deps,
  description
) {
  rows.push([
    list,
    title,
    labels,
    priority,
    storyType,
    epic,
    storyId,
    deps,
    description,
  ]);
}

// --- Meta / Scrum ---
add(
  "Product Backlog",
  "[META] Definition of Ready (DoR) — template",
  "Scrum;Process",
  "High",
  "Process",
  "META",
  "META-DOR",
  "",
  `Before a backlog item moves to Sprint Planning:
• User value and scope are clear; dependencies identified.
• Acceptance criteria drafted and reviewable by dev + QA.
• Size agreed (story points or t-shirt) or flagged as spike.
• No blocking unknowns (or spike scheduled first).
• UX copy and API contracts available or task split for discovery.

Template for the team. Not a dev task — pin in Trello description or Confluence link.`
);

add(
  "Product Backlog",
  "[META] Definition of Done (DoD) — template",
  "Scrum;Process",
  "High",
  "Process",
  "META",
  "META-DOD",
  "",
  `A story is Done when:
• Code merged to main with review approved.
• Unit/integration tests where applicable; critical paths covered.
• FE: responsive check on target breakpoints; a11y basics (labels, focus).
• BE: API documented in README or OpenAPI stub; errors consistent with app error handler.
• Deployed or release-note ready; feature flag off if partial.

Team agreement. Align with your CI pipeline.`
);

// --- Requirement & Planning ---
add(
  "Product Backlog",
  "[EPIC] Requirement & Planning",
  "Epic;Planning",
  "High",
  "Epic",
  "Requirement & Planning",
  "EPIC-R",
  "",
  `Phase window (reference): 10-Sep-2025 → 17-Oct-2025. Planning, discovery, UX and technical foundation before build sprints.
Track child stories R1–R4 under this epic in Trello (labels + links).`
);

add(
  "Product Backlog",
  "[R1] Requirement gathering",
  "Planning;Discovery;BA",
  "High",
  "User Story",
  "Requirement & Planning",
  "R1",
  "",
  `AS A product owner / BA
I WANT workshops and structured capture of functional and non-functional requirements
SO THAT scope, constraints, and success metrics are agreed before build.

Acceptance criteria:
• Stakeholder interviews / workshop notes stored (link in card).
• Initial domain model: users, circles, posts, events, chat, notifications, admin.
• NFR list: security (JWT, OTP), performance, mobile web, realtime scope.
• Open questions and risks logged with owners.

Frontend scope: N/A (documentation; optional low-fi sitemap).
Backend scope: N/A (documentation; inventory of existing APIs if brownfield).

Artifacts: requirements log, glossary, priority matrix.`
);

add(
  "Product Backlog",
  "[R2] Analysis & specification",
  "Planning;Specification;BA",
  "High",
  "User Story",
  "Requirement & Planning",
  "R2",
  "R1: Requirement gathering",
  `AS A delivery team
I WANT analysis and written specifications (flows, data, integrations)
SO THAT dev and QA share one source of truth.

Acceptance criteria:
• User journeys for auth, profile, circles, feed, chat, moderation, admin.
• Entity relationships documented (users ↔ circles ↔ posts ↔ reports).
• API style agreed (REST + Socket.IO usage, error shape, pagination).
• Traceability: each epic maps to modules in codebase folders.

Frontend: screen inventory aligned with Next.js app routes.
Backend: route inventory for Node/API; socket events list draft.

Artifacts: spec doc or wiki link; sequence diagrams optional.`
);

add(
  "Product Backlog",
  "[R3] Design mockups / UI/UX",
  "UX;UI;Frontend",
  "High",
  "User Story",
  "Requirement & Planning",
  "R3",
  "R2: Analysis & specification",
  `AS A user
I WANT a consistent, accessible UI for core flows
SO THAT the product feels cohesive on desktop and mobile.

Acceptance criteria:
• Style tokens: colors, typography, spacing for dashboard, circle, chat, auth.
• Key screens: landing, auth, profile, dashboard, circle detail, manage circle, chat, notifications, admin (if in scope).
• Mobile breakpoints and bottom nav pattern documented.
• Components map to React/CSS modules or design system notes.

Frontend: Figma or reference screenshots linked; component checklist.
Backend: N/A unless admin/reporting PDFs.

Definition of ready for UI dev: approved mockups + copy deck.`
);

add(
  "Product Backlog",
  "[R4] Technical architecture",
  "Architecture;Backend;Frontend;Security",
  "High",
  "User Story",
  "Requirement & Planning",
  "R4",
  "R3: Design mockups / UI/UX",
  `AS A tech lead
I WANT an architecture document for frontend, backend, and realtime
SO THAT we can scale and onboard developers safely.

Acceptance criteria:
• C4 or box diagram: Next.js client, API server, DB, Redis (if any), Socket.IO, file storage.
• Auth: JWT lifecycle, refresh strategy, socket auth handshake documented.
• Environments: dev/stage/prod; secrets via env vars (.env.example aligned).
• Data migration and backup approach for PostgreSQL/MySQL as applicable.

Frontend: Next.js app router, client boundaries, shared utils (apiUtils, socketAuth).
Backend: Express/Fastify structure; middleware order; error middleware.

Artifacts: ADR optional; README architecture section.`
);

// --- Authentication ---
add(
  "Product Backlog",
  "[EPIC] Authentication",
  "Epic;Auth;Security",
  "High",
  "Epic",
  "Authentication",
  "EPIC-A",
  "",
  `Reference phase: 18-Oct-2025 → 05-Nov-2025. Register, OTP, profile setup, login/JWT, edge cases, socket registration, forgot password, admin auth.
Child stories A1–A10.`
);

add(
  "Product Backlog",
  "[A1] Register email/phone/password",
  "Auth;Frontend;Backend",
  "High",
  "User Story",
  "Authentication",
  "A1",
  "",
  `AS A new user
I WANT to register with email or phone and password
SO THAT I can create an account with validation.

Acceptance criteria:
• Registration form validates format (email/phone), password policy.
• Duplicate account returns clear API error; no user enumeration leak (generic message acceptable per policy).
• Passwords hashed server-side; never logged.

Frontend: signup page, validation UX, loading/error states.
Backend: POST register endpoint, validation, persistence, rate limit consideration.

API: document request/response and error codes.`
);

add(
  "Product Backlog",
  "[A2] Email OTP + verify",
  "Auth;Frontend;Backend",
  "High",
  "User Story",
  "Authentication",
  "A2",
  "A1: Register email/phone/password",
  `AS A user
I WANT to verify my contact via OTP
SO THAT only I can activate my account.

Acceptance criteria:
• OTP generated, stored with expiry; resend with cooldown.
• Verify endpoint marks user verified; invalid/expired OTP handled.
• Email/SMS provider abstracted (stub ok in dev).

Frontend: verify-otp page, resend, error messages.
Backend: OTP generation, storage, verify route, cleanup job optional.

Tests: happy path, wrong OTP, expiry.`
);

add(
  "Product Backlog",
  "[A3] Post-verify profile setup",
  "Auth;Profile;Frontend;Backend",
  "High",
  "User Story",
  "Authentication",
  "A3",
  "A2: Email OTP + verify",
  `AS A verified user
I WANT to complete profile setup after verification
SO THAT I can use the app with a display name and photo.

Acceptance criteria:
• Required fields enforced; skip policy documented if any.
• Profile persisted; session reflects new user state.

Frontend: profile-setup flow, image upload constraints.
Backend: PATCH profile, file upload to storage, validation.

Link to User Management epic for extended profile.`
);

add(
  "Product Backlog",
  "[A4] Login + JWT session",
  "Auth;Security;Frontend;Backend",
  "High",
  "User Story",
  "Authentication",
  "A4",
  "A3: Post-verify profile setup",
  `AS A user
I WANT to log in and receive a secure session (JWT)
SO THAT my requests are authenticated.

Acceptance criteria:
• Login returns JWT; stored per app strategy (httpOnly cookie or secure storage — document choice).
• Logout invalidates client session; server blacklist optional.
• Wrong password / unverified user messages per UX rules.

Frontend: login page, token handling (socketAuth utils), redirect rules.
Backend: login route, JWT sign, middleware for protected routes.

Security: HTTPS in prod; CORS config.`
);

add(
  "Product Backlog",
  "[A5] Inactive / unverified login UX",
  "Auth;UX;Frontend",
  "Medium",
  "User Story",
  "Authentication",
  "A5",
  "A4: Login + JWT session",
  `AS a user in a blocked state
I WANT clear messaging when my account is inactive or unverified
SO THAT I know what to do next.

Acceptance criteria:
• Distinct flows: unverified → resend OTP; inactive → contact/support or message.
• No access to protected routes until resolved.

Frontend: guards, toasts, dedicated messages.
Backend: login response codes / flags for account status.

Align with admin “user status” if applicable.`
);

add(
  "Product Backlog",
  "[A6] Socket tab auth register_tab",
  "Auth;Realtime;Frontend;Backend",
  "High",
  "User Story",
  "Authentication",
  "A6",
  "A5: Inactive / unverified login UX",
  `AS the app
I WANT Socket.IO connections to authenticate with the same identity as REST
SO THAT realtime features are secure.

Acceptance criteria:
• Client sends token on connect; server validates JWT or equivalent.
• Reject unauthenticated connections; reconnect after token refresh documented.

Frontend: socketAuth.ts patterns; connect after login.
Backend: socket middleware; user id on socket for rooms.

Reference: project utils/socketAuth.ts.`
);

add(
  "Product Backlog",
  "[A7] Legacy auth migration",
  "Auth;Backend;Tech-Debt",
  "Medium",
  "Technical Task",
  "Authentication",
  "A7",
  "A6: Socket tab auth register_tab",
  `Migrate any legacy session or token format to the current JWT + socket model.

Acceptance criteria:
• Migration script or one-time conversion documented.
• No duplicate sessions; monitoring for auth errors post-cutover.

Scope depends on brownfield state — adjust story points in planning.`
);

add(
  "Product Backlog",
  "[A8] Forgot password request",
  "Auth;Frontend;Backend",
  "High",
  "User Story",
  "Authentication",
  "A8",
  "A7: Legacy auth migration",
  `AS A user who forgot my password
I WANT to request a reset link or OTP
SO THAT I can regain access safely.

Acceptance criteria:
• Request endpoint does not confirm whether email exists (security option A) OR product accepts enumeration risk (document).
• Reset token/OTP issued with expiry.

Frontend: forgot-password page, success state.
Backend: token generation, email dispatch, rate limiting.

Link: verify-otp-reset flow.`
);

add(
  "Product Backlog",
  "[A9] Reset OTP + new password",
  "Auth;Frontend;Backend",
  "High",
  "User Story",
  "Authentication",
  "A9",
  "A8: Forgot password request",
  `AS A user with a valid reset token
I WANT to set a new password
SO THAT I can log in again.

Acceptance criteria:
• Token validated once; password policy enforced.
• Old sessions invalidated optional but recommended.

Frontend: reset-password UI.
Backend: verify OTP/token, update password hash.

Tests: reuse, expired token, weak password.`
);

add(
  "Product Backlog",
  "[A10] Admin login + admin token",
  "Auth;Admin;Security;Frontend;Backend",
  "High",
  "User Story",
  "Authentication",
  "A10",
  "A9: Reset OTP + new password",
  `AS AN admin
I WANT a separate admin login and scoped token/role
SO THAT admin APIs are not reachable with normal user JWT only.

Acceptance criteria:
• Admin role verified server-side on all admin routes.
• Admin UI gated; token storage isolated or role claim in JWT (document).

Frontend: admin routes under /admin, guard components.
Backend: admin middleware, role checks, audit log optional.

Align with admin module in codebase.`
);

// --- User Management ---
add(
  "Product Backlog",
  "[EPIC] User Management",
  "Epic;Profile;Admin",
  "High",
  "Epic",
  "User Management",
  "EPIC-U",
  "",
  `Reference: 06-Nov-2025 → 27-Nov-2025. Profile, feed, dashboard, events, admin user ops. Stories U1–U10.`
);

const userStories = [
  [
    "U1",
    "Own profile view",
    "",
    `AS A user I WANT to view my profile SO THAT I can see my public info and stats.

AC: Profile page loads for current user; avatar, name, bio; handles private fields.
FE: profile route, loading/error.
BE: GET me/profile or equivalent.`,
  ],
  [
    "U2",
    "Profile edit + photo",
    "U1: Own profile view",
    `AS A user I WANT to edit profile and photo SO THAT my identity stays current.

AC: Update name, bio, photo; validation; optimistic UI optional.
FE: forms, crop/upload UX.
BE: multipart upload, storage URL, DB update.`,
  ],
  [
    "U3",
    "Posts + gallery on profile",
    "U2: Profile edit + photo",
    `AS A user I WANT my posts and media gallery on my profile SO THAT visitors see my content.

AC: Paginated posts; gallery grid; empty states.
FE: profile tabs/sections.
BE: query posts by user_id with pagination.`,
  ],
  [
    "U4",
    "Other user profile",
    "U3: Posts + gallery on profile",
    `AS A user I WANT to open another user's profile SO THAT I can follow social norms (view public info).

AC: Privacy rules respected; block/restrict integration if implemented.
FE: dynamic route profile/[id].
BE: public profile API; hide sensitive fields.`,
  ],
  [
    "U5",
    "Dashboard feed",
    "U4: Other user profile",
    `AS A user I WANT a dashboard feed SO THAT I see relevant posts.

AC: Infinite scroll or pagination; skeleton loading; error retry.
FE: dashboard page, feed component.
BE: feed algorithm endpoint; cursor pagination.`,
  ],
  [
    "U6",
    "Dashboard circles + suggestions",
    "U5: Dashboard feed",
    `AS A user I WANT to see my circles and suggestions SO THAT I can discover communities.

AC: List memberships; suggestion section with CTA to browse.
FE: dashboard module CSS responsive.
BE: circles for user + recommendation stub or rules.`,
  ],
  [
    "U7",
    "Dashboard events + reserve",
    "U6: Dashboard circles + suggestions",
    `AS A user I WANT events on the dashboard and ability to reserve SO THAT I participate.

AC: Events list; reserve action; conflict handling (full event).
FE: events UI, mobile friendly.
BE: events API, reservation transaction.`,
  ],
  [
    "U8",
    "Admin user list / search / filter",
    "U7: Dashboard events + reserve",
    `AS AN admin I WANT to search and filter users SO THAT I can moderate accounts.

AC: Search by email/name; filters status; pagination.
FE: admin users table.
BE: admin query endpoints with indexes.`,
  ],
  [
    "U9",
    "Admin toggle + bulk status",
    "U8: Admin user list / search / filter",
    `AS AN admin I WANT to change user status individually or in bulk SO THAT operations scale.

AC: Single toggle; bulk select with confirmation; audit trail optional.
FE: admin UX, confirmations.
BE: PATCH user status; bulk endpoint with transaction.`,
  ],
  [
    "U10",
    "Admin user stats",
    "U9: Admin toggle + bulk status",
    `AS AN admin I WANT user statistics SO THAT I can report on growth and health.

AC: Counts, charts or KPI cards; date range optional.
FE: admin analytics widgets.
BE: aggregation queries; cache if heavy.`,
  ],
];

for (const [id, title, dep, desc] of userStories) {
  add(
    "Product Backlog",
    `[${id}] ${title}`,
    "User-Management;Frontend;Backend",
    "High",
    "User Story",
    "User Management",
    id,
    dep,
    desc
  );
}

// --- Circle Management ---
add(
  "Product Backlog",
  "[EPIC] Circle Management",
  "Epic;Circles;Moderation",
  "High",
  "Epic",
  "Circle Management",
  "EPIC-C",
  "",
  `Reference: 28-Nov-2025 → 19-Dec-2025. Discover, create, join, private requests, content, events, admin workflows, restrictions. C1–C11.`
);

const circleStories = [
  [
    "C1",
    "Browse / discover circles",
    "",
    `AS A user I WANT to browse and discover circles SO THAT I can join communities.

AC: List/search circles; filters; empty state.
FE: circles page, responsive grid.
BE: list + search endpoints.`,
  ],
  [
    "C2",
    "Create circle",
    "C1: Browse / discover circles",
    `AS A user I WANT to create a circle SO THAT I can host a community.

AC: Name, description, visibility; creator becomes admin.
FE: create form, validation.
BE: POST circle; transaction; permissions.`,
  ],
  [
    "C3",
    "Join public circle",
    "C2: Create circle",
    `AS A user I WANT to join a public circle in one click SO THAT onboarding is fast.

AC: Idempotent join; member count updates; notifications optional.
FE: join button states.
BE: membership row; constraints.`,
  ],
  [
    "C4",
    "Private join request + notify",
    "C3: Join public circle",
    `AS A user I WANT to request to join a private circle SO THAT admins can approve.

AC: Request record; notify admins; duplicate request prevented.
FE: request UI.
BE: requests table; notification emit.`,
  ],
  [
    "C5",
    "Leave circle",
    "C4: Private join request + notify",
    `AS A member I WANT to leave a circle SO THAT I control membership.

AC: Leave removes membership; confirm on active roles if needed.
FE: leave action.
BE: DELETE membership; cleanup.`,
  ],
  [
    "C6",
    "Circle posts + like / comment / report",
    "C5: Leave circle",
    `AS A member I WANT to post, like, comment, and report SO THAT the feed is interactive and safe.

AC: CRUD for posts; like/comment; report creates moderation item.
FE: circle feed, post composer, ReportPostModal.
BE: posts APIs; report endpoint; media handling.`,
  ],
  [
    "C7",
    "Circle events + reserve",
    "C6: Circle posts + like / comment / report",
    `AS A member I WANT circle events and reservations SO THAT I plan participation.

AC: Event CRUD per permissions; reserve/cancel.
FE: events list UI.
BE: events + RSVP model.`,
  ],
  [
    "C8",
    "Approve / deny join requests",
    "C7: Circle events + reserve",
    `AS A circle admin I WANT to approve or deny join requests SO THAT membership is controlled.

AC: Queue UI; approve/deny; notify user.
FE: manage/requests tab.
BE: status transitions; notifications.`,
  ],
  [
    "C9",
    "Members + bans + restrictions + flags",
    "C8: Approve / deny join requests",
    `AS AN admin I WANT to manage members, bans, restrictions, and flagged content SO THAT the community stays healthy.

AC: Member list; ban/restrict; review flagged/reported items.
FE: manage circle tabs (members, flagged, reports); mobile responsive.
BE: moderation endpoints; role checks.`,
  ],
  [
    "C10",
    "Restricted / banned member UX",
    "C9: Members + bans + restrictions + flags",
    `AS A restricted or banned user I WANT clear UX SO THAT I understand limitations.

AC: Blocked actions return clear errors; read-only where policy says.
FE: errorHandler + UI messages.
BE: middleware checks membership status.`,
  ],
  [
    "C11",
    "Circle test cases",
    "C10: Restricted / banned member UX",
    `QA / dev: Document and execute test cases for circle flows (happy paths + edge cases).

AC: Test checklist linked; critical paths automated where feasible.
Labels: QA;Testing.`,
  ],
];

for (const [id, title, dep, desc] of circleStories) {
  add(
    "Product Backlog",
    `[${id}] ${title}`,
    "Circles;Frontend;Backend",
    "High",
    "User Story",
    "Circle Management",
    id,
    dep,
    desc
  );
}

// --- Chat / Communication ---
add(
  "Product Backlog",
  "[EPIC] Chat / Communication",
  "Epic;Chat;Realtime",
  "High",
  "Epic",
  "Chat / Communication",
  "EPIC-M",
  "",
  `Reference: 20-Dec-2025 → 10-Jan-2026. DMs, group chat, media, delete, realtime, presence, WebRTC, group admin, notifications. M1–M11.`
);

const chatStories = [
  [
    "M1",
    "Chat room list + unread",
    "",
    `AS A user I WANT a chat room list with unread counts SO THAT I prioritize conversations.

AC: Rooms load; unread badge; ordering by recent.
FE: chat list UI.
BE: rooms API; last message + unread calc.`,
  ],
  [
    "M2",
    "DM + deep link",
    "M1: Chat room list + unread",
    `AS A user I WANT to start or open a DM with deep links SO THAT sharing and navigation work.

AC: Route opens correct thread; create DM if allowed.
FE: chat routes, deep link handling.
BE: DM room creation rules.`,
  ],
  [
    "M3",
    "Circle group chat",
    "M2: DM + deep link",
    `AS A circle member I WANT a group chat for my circle SO THAT we coordinate.

AC: Group room tied to circle; membership sync.
FE: circle chat entry.
BE: room model; member sync on join/leave.`,
  ],
  [
    "M4",
    "Text / media + reply",
    "M3: Circle group chat",
    `AS A user I WANT to send text, media, and replies SO THAT conversations are rich.

AC: Message types; reply threading or quote per design; upload limits.
FE: composer, previews.
BE: message storage; media URLs.`,
  ],
  [
    "M5",
    "Delete for me / everyone",
    "M4: Text / media + reply",
    `AS A user I WANT delete-for-me and delete-for-everyone where policy allows SO THAT I control my data.

AC: Rules per role; tombstone or remove per spec.
FE: message actions.
BE: soft delete flags; broadcast updates.`,
  ],
  [
    "M6",
    "Realtime + seen",
    "M5: Delete for me / everyone",
    `AS A user I WANT realtime delivery and read receipts where enabled SO THAT chat feels live.

AC: Socket events for message + read; fallback polling optional.
FE: socket subscriptions per room.
BE: emit pipeline; presence of message seen.`,
  ],
  [
    "M7",
    "Presence",
    "M6: Realtime + seen",
    `AS A user I WANT online/away presence SO THAT others know availability.

AC: Heartbeat; privacy setting if required.
FE: presence indicators.
BE: presence store; TTL.`,
  ],
  [
    "M8",
    "WebRTC calls + call logs",
    "M7: Presence",
    `AS A user I WANT voice/video calls with logs SO THAT I can communicate in real time.

AC: Signaling; STUN/TURN config; call history list.
FE: WebRTC UI, permissions.
BE: signaling server; call log persistence.`,
  ],
  [
    "M9",
    "Group admin (members / avatar / leave)",
    "M8: WebRTC calls + call logs",
    `AS A group admin I WANT to manage members and group avatar SO THAT the room is moderated.

AC: Add/remove; transfer admin; avatar update.
FE: group settings.
BE: role checks; updates.`,
  ],
  [
    "M10",
    "Notifications",
    "M9: Group admin (members / avatar / leave)",
    `AS A user I WANT in-app (and push if scope) notifications SO THAT I do not miss events.

AC: Notification list; mark read; link to entity.
FE: notifications page + bell; mobile nav to full page.
BE: notification model; socket/email optional.`,
  ],
  [
    "M11",
    "Chat test cases",
    "M10: Notifications",
    `QA: End-to-end and load tests for chat critical paths.

AC: Test plan linked; regression suite for realtime.`,
  ],
];

for (const [id, title, dep, desc] of chatStories) {
  add(
    "Product Backlog",
    `[${id}] ${title}`,
    "Chat;Frontend;Backend;Realtime",
    "High",
    "User Story",
    "Chat / Communication",
    id,
    dep,
    desc
  );
}

// --- Documentation & Deployment ---
add(
  "Product Backlog",
  "[EPIC] Documentation & Deployment",
  "Epic;DevOps;Docs",
  "High",
  "Epic",
  "Documentation & Deployment",
  "EPIC-D",
  "",
  `Reference: 11-Jan-2026 → 20-Jan-2026. Docs and production deployment. D1–D2.`
);

add(
  "Product Backlog",
  "[D1] Project documentation",
  "Docs;README;API",
  "High",
  "User Story",
  "Documentation & Deployment",
  "D1",
  "",
  `AS A developer or stakeholder
I WANT up-to-date documentation
SO THAT we can operate and onboard quickly.

Acceptance criteria:
• README: setup, env vars, scripts, architecture pointer.
• API overview or OpenAPI stub for main resources.
• Runbooks: deploy, rollback, common incidents.

Frontend: Storybook optional.
Backend: ER diagram or schema summary.`
);

add(
  "Product Backlog",
  "[D2] Deployment / release",
  "DevOps;CI;CD",
  "High",
  "User Story",
  "Documentation & Deployment",
  "D2",
  "D1: Project documentation",
  `AS A team
I WANT automated deployment and a release process
SO THAT shipping is repeatable.

Acceptance criteria:
• CI runs tests/lint on PR; main branch deploys to staging/prod per policy.
• Secrets in vault or host env; .env.example complete.
• Health checks and monitoring hooks.

Deliverables: pipeline config; release checklist card in Trello.`
);

// Cross-cutting (recommended)
add(
  "Product Backlog",
  "[X1] Error handling & user-facing messages",
  "UX;Frontend;Backend",
  "High",
  "Technical Task",
  "Cross-Cutting",
  "X1",
  "",
  `Standardize API errors and client handling (sanitizeErrorMessage, toast patterns). Align backend error shape with frontend errorHandler.

AC: Documented error codes; no stack traces to client in prod.`
);

add(
  "Product Backlog",
  "[X2] Security review (OWASP baseline)",
  "Security",
  "Medium",
  "Spike",
  "Cross-Cutting",
  "X2",
  "",
  `Time-boxed review: XSS, CSRF, authZ on IDs, rate limits, file upload validation, dependency audit.

Outcome: backlog of findings with severity.`
);

add(
  "Product Backlog",
  "[X3] Observability (logs + metrics)",
  "DevOps;Backend",
  "Medium",
  "Technical Task",
  "Cross-Cutting",
  "X3",
  "",
  `Structured logging, request IDs, key metrics (latency, errors) for API and socket.

AC: Dashboard or log query works for incident triage.`
);

const lines = [header.map(esc).join(",")];
for (const row of rows) {
  lines.push(row.map(esc).join(","));
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, "\uFEFF" + lines.join("\r\n"), "utf8");
console.log("Wrote", outPath, "rows:", rows.length);
