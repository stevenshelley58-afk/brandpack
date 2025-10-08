# Brand Pack - Design System

## Philosophy

Brand Pack's design system is built on three principles:

1. **Premium & Feature-Rich**: Clean interface that hides complexity in the backend
2. **Progressive Disclosure**: Interface grows as user moves through flow
3. **Themeable**: Easy to swap color palettes without touching components

## Design Tokens

All design values are defined as CSS custom properties for easy theming.

### Color System

The default theme uses a neutral gray palette with strategic accent colors. All colors are defined as CSS variables to enable easy theme switching.

```css
/* apps/web/src/app/globals.css */

:root {
  /* === NEUTRALS (95% of UI) === */
  --gray-25: #fcfcfc;
  --gray-50: #fafafa;
  --gray-100: #f5f5f5;
  --gray-200: #e5e5e5;
  --gray-300: #d4d4d4;
  --gray-400: #a3a3a3;
  --gray-500: #737373;
  --gray-600: #525252;
  --gray-700: #404040;
  --gray-800: #262626;
  --gray-900: #171717;
  --gray-950: #0a0a0a;
  
  /* === ACCENT COLORS === */
  /* Blue - Primary actions, links */
  --blue-50: #eff6ff;
  --blue-500: #3b82f6;
  --blue-600: #2563eb;
  --blue-700: #1d4ed8;
  
  /* Green - Success, positive actions */
  --green-50: #f0fdf4;
  --green-500: #22c55e;
  --green-600: #16a34a;
  --green-700: #15803d;
  
  /* Amber - Warnings, attention */
  --amber-50: #fffbeb;
  --amber-500: #f59e0b;
  --amber-600: #d97706;
  --amber-700: #b45309;
  
  /* Red - Errors, destructive actions */
  --red-50: #fef2f2;
  --red-500: #ef4444;
  --red-600: #dc2626;
  --red-700: #b91c1c;
  
  /* Purple - Premium, special features */
  --purple-50: #faf5ff;
  --purple-500: #a855f7;
  --purple-600: #9333ea;
  --purple-700: #7e22ce;
  
  /* === SEMANTIC COLORS === */
  /* Surfaces */
  --surface: var(--gray-25);
  --surface-raised: #ffffff;
  --surface-sunken: var(--gray-50);
  --surface-overlay: rgba(0, 0, 0, 0.5);
  
  /* Borders */
  --border: var(--gray-200);
  --border-hover: var(--gray-300);
  --border-focus: var(--blue-600);
  
  /* Text */
  --text-primary: var(--gray-900);
  --text-secondary: var(--gray-600);
  --text-tertiary: var(--gray-500);
  --text-inverse: #ffffff;
  --text-link: var(--blue-600);
  --text-link-hover: var(--blue-700);
  
  /* Backgrounds */
  --bg-primary: #ffffff;
  --bg-secondary: var(--gray-50);
  --bg-tertiary: var(--gray-100);
  --bg-inverse: var(--gray-900);
  
  /* Interactive states */
  --interactive-hover: var(--gray-100);
  --interactive-active: var(--gray-200);
  --interactive-disabled: var(--gray-300);
  
  /* Status colors */
  --status-success: var(--green-600);
  --status-warning: var(--amber-600);
  --status-error: var(--red-600);
  --status-info: var(--blue-600);
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

/* Dark mode (future) */
@media (prefers-color-scheme: dark) {
  :root {
    --surface: var(--gray-950);
    --surface-raised: var(--gray-900);
    --text-primary: var(--gray-50);
    --text-secondary: var(--gray-400);
    --bg-primary: var(--gray-900);
    /* ... etc */
  }
}
```

### Alternative Themes

Themes can be swapped by changing color variables:

```css
/* Meta Blue Theme (example) */
[data-theme="meta"] {
  --blue-600: #0866ff;
  --border-focus: #0866ff;
  --text-link: #0866ff;
}

/* Brand-specific theme (example) */
[data-theme="custom"] {
  --blue-600: var(--brand-primary);
  --green-600: var(--brand-success);
  /* Map semantic tokens to brand colors */
}
```

---

## Typography

### Type Scale

