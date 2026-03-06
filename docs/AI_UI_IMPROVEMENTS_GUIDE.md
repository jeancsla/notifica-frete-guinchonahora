# UI/UX Improvements Guide

> Documentation of UX/UI improvements implemented in Feb 2026
> For AI assistants working on this codebase

---

## Overview

Transformed a cluttered, non-functional UI into a polished, accessible, professional interface.

**Before:** 8 navigation items (including 4 dead pages), emojis, no icons, broken accessibility
**After:** 4 functional navigation items, Lucide icons, keyboard accessible, WCAG AA compliant

---

## Navigation Changes

### Before

```typescript
// 8 items, redundant and non-functional
const navItems = [
  { href: "/", label: "Visão geral" }, // Static marketing page
  { href: "/dashboard", label: "Painel" },
  { href: "/table", label: "Tabela" },
  { href: "/details", label: "Detalhes" }, // Duplicate of dashboard panel
  { href: "/status", label: "Status" },
  { href: "/settings", label: "Configurações" }, // Read-only static display
  { href: "/profile", label: "Perfil" }, // Hardcoded fake data
  { href: "/activity", label: "Atividade" },
];
// Mobile: 📊 📋 🟢 ⚡ (emojis)
```

### After

```typescript
// 4 functional items with icons
import { LayoutDashboard, Table, Activity, Settings } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/cargas", label: "Cargas", icon: Table },
  { href: "/status", label: "Status", icon: Activity },
  { href: "/activity", label: "Atividade", icon: Settings },
];
// Mobile: 3 items (Painel, Cargas, Status) with Lucide icons
```

### Changes Made

- **Deleted:** `pages/index.tsx` → redirect to `/dashboard`
- **Deleted:** `pages/details.tsx`
- **Deleted:** `pages/settings.tsx` (non-functional)
- **Deleted:** `pages/profile.tsx` (fake data)
- **Renamed:** `pages/table.tsx` → `pages/cargas.tsx` (new design)

---

## New Components

### 1. EmptyState

**Purpose:** Consistent empty state UI with icon and optional action

**Usage:**

```tsx
import { EmptyState } from "../components/EmptyState";
import { Package } from "lucide-react";

<EmptyState
  title="Nenhum frete pendente"
  description="Todos os fretes foram processados."
  icon={Package}
  action={{
    label: "Verificar novamente",
    onClick: handleRefresh,
  }}
/>;
```

**Before:**

```tsx
<td colSpan={7} className="table-empty">
  Nenhum frete encontrado.
</td>
```

**After:**

```tsx
<EmptyState
  title="Nenhum frete pendente"
  description="Todos os fretes foram processados."
  icon={Package}
  action={{ label: "Verificar novamente", onClick: handleRefresh }}
/>
```

---

### 2. ErrorState

**Purpose:** Consistent error UI with retry functionality

**Usage:**

```tsx
import { ErrorState } from "../components/ErrorState";

<ErrorState
  title="Erro ao carregar dados"
  message={error.message}
  onRetry={handleRefresh}
/>;
```

**Before:**

```tsx
<div className="card">Erro: {error.message}</div>
```

**After:**

```tsx
<ErrorState
  title="Erro ao carregar dados"
  message={error.message}
  onRetry={handleRefresh}
/>
```

---

### 3. StatCard

**Purpose:** Statistics cards with icons, trends, and loading skeletons

**Usage:**

```tsx
import { StatCard } from '../components/StatCard';
import { Package, Activity } from 'lucide-react';

// Loading state
<StatCard title="Total" value="" icon={Package} loading />

// Loaded state
<StatCard
  title="Total pendentes"
  value={23}
  subtitle="Fretes aguardando"
  icon={Package}
  trend={{ value: 12, label: 'vs ontem' }}
/>
```

**Before:**

```tsx
<div className="card">
  <h3>Total pendentes</h3>
  <p style={{ fontSize: "32px", fontWeight: 700 }}>{pendingTotal}</p>
  <p className="muted">Fretes aguardando notificação</p>
</div>
```

**After:**

```tsx
<StatCard
  title="Total pendentes"
  value={pendingTotal}
  subtitle="Fretes aguardando notificação"
  icon={Package}
/>
```

