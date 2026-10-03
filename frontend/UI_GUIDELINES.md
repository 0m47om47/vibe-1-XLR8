# UI_GUIDELINES.md — Lawazia Toto Desk

## Design Philosophy

The UI must look like a real premium SaaS product.

**Design inspiration:** Linear, Stripe, Uber for Business, Apple, Notion

**The product must feel:** Premium, Minimal, Sophisticated, Professional, Clean, Spacious, Operational, Modern

**It must NOT look like:** A college project, generic CRUD app, Bootstrap dashboard, basic admin panel, or overly colorful template.

---

## Color System

| Token          | Value     | Usage                                          |
|----------------|-----------|------------------------------------------------|
| Background     | `#F7F8FA` | Page background                                |
| Primary Text   | `#111827` | Headings, body text                            |
| Secondary Text | `#6B7280` | Subtitles, descriptions, timestamps            |
| Borders        | `#E5E7EB` | Card borders, dividers, input borders          |
| Card           | `#FFFFFF` | Card backgrounds                               |
| Primary Accent | `#2563EB` | Primary buttons, active nav, info states       |
| Success        | `#16A34A` | Accepted, Boarded, Completed                   |
| Warning        | `#F59E0B` | Pending, Clashed                               |
| Danger         | `#DC2626` | Missed, destructive actions                    |

### Color Usage Rules
- Do NOT make the entire interface blue
- Blue = primary actions, active navigation, information, in-progress states
- Green = accepted, boarded, completed
- Amber = pending, clash
- Red = missed, destructive actions

---

## Typography

Font: Inter (or system equivalent)

| Element         | Size     | Weight    |
|-----------------|----------|-----------|
| Page title      | 32px     | 600–700   |
| Section title   | 20–24px  | 600       |
| Card title      | 16–18px  | 600       |
| Body            | 14–15px  | 400       |
| Secondary       | 13px     | 400       |
| Large stats     | 28–36px  | 600–700   |

Use generous line height. Typography creates the visual hierarchy.

---

## Spacing System

Use consistent spacing values from this scale:

```
4  8  12  16  20  24  32  40  48
```

Do NOT randomly use arbitrary spacing values.

---

## Cards

- Background: white (`#FFFFFF`)
- Border: `1px solid #E5E7EB`
- Border radius: `12–18px`
- Shadow: very subtle (`0 1px 3px rgba(0,0,0,0.04)`)
- Avoid putting everything inside cards — whitespace matters

---

## Buttons

### Primary
- Background: `#2563EB` (or dark)
- Text: white
- Border radius: `10–12px`

### Secondary
- Background: white
- Border: `1px solid #E5E7EB`
- Text: primary text color

### Danger
- Background: `#DC2626`
- Text: white

### States (ALL buttons)
- Hover state
- Active/pressed state
- Disabled state (reduced opacity)
- Loading state (where relevant)

Do NOT make every button pill-shaped.

---

## Status Badges

| Status      | Color   | Icon  |
|-------------|---------|-------|
| REQUESTED   | Blue    | —     |
| ACCEPTED    | Green   | ✓     |
| CLASHED     | Amber   | ⚠     |
| IN_PROGRESS | Blue    | →     |
| COMPLETED   | Green   | ✓     |
| PENDING     | Gray    | ○     |
| BOARDED     | Green   | ✓     |
| MISSED      | Red     | ✕     |

---

## Sidebar

- Width: 260px
- Premium desktop sidebar style
- Logo: 🚕 LAWAZIA TOTO DESK
- Navigation sections with dividers
- Selected state: subtle blue/gray bg, blue icon, dark text
- Bottom: user avatar, name, role, online indicator, settings, logout

---

## Top Header

- Page title (left)
- Optional breadcrumb
- Right: Demo Mode switcher, notification icon, user avatar
- Keep it clean — do not overcrowd

---

## Animations

| Element    | Animation                          |
|------------|-------------------------------------|
| Pages      | Fade + slight vertical movement     |
| Buttons    | Small hover/press transition        |
| Status     | Smooth color/text transition        |
| Modals     | Fade + scale                        |
| Success    | Small check animation               |
| Toasts     | Slide in + fade                     |

Do NOT over-animate. Animations should feel like Linear/Stripe.

---

## Toast Notifications

Position: bottom-right (desktop)

Types:
- Success: ✓ green
- Warning: ⚠ amber
- Error: ✕ red
- Info: ℹ blue

Auto-dismiss after ~4 seconds.

---

## Empty States

Polished, centered empty states with:
- Subtle icon
- Headline
- Description
- Optional action button

---

## Responsive Design (Mobile-First Architecture)

The application is engineered with an intentional, mobile-first responsive architecture supporting phones (< 640px), tablets (640px–1023px), laptops (1024px–1279px), and desktop displays (≥ 1280px).

### 1. Navigation Adaptations
- **Mobile (< 1024px)**: 
  - Fixed 56px Top Bar with compact Lawazia Toto Desk branding, active role badge, and role switcher quick access.
  - Fixed Bottom Navigation Bar (`h-16`) with high-contrast icon + label items, active indicator badges, and a "More" drawer with role switcher, profile details, and logout.
- **Desktop (≥ 1024px)**:
  - Fixed 260px left sidebar with complete brand identity, hierarchical section navigation, role switcher, and profile card.

### 2. Touch Targets & Inputs
- All interactive controls on mobile have a minimum touch target of `44px × 44px` (buttons, selects, inputs, nav items).
- Date and time pickers utilize native touch-friendly inputs with `min-h-[48px]`.
- Passenger management rows provide generous tap targets for adding/removing riders and toggling Boarded/Missed statuses.

### 3. Layout Scaling & Typography
- **Dashboard & Stats**: 2 columns on mobile, scaling to 3–4 columns on tablet and desktop.
- **Route Visualizations**: Adaptive flex-shrink connector lines with vertical fallbacks to guarantee zero horizontal overflow on small screens.
- **Rider Desk**: Dynamic timeline structure that collapses into streamlined card badges on mobile and expands into full vertical timeline trees on tablet/desktop.
- **Modals**: Native mobile bottom sheet styling on screens < 640px, transitioning to centered floating modals on larger viewports.

---

## Component Reuse

Always check if a component exists before creating a new one:

- `Sidebar` — App navigation
- `TopHeader` — Page header bar
- `DemoRoleSwitcher` — Role switching for demo
- `StatBlock` — Dashboard statistics
- `RouteVisualization` — FROM → TO route display
- `StatusBadge` — Status indicator
- `PassengerRow` — Single passenger with status
- `PassengerList` — List of passengers
- `RideCard` — Ride summary card
- `RideTimeline` — Event timeline
- `RequestStepper` — Multi-step form
- `BoardingControl` — Boarded/Missed buttons
- `Toast` — Notification toast
- `Modal` — Confirmation modal
- `EmptyState` — Empty state placeholder
- `Button` — Styled button with states