```css
:root {
  /* Display - Hero sections, major headings */
  --font-size-display: 32px;
  --font-weight-display: 600;
  --line-height-display: 1.2;
  --letter-spacing-display: -0.02em;
  
  /* Headline - Section headings, card titles */
  --font-size-headline: 20px;
  --font-weight-headline: 600;
  --line-height-headline: 1.3;
  --letter-spacing-headline: -0.01em;
  
  /* Subheadline - Secondary headings */
  --font-size-subheadline: 16px;
  --font-weight-subheadline: 600;
  --line-height-subheadline: 1.4;
  --letter-spacing-subheadline: -0.005em;
  
  /* Body - Primary content */
  --font-size-body: 15px;
  --font-weight-body: 400;
  --line-height-body: 1.5;
  --letter-spacing-body: 0;
  
  /* Body Small - Secondary content */
  --font-size-body-sm: 14px;
  --font-weight-body-sm: 400;
  --line-height-body-sm: 1.5;
  --letter-spacing-body-sm: 0;
  
  /* Label - Form labels, UI labels */
  --font-size-label: 13px;
  --font-weight-label: 500;
  --line-height-label: 1.4;
  --letter-spacing-label: 0;
  
  /* Caption - Helper text, metadata */
  --font-size-caption: 12px;
  --font-weight-caption: 400;
  --line-height-caption: 1.4;
  --letter-spacing-caption: 0.01em;
  
  /* Overline - All caps labels */
  --font-size-overline: 11px;
  --font-weight-overline: 600;
  --line-height-overline: 1.3;
  --letter-spacing-overline: 0.08em;
  text-transform: uppercase;
}
```

### Font Families

```css
:root {
  /* Sans-serif for UI */
  --font-family-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
  
  /* Monospace for code, technical data */
  --font-family-mono: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono",
    Consolas, monospace;
}

body {
  font-family: var(--font-family-sans);
  font-size: var(--font-size-body);
  line-height: var(--line-height-body);
  color: var(--text-primary);
}
```

### Type Usage Examples

```tsx
// Display
<h1 className="text-[32px] font-semibold leading-[1.2] tracking-[-0.02em]">
  Turn your website into ready-to-run ads
</h1>

// Headline
<h2 className="text-[20px] font-semibold leading-[1.3] tracking-[-0.01em]">
  Brand Snapshot
</h2>

// Body
<p className="text-[15px] leading-[1.5]">
  We've analyzed your website and identified your brand's unique voice.
</p>

// Label
<label className="text-[13px] font-medium">
  Website URL
</label>

// Caption
<span className="text-[12px] text-gray-600 tracking-[0.01em]">
  Generated in 2.4s
</span>
```

---

## Spacing System

All spacing uses a 4px base unit:

```css
:root {
  /* Base unit */
  --spacing-unit: 4px;
  
  /* Spacing scale */
  --spacing-0: 0;
  --spacing-1: 4px;    /* 1 unit */
  --spacing-2: 8px;    /* 2 units */
  --spacing-3: 12px;   /* 3 units */
  --spacing-4: 16px;   /* 4 units */
  --spacing-5: 20px;   /* 5 units */
  --spacing-6: 24px;   /* 6 units */
  --spacing-8: 32px;   /* 8 units */
  --spacing-10: 40px;  /* 10 units */
  --spacing-12: 48px;  /* 12 units */
  --spacing-16: 64px;  /* 16 units */
  --spacing-20: 80px;  /* 20 units */
  --spacing-24: 96px;  /* 24 units */
  
  /* Semantic spacing */
  --spacing-component-padding: var(--spacing-4);      /* 16px */
  --spacing-component-padding-lg: var(--spacing-6);   /* 24px */
  --spacing-section-gap: var(--spacing-8);            /* 32px */
  --spacing-section-gap-lg: var(--spacing-12);        /* 48px */
  --spacing-page-margin: var(--spacing-16);           /* 64px */
  --spacing-page-margin-lg: var(--spacing-20);        /* 80px */
}
```

### Spacing Usage