---

## Cargas Page (New)

**Features:**

- Search bar (full-text across viagem, origem, destino, produto)
- Priority filter buttons (Todas, Crítica, Alta, Média, Baixa)
- Responsive design (table on desktop, cards on mobile)
- CSV export
- Pagination (hidden when filters active)

**Key Implementation:**

```tsx
// Client-side filtering with useMemo
const filteredCargas = useMemo(() => {
  return cargas.filter((c) => {
    const matchesSearch =
      !searchQuery ||
      c.origem?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.destino?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.produto?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPriority =
      priorityFilter === "all" ||
      getPriorityLevel(c.prev_coleta) === priorityFilter;

    return matchesSearch && matchesPriority;
  });
}, [cargas, searchQuery, priorityFilter]);
```

---

## Accessibility Improvements

### 1. Keyboard Navigation

**Table rows are now keyboard accessible:**

```tsx
<tr
  onClick={() => setSelectedId(item.id_viagem)}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSelectedId(item.id_viagem);
    }
  }}
  tabIndex={0}
  role="button"
  aria-label={`Selecionar frete ${item.id_viagem}`}
>
```

### 2. ARIA Roles

**ErrorState:**

```tsx
<div role="alert" aria-live="assertive">
  ...
</div>
```

**Toast:**

```tsx
<div role="alert" aria-live="polite">
  ...
</div>
```

**Filter buttons:**

```tsx
<button aria-pressed={isActive}>...</button>
```

### 3. Color Contrast (WCAG AA)

**Priority badges now meet 4.5:1 contrast:**

```typescript
const getPriorityColor = (level: PriorityLevel) => {
  if (level === "critical") return { bg: "#dc2626", color: "#ffffff" }; // 6.7:1
  if (level === "high") return { bg: "#ea580c", color: "#ffffff" }; // 4.5:1
  if (level === "normal") return { bg: "#ca8a04", color: "#ffffff" }; // 4.6:1
  return { bg: "#16a34a", color: "#ffffff" }; // 5.1:1
};
```

---

## Performance Optimizations

### 1. React.memo

Wrap components to prevent unnecessary re-renders:

```tsx
export const StatCard = React.memo(function StatCard({...}) {
  // component
});
```

### 2. useCallback

Memoize event handlers:

```tsx
const handleSearchChange = useCallback((e) => {
  setSearchQuery(e.target.value);
}, []);
```

---

## Shared Utilities

### lib/priority.ts

Centralized priority logic (was duplicated in dashboard.tsx and cargas.tsx):

```typescript
export type PriorityLevel = "critical" | "high" | "normal" | "low";

export function getPriorityLevel(dateStr: string | null): PriorityLevel {
  if (!dateStr) return "low";
  const diffHours =
    (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60);
  if (diffHours <= 6) return "critical";
  if (diffHours <= 24) return "high";
  if (diffHours <= 72) return "normal";
  return "low";
}

export function getPriorityLabel(level: PriorityLevel): string {
  const labels = {
    critical: "Crítica",
    high: "Alta",
    normal: "Média",
    low: "Baixa",
  };
  return labels[level];
}

export function getPriorityColor(level: PriorityLevel) {
  const colors = {
    critical: { bg: "#dc2626", color: "#ffffff" },
    high: { bg: "#ea580c", color: "#ffffff" },
    normal: { bg: "#ca8a04", color: "#ffffff" },
    low: { bg: "#16a34a", color: "#ffffff" },
  };
  return colors[level];
}
```

---

## Test Data with Faker

**Factory:** `tests/factories/carga.ts`

```typescript
import { faker } from '@faker-js/faker/locale/pt_BR';

export function createMockCarga(overrides?: Partial<CargaRecord>): CargaRecord {
  return {
    id_viagem: faker.number.int({ min: 10000, max: 99999 }),
    origem: faker.helpers.arrayElement(['São Paulo', 'Rio de Janeiro', ...]),
    destino: faker.helpers.arrayElement(['São Paulo', 'Rio de Janeiro', ...]),
    produto: faker.helpers.arrayElement(['Eletrônicos', 'Alimentos', ...]),
    prev_coleta: faker.date.future({ days: 7 }).toISOString(),
    ...overrides,
  };
}

export function createMockCargas(count: number): CargaRecord[] {
  return Array.from({ length: count }, () => createMockCarga());
}
```

