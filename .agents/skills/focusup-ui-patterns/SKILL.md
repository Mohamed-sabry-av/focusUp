---
name: focusup-ui-patterns
description: "FocusUp UI/UX patterns inspired by Focusmate & CoFocus — session room layout, dashboard design, booking calendar, onboarding, and component library. Use when building pages, designing layouts, or implementing user-facing features."
---

# FocusUp UI/UX Patterns

## Design Inspiration
Inspired by the best UX from **Focusmate**, **CoFocus**, and **Flow Club**:
- Focusmate's frictionless booking (< 60s to session)
- CoFocus's structured 50-min format with goal declaration
- Flow Club's community warmth and celebration moments

## Design System Foundation

### Color Palette
```css
/* Dark mode primary (default) */
--background: hsl(222, 47%, 7%);       /* Deep navy */
--foreground: hsl(210, 40%, 96%);
--primary: hsl(245, 82%, 67%);          /* Indigo-violet */
--primary-foreground: hsl(0, 0%, 100%);
--accent: hsl(172, 66%, 50%);           /* Teal accent */
--muted: hsl(223, 30%, 15%);
--destructive: hsl(0, 84%, 60%);
--success: hsl(142, 76%, 46%);
--warning: hsl(38, 92%, 50%);

/* Session-specific */
--session-active: hsl(142, 76%, 46%);   /* Green pulse for live sessions */
--session-pending: hsl(38, 92%, 50%);   /* Amber for waiting */
--timer-warning: hsl(0, 84%, 60%);      /* Red for final 5 min */
```

### Typography
```css
/* Primary: Inter (clean, modern) */
/* Mono: JetBrains Mono (timer, stats) */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');
```

## Page Layouts

### Dashboard (`/dashboard`)
```
┌─ Header ─────────────────────────────────────────────┐
│  Logo   [Dashboard] [Schedule] [Profile]   [Avatar ▾]│
├──────────────────────────────────────────────────────┤
│                                                       │
│  ┌─ Quick Actions ────────────────────────────────┐  │
│  │  [🎯 Focus Now]    [📅 Schedule Session]       │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌─ Upcoming Sessions ───────────┐ ┌─ Weekly Stats ┐│
│  │  ┌─ Session Card ──────────┐  │ │ 🔥 Streak: 5  ││
│  │  │ Partner: @jane          │  │ │ ⏱ Hours: 4.2  ││
│  │  │ 📅 Tomorrow 2:00 PM    │  │ │ ✅ Done: 3/3   ││
│  │  │ ⏱ 50 min · Coding      │  │ │               ││
│  │  │ [Join Session]          │  │ │ Free: 1/3 left││
│  │  └────────────────────────┘  │ └───────────────┘│
│  │  ┌─ Session Card ──────────┐  │                   │
│  │  │ Waiting for partner...  │  │                   │
│  │  │ 📅 Friday 10:00 AM     │  │                   │
│  │  │ ⏱ 25 min · Writing     │  │                   │
│  │  └────────────────────────┘  │                   │
│  └───────────────────────────────┘                   │
│                                                       │
│  ┌─ Session History ─────────────────────────────┐   │
│  │  ✅ Apr 9 · 50 min · @alex · "Great session!" │   │
│  │  ✅ Apr 8 · 25 min · @sam  · "Finished draft"  │   │
│  │  ❌ Apr 7 · NO_SHOW                            │   │
│  └───────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

### Session Room (`/session/[id]`)
```
┌──────────────────────────────────────────────────────┐
│                                                       │
│            ┌─ Partner Video (Main) ──────┐           │
│            │                             │           │
│            │      👤 Partner Name        │           │
│            │      Working on: "Writing"  │           │
│            │                             │           │
│            │                             │           │
│            └─────────────────────────────┘           │
│                                                       │
│  ┌─ Self (PiP) ─┐                                   │
│  │  You          │     ┌─ Timer ──────────────┐     │
│  │  🎯 "Coding"  │     │   ⏱ 42:15 remaining  │     │
│  └───────────────┘     └──────────────────────┘     │
│                                                       │
│  ┌─ Controls ────────────────────────────────────┐   │
│  │  [🎤 Mute] [📹 Camera] [🖥 Share] [⚠ Report] [🚪 Leave] │
│  └───────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

