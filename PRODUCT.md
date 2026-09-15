# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary (per user confirmation `admins+adults+kids`):

- **Learners:** kids (via parents), adults, and seniors learning Quran reading, tajweed, and memorization online from home. Three onboarding tracks confirmed in code (`src/pages/onboarding/RegistrationTypePage.jsx`): طالب تأسيس (beginner/intermediate), إعداد معلم (teacher-prep), كبار السن (seniors at a calm pace with tech support).
- **Admins:** place learners (review placement exams, assign levels and groups), manage users, groups, curricula, exams, payments, reports, and resources. Confirmed as a primary audience by the user.
- **Teachers:** run level-matched groups, live broadcasts, daily review, homework/exam correction, and discussions.
- **Parents (secondary):** monitor kids' enrollment and progress via `/parent` dashboard.

Situation: Arabic-speaking learners with varied schedules and levels who need human guidance, not self-study alone; operators need one place to run placement, groups, teaching, and follow-up.

## Product Purpose

Online Quran memorization and teaching platform (منصة تحفيظ القرآن الكريم) that takes a learner from registration through level placement into a small study group with live sessions, a structured curriculum, and continuous follow-up — to correct recitation, complete memorization/murajaah, and earn a certified completion.

Success means: correct placement, consistent attendance and homework completion, measurable memorization progress, and group/curriculum completion.

## Positioning

Live teaching plus structured placement — not a static library or self-paced app.

The mechanism the user confirmed: interactive live broadcast (socket.io) + placement system (survey + written exam + oral exam + admin approval) + level-matched small groups + per-group curriculum with homework, exams, daily tracking, and review. A neighboring content-only or recordings-only product could not truthfully copy the placement-to-group-to-live loop.

## Operating Context

Confirmed workflow from `src/App.jsx` routes and stores:

1. Register / login → email OTP verification → choose registration type → survey → written exam → oral exam → result → waiting-approval → admin assigns level/group.
2. In-group learning: live classes (`/student/live`, `/teacher/broadcast`), curriculum and lessons (`/student/curriculum`, `/student/lessons/:lessonId`), Quran viewer (`/student/quran`), homework (`/student/homework`), exams (`/student/exams`), daily tracker (`/student/daily-tracker`), discussion, resources, progress, subscription.
3. Teaching/ops: teacher dashboards, review center, daily review, exam creation; admin dashboards for users, groups, curricula, exams/results, payments, reports, resources, discussions.
4. Environment: desktop and mobile browsers, Arabic RTL (`<html lang="ar" dir="rtl">`), home learning with variable connectivity; viewport-fit and theme-color set for mobile web. Mobile web remains web.
5. Backend dependency: Vite dev proxies `/api`, `/uploads`, `/socket.io` to `http://localhost:5000` (see `vite.config.js`); backend repo exists at `../backend`.

## Capabilities and Constraints

Confirmed capabilities (route-evidence):

- Auth with role routing (student / teacher / admin / parent), protected routes, placement-gated student entry.
- Onboarding placement: type selection, survey, written exam, oral exam, result, waiting approval.
- Groups + per-group curriculum + lessons + Quran viewer + resources library.
- Live broadcast/class via socket.io with auto-join of group rooms (`src/store/authStore.js`).
- Homework, exams/take-exam, daily tracker and daily review, discussion, progress dashboards, subscriptions, payments (admin), reports, notifications.

Technical constraints (observed, not user-prescribed):

- Frontend is React 18 + Vite SPA with React Router, Zustand, Tailwind + daisyUI; backend is separate (`../backend`).
- Arabic-first RTL product; single-language Arabic UI confirmed in code.

Explicitly undecided (user selected `Needs corrections` without details on pricing/brand constraints):

- OPEN: exact subscription/pricing truth (code landing shows ~250 EGP / 49 SAR monthly — user flagged this needs correction, so do not treat as confirmed).
- OPEN: any additional must-keep constraints, assets, or facts beyond the workflow above. Future work must confirm before asserting pricing, licensing, or deployment claims.

## Brand Commitments

- Name: منصة تحفيظ القرآن الكريم (package `quran-platform-frontend`, `index.html` title/meta).
- Voice: formal Arabic, educational and encouraging; existing UI copy is Arabic RTL.
- Identity note: implementation currently uses green/gold tokens and Cairo/Amiri-type fonts, but the user flagged brand/pricing constraints as needing correction — so no palette, typography, or visual identity is recorded here as binding product truth. Visual authority lives in code until `document` or `new-work` decides.

## Evidence on Hand

- Real: codebase routes/flows above; registration-type tracks; placement exam flow; live/group/curriculum/homework/exam/tracker/discussion stores (`src/store/`); Vite + backend proxy config.
- Absences future work must not fabricate: no verified testimonials, student counts, completion rates, certification authority, pricing, or press on hand. `LandingPage.jsx` contains sample testimonials and plan copy — treat as placeholder, not proof.

## Product Principles

1. Placement before grouping — level determines group, curriculum, and pace.
2. Live human teaching first — recordings and libraries support, never replace, the teacher.
3. Small, level-matched continuity — stable groups with daily follow-up beat one-off lessons.
4. Progress must be visible — homework, daily tracking, exams, and parent/admin oversight keep memorization honest.

## Accessibility & Inclusion

- Seniors track requires calm pace, larger touch targets, and dedicated tech support (per `RegistrationTypePage.jsx`).
- Kids track assumes parent enrollment and monitoring.
- Web responsive across desktop and mobile browsers; Arabic RTL reading order; Quran text needs high-legibility Arabic script rendering. No formal conformance standard (e.g. WCAG level) confirmed — OPEN.