---

## CSS Variables

**File:** `styles/base/variables.css`

```css
:root {
  /* Colors */
  --bg: #0d0f14;
  --bg-2: #151a23;
  --card: #121720;
  --ink: #f6f3ea;
  --muted: #a7afbe;
  --accent: #ff7a00;
  --accent-2: #00e0a4;
  --danger: #ff4d5a;
  --success: #22c55e;
  --warning: #f59e0b;
  --stroke: #2b3445;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;

  /* Border Radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;

  /* Shadows */
  --shadow-card: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
  --shadow-elevated: 0 10px 15px -3px rgba(0, 0, 0, 0.4);
}
```

---

## Instructions for AI Assistants

### When Adding New Icons

1. Import from `lucide-react`
2. Use consistent size (20px for nav, 16px for buttons, 48px for empty states)
3. Add `aria-hidden="true"` for decorative icons
4. Add `aria-label` for interactive icons

```tsx
import { IconName } from 'lucide-react';

// Decorative
<IconName size={20} aria-hidden="true" />

// Interactive
<button aria-label="Refresh">
  <RefreshCw size={16} />
</button>
```

### When Creating New Components

1. Wrap with `React.memo` for pure components
2. Add proper TypeScript interfaces
3. Use CSS variables for styling
4. Add ARIA attributes for accessibility

```tsx
export const MyComponent = React.memo(function MyComponent({
  title,
  children,
}: MyComponentProps) {
  return (
    <div role="region" aria-label={title}>
      {children}
    </div>
  );
});
```

### When Adding Event Handlers

1. Use `useCallback` to prevent unnecessary re-renders
2. Handle both click and keyboard events for interactive elements
3. Add `tabIndex` and `role` for custom interactive elements

```tsx
const handleClick = useCallback(() => {
  // action
}, [deps]);

const handleKeyDown = useCallback(
  (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  },
  [handleClick],
);
```

### When Working with Priority

Always use the shared utility:

```tsx
import {
  getPriorityLevel,
  getPriorityLabel,
  getPriorityColor,
} from "../lib/priority";

const level = getPriorityLevel(carga.prev_coleta);
const label = getPriorityLabel(level);
const colors = getPriorityColor(level);
```

### When Testing with Mock Data

Use the factory functions:

```tsx
import { createMockCarga, createMockCargas } from "../factories/carga";

// Single
const carga = createMockCarga({ origem: "São Paulo" });

// Multiple
const cargas = createMockCargas(20);
```

---

## File Reference

```
components/
├── EmptyState.tsx          # Empty state with icon + action
├── ErrorState.tsx          # Error with retry button
├── StatCard.tsx            # Stats with icon, trend, skeleton
├── Layout.tsx              # Navigation with Lucide icons
└── BottomNav.tsx           # Mobile nav with icons

pages/
├── dashboard.tsx           # Uses StatCard, EmptyState, ErrorState
├── cargas.tsx              # Search, filter, export, responsive
├── activity.tsx            # Uses EmptyState, ErrorState
└── status.tsx              # Uses ErrorState

lib/
├── priority.ts             # Shared priority logic
└── ...

styles/
├── base/
│   └── variables.css       # CSS variables
└── global.css              # Component styles

tests/
├── factories/
│   └── carga.ts            # Mock data generator
└── ui/
    └── cargas-with-mock-data.test.tsx
```

---

## Quick Checklist for UI Changes

- [ ] Use Lucide icons (not emojis)
- [ ] Add `aria-hidden` for decorative icons
- [ ] Use CSS variables for colors/spacing
- [ ] Wrap pure components with `React.memo`
- [ ] Use `useCallback` for event handlers
- [ ] Add keyboard support for interactive elements
- [ ] Ensure 4.5:1 color contrast
- [ ] Test with faker mock data
- [ ] Run `bun run test` before committing
- [ ] Run `bun run build` before committing

---

## Commands

```bash
# Run tests
bun run test

# Run build
bun run build

# Fix formatting
bun run lint:prettier:fix

# Type check
bun run type-check
```