### Booking Calendar (`/schedule`)
```
┌─ Duration Selector ──────────────────────────────────┐
│  [25 min]  [50 min ●]  [75 min]                      │
├──────────────────────────────────────────────────────┤
│                                                       │
│  ┌─ Cal.com Embed ───────────────────────────────┐   │
│  │  April 2026                    ◀ today ▶      │   │
│  │  ┌───┬───┬───┬───┬───┬───┬───┐               │   │
│  │  │Mon│Tue│Wed│Thu│Fri│Sat│Sun│               │   │
│  │  │ 7 │ 8 │ 9 │10●│11 │12 │13 │               │   │
│  │  └───┴───┴───┴───┴───┴───┴───┘               │   │
│  │                                                │   │
│  │  Available slots for Apr 10:                   │   │
│  │  [ 9:00 AM ] [ 9:15 AM ] [ 9:30 AM ]         │   │
│  │  [10:00 AM ] [10:15 AM●] [10:30 AM ]         │   │
│  └───────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

## Key Component Patterns

### Session Card (Reusable)
States: `upcoming` | `active` (pulsing green border) | `completed` | `no-show` | `waiting`
```tsx
<SessionCard
  session={session}
  partner={partner}
  onJoin={() => router.push(`/session/${session.id}`)}
  showReflection={session.status === "COMPLETED"}
/>
```

### Goal Setting Modal (Session Start)
- Appears on entering session room
- Text input: "What will you work on this session?"
- 15-second auto-dismiss timer
- Save to `session.user1Goal` / `session.user2Goal`

### Reflection Modal (Session End)
- Text area: "How did your session go?"
- Optional 1–5 star self-rating
- "Skip" and "Save" buttons
- Creates Reflection record

### Focus Now Button (Instant Match)
```tsx
<Button
  variant="gradient"
  className="bg-gradient-to-r from-primary to-accent"
  onClick={handleFocusNow}
>
  <Zap className="mr-2 h-4 w-4" />
  Focus Now
</Button>
```

### Session Timer
```tsx
// Monospace font, large display
// Green → amber at 10 min → red at 5 min (with toast)
<div className="font-mono text-4xl font-bold tabular-nums">
  {formatTime(remaining)}
</div>
```

### Free Tier Indicator
```tsx
<div className="flex items-center gap-2 text-sm text-muted-foreground">
  <div className="flex gap-1">
    {[1, 2, 3].map(i => (
      <div key={i} className={cn(
        "h-2 w-2 rounded-full",
        i <= used ? "bg-primary" : "bg-muted"
      )} />
    ))}
  </div>
  <span>{used}/3 sessions this week</span>
</div>
```

## Micro-Interactions & Animations
- **Session card hover:** Subtle scale(1.02) + shadow elevation
- **Join button:** Pulse animation when session time arrives
- **Timer warning:** Color transition green → amber → red
- **Match found:** Confetti burst + celebration toast
- **Streak badge:** Flame icon with glow animation on increment
- **Loading states:** Skeleton screens, never blank pages

## Accessibility Requirements
- All interactive elements: unique IDs for testing
- Color contrast: WCAG AA minimum
- Keyboard navigation: full support
- Screen reader: ARIA labels on all controls
- Focus indicators: visible, high contrast ring
- Reduced motion: respect `prefers-reduced-motion`

## Mobile Responsiveness
- Dashboard: Single column stack below 768px
- Session room: Partner video full-width, self-video overlay
- Controls: Bottom fixed bar on mobile
- Calendar: Vertical slot list on mobile (not grid)
- Touch targets: minimum 44×44px
