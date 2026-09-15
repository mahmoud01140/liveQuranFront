---
name: Al-Halaqa
description: A warm Arabic study circle — real teacher, real peers, one personal journey.
colors:
  paper: "#FBF7EE"
  surface: "#FFFFFF"
  ink: "#2A2438"
  muted: "#756E85"
  line: "#E8E2D4"
  mentor: "#177B58"
  mentor-deep: "#0F5940"
  mentor-wash: "#E2EFE7"
  guide: "#4A3F6B"
  guide-wash: "#ECE9F4"
  gold: "#D9A441"
  gold-wash: "#F8EDD3"
  stage: "#0C0C1D"
  warning: "#B45309"
  error: "#C2410C"
  info: "#3B5BFD"
typography:
  display:
    fontFamily: "Tajawal, sans-serif"
    fontSize: "2rem"
    fontWeight: 800
    lineHeight: 1.4
  headline:
    fontFamily: "Tajawal, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.5
  title:
    fontFamily: "Tajawal, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.6
  body:
    fontFamily: "Tajawal, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.8
  label:
    fontFamily: "Tajawal, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.6
  quran:
    fontFamily: "Amiri, serif"
    fontSize: "1.375rem"
    fontWeight: 400
    lineHeight: 2.4
rounded:
  sm: "8px"
  md: "12px"
  lg: "18px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  comp: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  hero: "48px"
components:
  button-primary:
    backgroundColor: "{colors.mentor}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.mentor-deep}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.mentor}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  input-base:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  badge-mentor:
    backgroundColor: "{colors.mentor-wash}"
    textColor: "{colors.mentor}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  badge-gold:
    backgroundColor: "{colors.gold-wash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
---

# Design System — Al-Halaqa (الحلقة)

## 1. Design Philosophy

**Human warmth + disciplined structure + visible progress.**

Al-Halaqa is a modern Arabic learning platform where the student feels inside a
real study circle — a teacher, peers, and one clear personal journey — never a
pile of pages and cards. Warmth comes from people and progress, never from
decoration. Structure comes from a strict grid, lists, and honest data. The
three never compete: warmth leads the feeling, discipline leads the layout,
progress leads the eye.

When ornament, beauty, clarity, and usability conflict, the order is always:
**user clarity → function → identity → decoration.**

## 2. Brand Personality

Warm, human, encouraging, calm, professional, Arabic, modern, trustworthy.
Never childish, never cold-technical, never a "religious app" look, never a
generic SaaS dashboard, never an Udemy/Coursera clone, never Neo-brutalism.

## 3. Design Principles

1. **People before chrome.** Faces, names, and encouragement lead; containers recede.
2. **One living element per screen.** Motion means "something is happening now,"
   never "the design wants to show off."
3. **List or timeline before card.** Repetition lives in lists; cards are for
   exceptions that need grouping, emphasis, a primary action, or exceptional content.
4. **Color is status, not decoration.** Every color answers "what state is this?"
5. **Progress is always visible.** Every screen answers "where am I, what's next?"
6. **RTL is structural.** Designed right-to-left from the first sketch, never a
   mirrored English layout.
7. **Mobile is the classroom.** The phone used during a live class is a
   first-class surface, not a shrunken desktop.

## 4. Color System