- **Component padding**: 16px (standard), 24px (large cards)
- **Gap between elements**: 8px (tight), 16px (standard), 32px (loose)
- **Section gaps**: 32px (related sections), 48px (different sections)
- **Page margins**: 64px (desktop), 24px (mobile)

---

## Layout

### Container Widths

```css
:root {
  --container-sm: 640px;
  --container-md: 768px;
  --container-lg: 1024px;
  --container-xl: 1280px;
  --container-2xl: 1536px;
  
  /* Semantic containers */
  --container-content: var(--container-lg);    /* 1024px - main content */
  --container-wide: var(--container-xl);       /* 1280px - dashboards */
  --container-narrow: var(--container-md);     /* 768px - forms, text */
}
```

### Grid System

```css
/* 12-column grid */
.grid-12 {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--spacing-6);
}

/* Common layouts */
.layout-sidebar {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: var(--spacing-8);
}

.layout-two-pane {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-6);
}

.layout-control-console {
  display: grid;
  grid-template-columns: 1fr 400px; /* Controls | Preview */
  gap: var(--spacing-8);
}
```

### Breakpoints

```css
:root {
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
  --breakpoint-2xl: 1536px;
}

/* Usage in Tailwind */
@media (min-width: 768px) {
  /* md: */
}
```

---

## Components

### Design Principles

1. **Consistent**: All components use the same tokens
2. **Composable**: Build complex UIs from simple primitives
3. **Accessible**: ARIA labels, keyboard navigation, focus states
4. **Responsive**: Mobile-first, graceful degradation
5. **Themeable**: Respect color tokens, no hardcoded colors

### Component Library

All components live in `packages/ui/src/`:

```
packages/ui/src/
├── Button.tsx
├── Card.tsx
├── Badge.tsx
├── Input.tsx
├── Select.tsx
├── Tabs.tsx
├── Accordion.tsx
├── TwoPaneCard.tsx
├── Loader.tsx
├── Toast.tsx
├── Modal.tsx
├── Tooltip.tsx
└── index.ts
```

### Component Specifications

#### Button

**Variants**:
- `primary`: Main actions (blue background)
- `secondary`: Secondary actions (gray background)
- `ghost`: Subtle actions (transparent, hover background)
- `danger`: Destructive actions (red background)

**Sizes**:
- `sm`: 32px height, 12px padding
- `md`: 40px height, 16px padding (default)
- `lg`: 48px height, 20px padding

**States**:
- Default
- Hover (darken 10%)
- Active (darken 15%)
- Disabled (opacity 50%, no pointer events)
- Loading (show spinner, disable interaction)

```tsx
<Button variant="primary" size="md">
  Generate Ideas
</Button>

<Button variant="ghost" size="sm" icon={<RefreshIcon />}>
  Regenerate
</Button>
```

#### Card

**Variants**:
- `default`: White background, subtle border
- `elevated`: White background, shadow
- `outlined`: Transparent background, border
- `interactive`: Hover state, cursor pointer

**Padding**:
- `sm`: 16px
- `md`: 24px (default)
- `lg`: 32px

```tsx
<Card variant="elevated" padding="md">
  <CardHeader>
    <h3>Brand Snapshot</h3>
  </CardHeader>
  <CardBody>
    {/* Content */}
  </CardBody>
</Card>
```

#### Badge

**Variants** (semantic):
- `neutral`: Gray
- `success`: Green
- `warning`: Amber
- `error`: Red
- `info`: Blue

**Sizes**:
- `sm`: 20px height, 8px padding
- `md`: 24px height, 10px padding

```tsx
<Badge variant="success" size="sm">
  High Quality
</Badge>

<Badge variant="neutral">
  Emotional
</Badge>
```

#### TwoPaneCard

Special card for before/after comparisons:

```tsx
<TwoPaneCard>
  <TwoPaneCard.Left label="Before (Collapsed)">
    <p>Your CRM just crashed. Stop losing deals.</p>
    <span className="text-caption">67 chars</span>
  </TwoPaneCard.Left>
  
  <TwoPaneCard.Right label="After (Expanded)">
    <p>
      Your CRM just crashed. Stop losing deals. Acme keeps your data
      safe with 99.9% uptime, automatic backups, and real-time sync.
      Join 10k teams who never worry about data loss.
    </p>
    <span className="text-caption">198 chars</span>
  </TwoPaneCard.Right>
</TwoPaneCard>
```

