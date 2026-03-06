# Frontend Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate the entire frontend from custom CSS to Tailwind CSS + shadcn/ui with a clean, minimal design while preserving all features.

**Architecture:** Replace custom CSS variables with Tailwind config + shadcn components. Use shadcn/ui for complex components (table, dialog, forms, etc.) and Tailwind utilities for layout. Page-by-page migration starting with setup, then core pages.

**Tech Stack:** Tailwind CSS, shadcn/ui, lucide-react, framer-motion, react-hook-form, zod

---

## Task 1: Install and Configure Tailwind CSS

**Files:**
- Modify: `package.json`
- Create: `tailwind.config.ts`
- Create: `postcss.config.mjs`
- Modify: `styles/global.css`

**Step 1: Install Tailwind CSS dependencies**

Run:
```bash
bun add -D tailwindcss postcss autoprefixer
bunx tailwindcss init -p
```

**Step 2: Configure tailwind.config.ts**

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

**Step 3: Install tailwindcss-animate**

Run:
```bash
bun add -D tailwindcss-animate
```

**Step 4: Replace global.css with Tailwind directives**

Create new `styles/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    --primary: 24.6 95% 50.4%; /* Orange accent */
    --primary-foreground: 0 0% 100%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 24.6 95% 50.4%;
    --accent-foreground: 0 0% 100%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 24.6 95% 50.4%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 240 10% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 24.6 95% 50.4%;
    --primary-foreground: 0 0% 100%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 24.6 95% 50.4%;
    --accent-foreground: 0 0% 100%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 24.6 95% 50.4%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

**Step 5: Commit**

Run:
```bash
git add package.json tailwind.config.ts postcss.config.mjs styles/globals.css
git commit -m "feat(ui): add Tailwind CSS configuration"
```

---

## Task 2: Initialize shadcn/ui

**Files:**
- Create: `components.json`
- Create: `lib/utils.ts`
- Create: `components/ui/` (multiple component files)

**Step 1: Create components.json**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "styles/globals.css",
    "baseColor": "zinc",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

**Step 2: Create lib/utils.ts**

```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**Step 3: Install shadcn dependencies**

Run:
```bash
bun add clsx tailwind-merge class-variance-authority @radix-ui/react-slot @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-toast @radix-ui/react-label @radix-ui/react-checkbox @radix-ui/react-switch @radix-ui/react-scroll-area
```

**Step 4: Create base UI components**

Create these files using shadcn/ui patterns:
- `components/ui/button.tsx`
- `components/ui/input.tsx`
- `components/ui/card.tsx`
- `components/ui/table.tsx`
- `components/ui/badge.tsx`
- `components/ui/dialog.tsx`
- `components/ui/select.tsx`
- `components/ui/dropdown-menu.tsx`
- `components/ui/skeleton.tsx`
- `components/ui/scroll-area.tsx`
- `components/ui/label.tsx`
- `components/ui/toast.tsx` (using Toast from shadcn pattern)

**Step 5: Commit**

Run:
```bash
git add components.json lib/utils.ts components/ui/
git commit -m "feat(ui): initialize shadcn/ui components"
```

---

## Task 3: Create App Layout with Tailwind

**Files:**
- Modify: `components/Layout.tsx`
- Modify: `components/BottomNav.tsx`

**Step 1: Update Layout.tsx with Tailwind classes**

Replace existing styles with Tailwind utility classes. Keep the same structure but use:
- `min-h-screen` for body
- `container mx-auto px-4` for main content
- `flex flex-col min-h-screen` for layout structure

**Step 2: Update BottomNav.tsx with Tailwind**

- Use `fixed bottom-0 left-0 right-0` for mobile nav
- Use `border-t` for separation
- Use `bg-background/95 backdrop-blur` for glass effect
- Use `justify-around` for evenly spaced nav items

**Step 3: Commit**

Run:
```bash
git add components/Layout.tsx components/BottomNav.tsx
git commit -m "feat(ui): migrate Layout and BottomNav to Tailwind"
```

---

