# Fix and Polish UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Fix broken navigation, add mock data API for dev without Postgres, lint and fix all issues, and visually polish the UI.

**Architecture:**

- Fix Layout.tsx navigation (8 items → 4 items with icons)
- Create mock API middleware for development when DB is unavailable
- Add visual polish: shadows, gradients, animations
- Run full test suite and fix any issues

**Tech Stack:** Next.js, React, TypeScript, Lucide React, Framer Motion

---

## Phase 1: Fix Navigation

### Task 1: Fix Layout.tsx Navigation

**Files:**

- Modify: `components/Layout.tsx`

**Current Issue:** navItems has 8 items with "->" text, should be 4 items with Lucide icons

**Instructions:**

1. Read `components/Layout.tsx`
2. Replace navItems (lines 10-19) with:

```typescript
import { LayoutDashboard, Table, Activity, Bell } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/cargas", label: "Cargas", icon: Table },
  { href: "/status", label: "Status", icon: Activity },
  { href: "/activity", label: "Atividade", icon: Bell },
];
```

3. Update the navigation rendering (lines 71-84) to use icons:

```tsx
{
  navItems.map((item) => {
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        prefetch={false}
        className={router.pathname === item.href ? "active" : ""}
        onMouseEnter={() => prefetchRoute(item.href)}
        onFocus={() => prefetchRoute(item.href)}
      >
        <Icon size={18} aria-hidden="true" />
        <span>{item.label}</span>
      </Link>
    );
  });
}
```

4. Commit with message: "fix: update navigation to 4 items with Lucide icons"

---

## Phase 2: Mock Data API

### Task 2: Create Mock API Middleware

**Files:**

- Create: `lib/mock-api.ts`
- Modify: `pages/api/v1/cargas.ts` (create if doesn't exist, or modify proxy)

**Instructions:**

1. Create `lib/mock-api.ts`:

```typescript
import { faker } from "@faker-js/faker/locale/pt_BR";
import type { CargaRecord } from "@notifica/shared/types";

export function generateMockCargas(count = 20): CargaRecord[] {
  const cities = [
    "São Paulo",
    "Rio de Janeiro",
    "Belo Horizonte",
    "Curitiba",
    "Porto Alegre",
    "Salvador",
    "Fortaleza",
    "Brasília",
  ];
  const products = [
    "Eletrônicos",
    "Alimentos",
    "Químicos",
    "Têxteis",
    "Máquinas",
    "Móveis",
    "Papel",
    "Plásticos",
  ];
  const equipment = ["Truck", "Carreta", "Baú", "Sider", "Graneleiro", "Van"];

  return Array.from({ length: count }, () => {
    const now = new Date();
    const hoursOffset = faker.number.int({ min: -12, max: 120 });
    const prevColeta = new Date(now.getTime() + hoursOffset * 60 * 60 * 1000);

    return {
      id_viagem: faker.number.int({ min: 10000, max: 99999 }),
      origem: faker.helpers.arrayElement(cities),
      destino: faker.helpers.arrayElement(cities),
      produto: faker.helpers.arrayElement(products),
      equipamento: faker.helpers.arrayElement(equipment),
      prev_coleta: prevColeta.toISOString(),
      vr_frete: `R$ ${faker.number.int({ min: 1000, max: 50000 }).toLocaleString("pt-BR")}`,
      created_at: faker.date.recent({ days: 30 }).toISOString(),
      notified: false,
    };
  });
}

export function generateMockStatus() {
  return {
    status: "healthy",
    timestamp: new Date().toISOString(),
    database: {
      connected: true,
      version: "15.4",
      maxConnections: 100,
      openConnections: 5,
    },
  };
}
```

2. Create API route `pages/api/mock/cargas.ts`:

```typescript
import type { NextApiRequest, NextApiResponse } from "next";
import { generateMockCargas } from "../../../lib/mock-api";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const cargas = generateMockCargas(25);
  res.status(200).json({
    cargas,
    total: cargas.length,
    pendingTotal: cargas.filter((c) => !c.notified).length,
  });
}
```

3. Commit with message: "feat: add mock API for development without database"

---

## Phase 3: Visual Polish

### Task 3: Enhance Visual Design

**Files:**

- Modify: `styles/global.css`
- Modify: `components/StatCard.tsx`
- Modify: `pages/dashboard.tsx`

**Instructions:**

1. Add enhanced styles to `styles/global.css`:

```css
/* Enhanced card shadows and hover effects */
.card {
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.3),
    0 2px 4px -2px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.05);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.4),
    0 4px 6px -4px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.08);
}

/* Gradient borders for stat cards */
.stat-card {
  position: relative;
  background: linear-gradient(135deg, var(--card) 0%, var(--bg-2) 100%);
}

.stat-card::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: var(--radius-md);
  padding: 1px;
  background: linear-gradient(135deg, rgba(255, 122, 0, 0.3), transparent 50%);
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

/* Improved navigation styling */
.nav a {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  transition: all 0.2s ease;
}

.nav a:hover {
  background: rgba(255, 122, 0, 0.1);
  color: var(--accent);
}

.nav a.active {
  background: rgba(255, 122, 0, 0.15);
  color: var(--accent);
  font-weight: 500;
}
```

2. Commit with message: "style: enhance visual design with gradients and shadows"

---

## Phase 4: Test, Lint, Fix

### Task 4: Run Tests and Fix Issues

**Instructions:**

1. Run tests:

```bash
bun run test:unit
bun run test:ui
```

2. Fix any failing tests

3. Run linter:

```bash
bun run lint
bun run lint:prettier:fix
```

4. Fix any linting issues

5. Verify build:

```bash
bun run build
```

6. Commit with message: "chore: fix tests and linting issues"

---

## Phase 5: Visual Verification

### Task 5: Take Screenshots and Verify

**Instructions:**

1. Use Playwright MCP to navigate to each page:
   - /login
   - /dashboard
   - /cargas
   - /status
   - /activity

2. Take screenshots of each page

3. Verify:
   - Navigation shows 4 items with icons
   - Mobile nav shows 3 items with icons
   - Cards have enhanced shadows and hover effects
   - Mock data is displaying
   - No console errors

4. Report any remaining issues

---

## Summary of Changes

### Files Modified:

- `components/Layout.tsx` - Fix navigation
- `styles/global.css` - Enhanced visual styles
- Various component files - Polish and fixes

### Files Created:

- `lib/mock-api.ts` - Mock data generators
- `pages/api/mock/cargas.ts` - Mock API endpoint

### Commands to Run:

```bash
bun run test
bun run lint
bun run build
bun run dev:web
```