#### Accordion

For Control Console and collapsible sections:

```tsx
<Accordion>
  <AccordionItem id="prompt" label="A) Prompt">
    <TextArea label="System Prompt" value={systemPrompt} />
    <TextArea label="User Template" value={userTemplate} />
  </AccordionItem>
  
  <AccordionItem id="model" label="B) Model">
    <Select label="Provider" options={providers} />
    <Input label="Temperature" type="number" min={0} max={1} step={0.1} />
  </AccordionItem>
</Accordion>
```

---

## Progressive Interface Design

### Stage 1: Landing Page (Pre-Login)

```
┌─────────────────────────────────────────────────────┐
│  [ Logo ]                            [ Try It Free ] │
├─────────────────────────────────────────────────────┤
│                                                      │
│        Turn your website into ready-to-run ads      │
│              [ Enter Website URL ]                   │
│                                                      │
│                 [ Demo Showcase ]                    │
│            (3-5 example ad packs)                    │
│                                                      │
└─────────────────────────────────────────────────────┘

Design:
- No sidebar
- Clean, minimal
- Full-width sections
- Centered content (max-w-4xl)
- Large CTA
```

### Stage 2: URL Input (First Interaction)

```
┌─────────────────────────────────────────────────────┐
│  [ Logo ]                      [ steve@... ▾ ]      │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌───────────────────────────────────────────────┐  │
│  │  What's your website?                         │  │
│  │  ┌────────────────────────────────────────┐   │  │
│  │  │ https://acme.com              [Start] │   │  │
│  │  └────────────────────────────────────────┘   │  │
│  │                                               │  │
│  │  or [ Upload Content ] [ Paste Text ]        │  │
│  └───────────────────────────────────────────────┘  │
│                                                      │
│  Recent: acme.com · oldcorp.com · newstart.io       │
│                                                      │
└─────────────────────────────────────────────────────┘

Design:
- Still no sidebar
- Focused on single action
- Progress breadcrumbs appear at top
```

### Stage 3: Review (Interface Grows)

```
┌─────────────────────────────────────────────────────┐
│  [ Logo ]  Review > Ideas > Copy > Image > Final    │
│                                      [ steve@... ▾ ] │
├───┬─────────────────────────────────────────────────┤
│ H │  Brand Snapshot                                 │
│ o │  ┌─────────────────────────────────────────┐    │
│ m │  │ Tone: Professional, Data-driven         │    │
│ e │  │ Proof: 10k users, 99.9% uptime          │    │
│   │  │ Pricing: Starts at $99/mo               │    │
│ H │  │ Audience: B2B SaaS teams                │    │
│ i │  └─────────────────────────────────────────┘    │
│ s │                                                  │
│ t │             [ Generate Ideas → ]                │
│ o │                                                  │
│ r │                                    [⚙ Settings] │
│ y │                                                  │
├───┴─────────────────────────────────────────────────┤
│  Cost: $0.02 · Duration: 12.3s · Cached             │
└─────────────────────────────────────────────────────┘

Design:
- Sidebar appears (minimal: Home, History)
- Breadcrumb trail shows progress
- Settings gear icon (bottom right)
- Main content centered
- Footer shows run metadata
```

### Stage 4: Ideas (Full Interface)

