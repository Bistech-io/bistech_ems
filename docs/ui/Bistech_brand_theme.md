# BisTech Official Brand & Design System

**Status:** Official UI Color Palette & Typography Standard  
**Applies to:** All BisTech EMS frontend views, components, layouts, and UI mockups.

---

## 1. Core Brand Color Palette

BisTech uses a **Deep Dark Mode** foundation paired with **Sea Green** brand accents. All UI components and pages must use these CSS custom properties and palette tokens rather than arbitrary colors.

### Backgrounds & Surfaces (Deep Dark Theme)

| Token | Hex | Usage |
|---|---|---|
| `--color-bg` | `#0B0F0E` | Primary app background / canvas |
| `--color-bg-secondary` | `#131A17` | Secondary surface (cards, panels, sidebar, modals, table headers) |
| `--color-bg-elevated` | `#1A2420` | Elevated surfaces, hover states, active rows, dropdown menus |
| `--color-border` | `#23302B` | Subtle structural borders, dividers, and input outlines |

### Brand Accents (Sea Green)

| Token | Hex | Usage |
|---|---|---|
| `--color-primary` | `#2E8B57` | Primary brand accent (primary buttons, active indicators, key actions) |
| `--color-primary-light` | `#4CAF7D` | Hover/focus states, highlights, interactive links, active badges, icons |
| `--color-primary-dark` | `#1F5C3A` | Pressed/active states, subtle badge fills, accent borders, focus rings |

### Text & Foreground Hierarchy

| Token | Hex | Usage |
|---|---|---|
| `--color-text-primary` | `#F0F5F2` | Primary body copy and headings (high contrast on `#0B0F0E` & `#131A17`) |
| `--color-text-secondary` | `#A3B3AC` | Secondary labels, table metadata, descriptions |
| `--color-text-muted` | `#6E8078` | Placeholders, disabled text, subtle captions |

### Semantic Status Colors

| Token | Hex | Usage |
|---|---|---|
| `--color-success` | `#4CAF7D` | Approved, present, completed, verified |
| `--color-warning` | `#F59E0B` | Pending review, late check-in, expiring |
| `--color-danger` | `#EF4444` | Rejected, absent, error, destructive action |
| `--color-info` | `#38BDF8` | Informational notices, neutral badges |

---

## 2. Typography

Configured via `next/font/google`:

- **Headings (`--font-heading`)**: **Space Grotesk**
  - Weights: `500` (Medium), `600` (SemiBold), `700` (Bold)
  - Letter-spacing: tight tracking (`-0.02em`)
  - Used for page titles, section headers, metric values, and modal titles.
- **Body & UI (`--font-sans`)**: **Inter**
  - Weights: `400` (Regular), `500` (Medium), `600` (SemiBold)
  - Used for body copy, form controls, tables, badges, and navigation.

---

## 3. Reference CSS Variables

```css
:root,
.dark {
  /* Backgrounds */
  --color-bg: #0B0F0E;
  --color-bg-secondary: #131A17;
  --color-bg-elevated: #1A2420;
  --color-border: #23302B;

  /* Sea Green Brand Accents */
  --color-primary: #2E8B57;
  --color-primary-light: #4CAF7D;
  --color-primary-dark: #1F5C3A;

  /* Typography Colors */
  --color-text-primary: #F0F5F2;
  --color-text-secondary: #A3B3AC;
  --color-text-muted: #6E8078;
}
```

---

## 4. Mandatory UI Implementation Rules

1. **Dark-First Official Palette**: Default theme is dark mode using `--color-bg: #0B0F0E` and `--color-bg-secondary: #131A17` with Sea Green (`#2E8B57`, `#4CAF7D`, `#1F5C3A`) accents.
2. **No Off-Brand Colors**: Never introduce arbitrary blue/purple/indigo default Tailwind primaries for buttons, links, focus rings, or active navigation states. Always map primary interactive elements to the Sea Green palette.
3. **Typography Enforcement**: Load `Space Grotesk` (headings, `-0.02em` tracking) and `Inter` (body) via `next/font/google`.
4. **Accessibility**: All foreground/background pairings in dark mode must pass WCAG AA / axe contrast checks.