## Task 4: Migrate Dashboard Page

**Files:**
- Modify: `pages/dashboard.tsx`
- Modify: `pages/_app.tsx` (update global styles import)

**Step 1: Replace custom CSS with Tailwind in dashboard.tsx**

Key changes:
- Card components → use `Card`, `CardHeader`, `CardContent` from ui/
- Stats display → use Tailwind grid `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4`
- Table → use shadcn `Table`, `TableHeader`, `TableRow`, `TableCell`
- Buttons → use shadcn `Button` component
- Badges → use shadcn `Badge` component

**Step 2: Update imports**

Replace custom components with shadcn equivalents where applicable.

**Step 3: Run tests**

Run:
```bash
bun run test:ui
```

Expected: All UI tests pass

**Step 4: Commit**

Run:
```bash
git add pages/dashboard.tsx
git commit -m "feat(ui): migrate Dashboard to Tailwind + shadcn"
```

---

## Task 5: Migrate Cargas Page (Complex)

**Files:**
- Modify: `pages/cargas.tsx`
- Modify: `components/EmptyState.tsx`
- Modify: `components/ErrorState.tsx`

**Step 1: Update CargasPage with Tailwind**

Key components:
- Search input → use shadcn `Input` with icon
- Filter buttons → use shadcn `Button` variants
- Table → use shadcn `Table` components
- Pagination → use shadcn `Button` + custom component
- Empty/Error states → use shadcn `Card` with custom styling

**Step 2: Test search/filter functionality**

Manual test in browser - verify search and filter work correctly.

**Step 3: Commit**

Run:
```bash
git add pages/cargas.tsx components/EmptyState.tsx components/ErrorState.tsx
git commit -m "feat(ui): migrate Cargas page to Tailwind + shadcn"
```

---

## Task 6: Migrate Details Page

**Files:**
- Modify: `pages/details.tsx`

**Step 1: Update DetailsPage with Tailwind**

- Use `Card` components for sections
- Use `Badge` for status display
- Use `Button` for actions
- Use `ScrollArea` for long content

**Step 2: Test details view**

Manual test - verify all carga details display correctly.

**Step 3: Commit**

Run:
```bash
git add pages/details.tsx
git commit -m "feat(ui): migrate Details page to Tailwind + shadcn"
```

---

## Task 7: Migrate Remaining Pages

**Files:**
- Modify: `pages/activity.tsx`
- Modify: `pages/table.tsx`
- Modify: `pages/profile.tsx`
- Modify: `pages/settings.tsx`
- Modify: `pages/status.tsx`
- Modify: `pages/login.tsx`

**Step 1: Migrate each page**

Apply Tailwind + shadcn patterns to each page:
- Activity: List items with Card, Badge for status
- Table: Full-width Table component
- Profile: Card-based form layout
- Settings: Card sections with form elements
- Status: Card grid for system info
- Login: Centered Card with form inputs

**Step 2: Test each page**

Run app and navigate to each page to verify layout.

**Step 3: Commit**

Run:
```bash
git add pages/activity.tsx pages/table.tsx pages/profile.tsx pages/settings.tsx pages/status.tsx pages/login.tsx
git commit -m "feat(ui): migrate remaining pages to Tailwind + shadcn"
```

---

## Task 8: Polish and Responsive Testing

**Files:**
- Modify: Any pages needing adjustments
- Create: Custom Tailwind utilities if needed

**Step 1: Test responsive behavior**

- Mobile (375px)
- Tablet (768px)
- Desktop (1024px+)
- Fix any layout issues

**Step 2: Add animations**

- Use framer-motion for page transitions
- Add subtle hover effects on cards
- Smooth accordion animations

**Step 3: Run all tests**

Run:
```bash
bun run test
```

Expected: All tests pass

**Step 4: Commit**

Run:
```bash
git add .
git commit -m "feat(ui): polish UI with responsive fixes and animations"
```

---

## Execution

**Plan complete and saved to `docs/plans/2026-03-06-frontend-tailwind-shadcn-plan.md`.**

Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