Foundation — the warm paper world:
- **Warm Paper** (#FBF7EE): page canvas. Warm and calm, never stark white.
- **Surface** (#FFFFFF): raised surfaces over paper.
- **Ink** (#2A2438): primary text. Contrast on paper ≈ 13:1.
- **Muted** (#756E85): secondary text. Contrast on paper ≈ 5:1.
- **Line** (#E8E2D4): hairline borders and dividers.

Identity — functional, never decorative:
- **Mentor Emerald** (#177B58): primary. Actions, active states, focus rings,
  progress, the current speaker. The leading voice — the site is NOT all green.
- **Mentor Deep** (#0F5940): primary hover/pressed only.
- **Mentor Wash** (#E2EFE7): selected and active fills, mentor badges.
- **Guide Violet** (#4A3F6B): teacher role, operational and evaluation surfaces.
  Never a generic second CTA color.
- **Guide Wash** (#ECE9F4): teacher badge and track backgrounds.

Achievement — rare by law:
- **Achievement Gold** (#D9A441): ONLY juz completion, real milestones,
  curriculum completion, ijazah certificates. Never a normal button, never a
  general background, never every card's border, never decoration.
- **Gold Wash** (#F8EDD3): achievement badge backgrounds.

Live space:
- **Stage** (#0C0C1D): inside the broadcast stage ONLY.
  Rule: darkness = the stage; warm paper = the world around it.
  Dark UI must never cover the whole product.

Status — calm saturation:
- Success #177B58 (same as mentor) · Warning #B45309 · Error #C2410C ·
  Info #3B5BFD.

### Named Rules
**The Gold Rarity Rule.** Gold appears only at a real achievement moment. If a
screen shows gold without a completed milestone behind it, that is a defect.
**The Wash-Before-Line Rule.** Prefer a tinted wash over a stronger border when
separating role surfaces at rest.
**The Stage Darkness Rule.** The only dark surface in the product is the live
stage. Any other dark panel is a defect.

## 5. Typography

UI: **Tajawal**, disciplined weights. Sacred text: **Amiri**, never for UI
(see Sacred Text Principle).

- **H1** (800, 32px, 1.4): one per screen, the screen's promise.
- **H2** (800, 24px, 1.5): section heads.
- **H3** (700, 20px, 1.6): card and block titles.
- **H4** (700, 18px, 1.6): list-group heads, drawer titles.
- **Body** (400–500, 15–17px, 1.8): default reading; Arabic-first measure.
- **Label** (600, 13px, 1.6): badges, captions, meta, table headers.
- **Quran** (Amiri 400, 22px, 2.4): verses only, in ink, with breathing room.
- Tabular numerals for tables, attendance counts, and timers.

### Named Rules
**The Quran-Type Rule.** Quranic text is always Amiri with generous
line-height, never inside small buttons, never reduced to metadata styling.
UI Tajawal must never render verses.
**The Weight-Carries-Hierarchy Rule.** Hierarchy comes from Tajawal weight
(400→800) and spacing rhythm, never from extra font families.

## 6. Spacing

Fixed scale: `4 / 8 / 12 / 16 / 24 / 32 / 48`. Nothing off-scale.
- 12px small components · 16px groups · 24px sections ·
  32px zone breaks · 48px hero-level air.
- Generous whitespace is a feature: never fill a screen edge to edge.

## 7. Layout

True RTL: navigation docks right; reading, progress, and timelines flow
right-to-left; motion originates from the right. Container near `7xl` with a
clear grid; right rail on desktop only when needed; single column on mobile.
Learner screens keep one primary column with generous gaps. Operator screens
may be denser but share tokens, radii, and focus treatment. Charts render LTR
inside the RTL shell as isolated islands; toasts, inputs, and textareas stay
RTL right-aligned.

## 8. Shape & Elevation

Neither sharp nor childishly round. Components `12px`; cards and major
surfaces `18px`. Full round only with real meaning: avatars, live dots,
status pills — never every button, never every card.

Elevation is paper + surface + hairline + calm layering — never floating
objects, never neon glow, never glass blur. Surfaces sit at rest; interaction
lifts slightly (≤200ms) and settles. Focus follows the same softness: a
visible 2px mentor ring with offset on every interactive element.

## 9. Iconography

Lucide only. Default 18–20px, ~2px stroke, one icon per meaning across the
whole product. No emoji as UI icons. No stock photos of people; real avatars
when available, initials otherwise.

## 10. Motion

150–300ms, purposeful only: progress, achievement, live presence, state change.
The living element per screen: `KhatmRing` on the journey, `SpeakerStage` or
the live pulse in class — the rest of the interface stays still.
Reduced motion: stop celebration and pulsing; show the number and state
directly as static truth.

## 11. Accessibility

Keyboard-navigable in RTL order, visible focus always, contrast ≥4.5:1
(body text target ≥7:1), ≥48px touch targets (strict for live controls),
semantic heading hierarchy, RTL direction, status never by color alone —
always icon + label + text. Every audio or color signal has a text equivalent.

## 12. RTL Rules

- Navigation and hierarchy start on the right, always.
- Arrows mirror semantically: forward points left in RTL.
- Inputs, textareas, and selects are right-aligned.
- LTR islands (charts, sliders, timers) are isolated and labeled.
- Arabic tested first at 15–17px with 1.8 line-height; no clipped diacritics.
- Motion enters from the right; drawers slide from the right; the sidebar
  docks right; mobile bottom navigation respects safe-area insets.

## 13. Components

Shared anatomy for all eight: purpose · anatomy · hierarchy · states
(default / hover / focus / active / disabled / loading / empty / error /
locked / success) · spacing · typography · interaction · responsive behavior ·
accessibility.

### JourneyNode
A real stage of the student's journey. The nine nodes in fixed order:
registration → placement → level → group → curriculum → live → homework/exams
→ khatm → ijazah. (The header is the journey's introduction, not a node.)
Anatomy: state marker on the right (RTL thread), title + proof line, one
contextual action. States: completed (clear ✓) · current (restrained pulse —
instantly obvious as the present stage) · upcoming (dimmed but readable) ·
locked ("available after …", never "forbidden"). Skills (recitation /
memorization / attention) live embedded inside the curriculum node; the
teacher's latest evaluation lives embedded inside the group/live node — never
as standalone sections. Spacing 16px groups, 24px between nodes; Tajawal
H4 + body. Full keyboard operability; state announced by label, not color.

### KhatmRing
The living element of the journey screen — exactly one ring per page. Large,
calm, meaningful, bound to a real percentage; shows percent + completed juz /
30. Loading shows a ring skeleton, never a full-screen spinner. Static number
under reduced motion.

### JuzMap
The 30 ajza as status, embedded ONLY inside the khatm node, collapsible —
never a large standalone section below the journey. Color is status (done /
current / untouched) with labels; the student's position readable at a glance.
Keyboard navigable; collapsible region properly disclosed.

### CircleStrip
The real community: real avatars when available, initials otherwise — never
stock faces. Must read as "I belong to a group," never decoration. Horizontal
scroll on mobile with hidden scrollbars; names available to assistive tech.

### SpeakerStage
The heart of the live room. Within 3 seconds: who speaks, what they do, my
turn after them. Current speaker centered in mentor active state + name +
"يُسمّع الآن"; the teacher carries the violet functional badge. Participants
are NOT visually equal. Lives on the dark stage; all surrounding chrome stays
warm paper. Mobile: full screen width. Desktop: the undisputed focus; side
content is visually lighter and never competes.

### QueueList
One ordered recitation queue, never cards: position · name · status · one
relevant action per row. Raised hands float first. The single source of turn
order; row actions ≥48px targets on touch. Screen-reader announced positions.

### WirdCard
Personal and actionable: clear, collapsible, completable (portion toggles). A
personal card beside the stage on desktop, inside the bottom drawer on mobile —
never a floating window over video. Collapsed state always shows today's
completion at a glance.

### PresenceBar
Compact presence strip (present / late / absent) that opens the attendance
drawer on demand. Never consumes stage space; counts mirror the drawer
exactly. Status shown with icon + label, never color alone.

Live controls (companion): fixed bottom bar — raise hand, leave, mute,
connection, role-based evaluate/status. Every target ≥48px, strict on mobile.

## 14. Responsive Rules

Mobile-first. Journey: single column, sequential nodes, ring on top. Live
mobile: full-width `SpeakerStage` → draggable bottom drawer containing
`QueueList`, `WirdCard`, `PresenceBar` → fixed bottom action bar. Live
desktop: main stage with queue/wird/presence beside it, eye-focus locked on
the speaker, teacher evaluation inside the same workspace beside the speaker.
Admin tables become lists on small screens; filters collapse; drawers go full
width; safe-area insets honored everywhere.

## 15. State System

Every key component owns all ten states: default, hover, focus, active,
disabled, loading, empty, error, locked, success. Loading: skeleton for known
structure; full spinner only when structure is unknown. Error: clear and
retryable, always. Empty: never a blank page — always the next actionable
step the user can take. Locked: "available after X." Success: immediate,
restrained confirmation. Feedback for save/submit actions is explicit —
never silent.

## 16. Student Experience

Personal, journey-shaped, encouraging. Registration → placement → level →
group → course → live → progress → completion reads as ONE connected journey
on the journey screen; every other surface links back to it. Encouragement is
data-bound (real progress, real teacher notes) — never invented praise,
never invented stories or counts.

## 17. Teacher Experience

Same visual language, operational hierarchy: queue, attendance, evaluation,
wird assignment. The broadcast room carries inline evaluation beside the
speaker so review never forces leaving the stage. Violet marks the teacher's
operational voice throughout student, teacher, and admin surfaces alike —
one language, different hierarchy.

## 18. Dashboard Philosophy

Dashboard = today: what is required today, the next action, a small journey
summary, then one clear link onward — "continue my journey" →
`/student/progress`. Detail lives on the journey screen, never duplicated in
the dashboard. No numeric block caps; the rule is composition, not counting.

## 19. Do / Don't

### Do:
- **Do** give every screen real whitespace; let people and progress breathe.
- **Do** keep community visible: faces, names, encouragement.
- **Do** keep progress visible: where am I, what is next.
- **Do** use lists and timelines for repeated content; cards only for grouping,
  emphasis, a primary action, or exceptional content.
- **Do** use color as meaning: mentor acts, violet operates, gold celebrates.
- **Do** make the current state unmistakable within seconds.
- **Do** set sacred text in Amiri with air and generous line-height.

### Don't:
- **Don't** nest card inside card inside card.
- **Don't** use a gradient per section — gradients are not part of this identity.
- **Don't** animate everything; one living element per screen.
- **Don't** use gold as a primary color or general decoration.
- **Don't** turn everything into a pill; round means something.
- **Don't** use emoji as icons or fake photos of people.
- **Don't** let dark UI cover the product — darkness is the stage only.
- **Don't** invent certificates, prices, stories, results, or counts;
  placeholders only where structurally necessary, and labeled as placeholders.

## 20. Screen Composition Rules

Journey: header (greeting + `KhatmRing`) → nine nodes in fixed order →
khatm node containing the collapsible `JuzMap` → ijazah; skills inside the
curriculum node, teacher note inside the group/live node. Live mobile: stage →
drawer (queue, wird, presence) → fixed action bar. Live desktop: stage center,
lighter side rail, teacher evaluation beside the speaker. Dashboards:
today-first, then the journey link. One living element per composition.

## 21. Future Extension Rules

New screens (parent today, admin tomorrow) inherit these tokens, the ten
states, the RTL structure, and the Do/Don't list — they may reorder hierarchy
but never invent a new visual language. A second living element on one screen
requires explicit design approval. Any gold usage beyond achievement requires
a real milestone. No new product rules may ride along with visual work;
identity, palette, type, and components change only through a design decision
like this one.