```
┌─────────────────────────────────────────────────────┐
│  [ Logo ]  Review > Ideas > Copy > Image > Final    │
│                          [Fast ▾]    [ steve@... ▾ ] │
├───┬─────────────────────────────────────────────────┤
│ H │  Marketing Ideas (showing top 6 of 20)          │
│ o │  ┌─────┐ ┌─────┐ ┌─────┐                        │
│ m │  │ Idea│ │ Idea│ │ Idea│                        │
│ e │  │  1  │ │  2  │ │  3  │                        │
│   │  │ [✓] │ │ [ ] │ │ [✓] │                        │
│ H │  └─────┘ └─────┘ └─────┘                        │
│ i │  ┌─────┐ ┌─────┐ ┌─────┐                        │
│ s │  │ Idea│ │ Idea│ │ Idea│                        │
│ t │  │  4  │ │  5  │ │  6  │                        │
│ o │  │ [ ] │ │ [✓] │ │ [ ] │                        │
│ r │  └─────┘ └─────┘ └─────┘                        │
│ y │                                                  │
│   │  [ Show More (14) ] [ Regenerate ]              │
│ S │                                                  │
│ e │           [ Generate Copy for 3 → ]             │
│ t │                                                  │
│ t │                                    [⚙ Settings] │
│ i │                                                  │
│ n │                                                  │
│ g │                                                  │
│ s │                                                  │
└───┴─────────────────────────────────────────────────┘

Design:
- Preset selector appears (Fast/Balanced/Full)
- Grid layout for ideas
- Selection checkboxes
- Show more / Regenerate options
- Settings icon always accessible
```

---

## Interaction States

### Focus States

All interactive elements have clear focus indicators:

```css
.interactive:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
}
```

### Hover States

Subtle hover feedback:

```css
.card-interactive:hover {
  border-color: var(--border-hover);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
  transition: all 150ms ease;
}
```

### Loading States

Clear loading indicators:

```tsx
<Button loading>
  <Spinner size="sm" />
  Generating...
</Button>
```

### Disabled States

Obvious disabled states:

```css
.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}
```

---

## Animations

Subtle, purposeful animations:

```css
:root {
  --transition-fast: 150ms ease;
  --transition-base: 250ms ease;
  --transition-slow: 350ms ease;
}

/* Fade in */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide up */
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Pulse (for loading) */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

**Usage**:
- Page transitions: `slideUp` (250ms)
- Modal open: `fadeIn` (150ms)
- Loading states: `pulse` (1.5s infinite)

---

## Accessibility

### WCAG 2.1 AA Compliance

- **Color contrast**: 4.5:1 for text, 3:1 for UI components
- **Focus indicators**: Visible on all interactive elements
- **Keyboard navigation**: Full support, logical tab order
- **Screen readers**: Proper ARIA labels, roles, states
- **Motion**: Respect `prefers-reduced-motion`

### ARIA Patterns

```tsx
// Button
<button aria-label="Regenerate ideas" aria-busy={loading}>
  <RefreshIcon aria-hidden="true" />
</button>

// Modal
<div role="dialog" aria-modal="true" aria-labelledby="modal-title">
  <h2 id="modal-title">Settings</h2>
</div>

// Accordion
<button
  aria-expanded={isOpen}
  aria-controls="panel-1"
  id="heading-1"
>
  Prompt Settings
</button>
<div id="panel-1" aria-labelledby="heading-1" hidden={!isOpen}>
  {/* Content */}
</div>
```

---

## Responsive Design

### Mobile-First Approach

Start with mobile layout, enhance for larger screens:

```tsx
// Mobile (default)
<div className="grid grid-cols-1 gap-4">

// Tablet (md:)
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">

// Desktop (lg:)
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
```

### Breakpoint Usage

- **Mobile** (<640px): Single column, stacked layout
- **Tablet** (640-1024px): Two columns, condensed sidebar
- **Desktop** (>1024px): Full layout, expanded sidebar

---

## Component Development Guidelines

1. **Use tokens only**: No hardcoded colors, spacing, or font sizes
2. **Compose, don't configure**: Prefer composition over massive prop APIs
3. **Keep it simple**: Components should do one thing well
4. **Accessibility first**: ARIA, keyboard nav, focus management
5. **Document props**: Clear TypeScript interfaces with comments
6. **Test in isolation**: Each component should work standalone
7. **Responsive by default**: Mobile-first, graceful degradation

---

## Summary

Brand Pack's design system provides:

- **Themeable tokens**: Swap colors without touching components
- **Consistent scale**: Typography, spacing, shadows all systematic
- **Progressive UI**: Interface grows as user moves through flow
- **Accessibility**: WCAG 2.1 AA compliant
- **Responsive**: Mobile-first, works everywhere
- **Quality**: Premium feel, deliberate design decisions

Use the tokens, follow the patterns, and the UI will feel cohesive and professional.

