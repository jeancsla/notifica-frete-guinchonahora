# UX/UI Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Transform the current cluttered UI into a polished, professional interface with proper navigation, icons, empty/error states, and a functional cargas page.

**Architecture:** Consolidate 8 navigation items into 4, add Lucide icons throughout, create reusable EmptyState and ErrorState components, delete non-functional pages, and build a searchable/filterable cargas page.

**Tech Stack:** Next.js, React, TypeScript, Lucide React, CSS Modules

---

## Phase 1: Foundation - Icons and Dependencies

### Task 1: Install Lucide React

**Files:**

- Modify: `package.json`

**Step 1: Install dependency**

Run: `bun add lucide-react`
Expected: Package installed successfully

**Step 2: Commit**

```bash
git add package.json bun.lock
git commit -m "chore: add lucide-react for icons"
```

---

### Task 2: Create CSS Variables Module

**Files:**

- Create: `styles/base/variables.css`

**Step 1: Extract CSS variables from global.css**

```css
/* styles/base/variables.css */
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
  --info: #3b82f6;
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
  --radius-xl: 20px;

  /* Shadows */
  --shadow-card:
    0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.3);
  --shadow-elevated:
    0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.4);
  --shadow-glow: 0 0 20px rgba(255, 122, 0, 0.3);

  /* Typography */
  --font-sans:
    system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
```

**Step 2: Update global.css to import variables**

Modify: `styles/global.css` - Add at top:

```css
@import "./base/variables.css";
```

**Step 3: Commit**

```bash
git add styles/
git commit -m "feat: extract CSS variables to module"
```

---

## Phase 2: Navigation Cleanup

### Task 3: Update Layout Component Navigation

**Files:**

- Modify: `components/Layout.tsx`

**Step 1: Replace navigation items**

Current nav items (8): Visão geral, Painel, Tabela, Detalhes, Status, Configurações, Perfil, Atividade
New nav items (4): Painel, Cargas, Status, Atividade

Replace nav items with icons:

```tsx
import { LayoutDashboard, Table, Activity, Settings } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/cargas", label: "Cargas", icon: Table },
  { href: "/status", label: "Status", icon: Activity },
  { href: "/activity", label: "Atividade", icon: Settings },
];
```

**Step 2: Update nav link rendering to use icons**

Replace "->" text arrows with ChevronRight icon from lucide-react.

**Step 3: Commit**

```bash
git add components/Layout.tsx
git commit -m "feat: consolidate navigation to 4 items with icons"
```

---

### Task 4: Update BottomNav Component

**Files:**

- Modify: `components/BottomNav.tsx`

**Step 1: Replace emojis with icons**

Replace mobile nav emojis (📊 📋 🟢 ⚡) with Lucide icons:

- Painel: LayoutDashboard
- Cargas: Table
- Status: Activity

**Step 2: Reduce to 3 items**

Remove Atividade from mobile nav (keep only most important 3).

**Step 3: Commit**

```bash
git add components/BottomNav.tsx
git commit -m "feat: replace emoji nav with Lucide icons"
```

---

## Phase 3: Delete Non-Functional Pages

### Task 5: Remove Index Page (Visão geral)

**Files:**

- Delete: `pages/index.tsx`
- Modify: `next.config.js` or create redirect

**Step 1: Delete file**

Run: `rm pages/index.tsx`

**Step 2: Create redirect to dashboard**

Modify or create redirect in `next.config.js`:

```js
async redirects() {
  return [
    { source: '/', destination: '/dashboard', permanent: true }
  ];
}
```

**Step 3: Commit**

```bash
git rm pages/index.tsx
git add next.config.js
git commit -m "refactor: remove Visão geral page, redirect to dashboard"
```

---

### Task 6: Remove Details Page

**Files:**

- Delete: `pages/details.tsx`

**Step 1: Delete file**

Run: `rm pages/details.tsx`

**Step 2: Commit**

```bash
git rm pages/details.tsx
git commit -m "refactor: remove redundant Detalhes page"
```

---

### Task 7: Remove Settings Page

**Files:**

- Delete: `pages/settings.tsx`

**Step 1: Delete file**

Run: `rm pages/settings.tsx`

**Step 2: Commit**

```bash
git rm pages/settings.tsx
git commit -m "refactor: remove non-functional Settings page"
```

---

### Task 8: Remove Profile Page

**Files:**

- Delete: `pages/profile.tsx`

**Step 1: Delete file**

Run: `rm pages/profile.tsx`

**Step 2: Commit**

```bash
git rm pages/profile.tsx
git commit -m "refactor: remove Profile page with fake data"
```

---

## Phase 4: Create Reusable Components

### Task 9: Create EmptyState Component

**Files:**

- Create: `components/EmptyState.tsx`

**Step 1: Create component**

```tsx
import { Package, LucideIcon } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  title = "Nenhum item encontrado",
  description = "Não há dados para exibir no momento.",
  icon: Icon = Package,
  action,
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon size={48} strokeWidth={1.5} />
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-description">{description}</p>
      {action && (
        <button className="button" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
```

**Step 2: Add styles to global.css**

```css
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-10);
  text-align: center;
}

.empty-state-icon {
  color: var(--muted);
  margin-bottom: var(--space-4);
}

.empty-state-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: var(--space-2);
}

.empty-state-description {
  font-size: 14px;
  color: var(--muted);
  margin-bottom: var(--space-5);
}
```

**Step 3: Commit**

```bash
git add components/EmptyState.tsx styles/global.css
git commit -m "feat: add EmptyState component with icon support"
```

---

### Task 10: Create ErrorState Component

**Files:**

- Create: `components/ErrorState.tsx`

**Step 1: Create component**

```tsx
import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Erro ao carregar dados",
  message = "Não foi possível carregar as informações. Tente novamente.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="error-state">
      <div className="error-state-icon">
        <AlertCircle size={48} strokeWidth={1.5} />
      </div>
      <h3 className="error-state-title">{title}</h3>
      <p className="error-state-message">{message}</p>
      {onRetry && (
        <button className="button" onClick={onRetry}>
          <RefreshCw size={16} />
          Tentar novamente
        </button>
      )}
    </div>
  );
}
```

**Step 2: Add styles**

```css
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-10);
  text-align: center;
  background: rgba(255, 77, 90, 0.05);
  border: 1px solid rgba(255, 77, 90, 0.2);
  border-radius: var(--radius-md);
}

.error-state-icon {
  color: var(--danger);
  margin-bottom: var(--space-4);
}

.error-state-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: var(--space-2);
}

.error-state-message {
  font-size: 14px;
  color: var(--muted);
  margin-bottom: var(--space-5);
}

.error-state .button {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}
```

**Step 3: Commit**

```bash
git add components/ErrorState.tsx styles/global.css
git commit -m "feat: add ErrorState component with retry button"
```

---

### Task 11: Create StatCard Component

**Files:**

- Create: `components/StatCard.tsx`

**Step 1: Create component**

```tsx
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  loading?: boolean;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  loading = false,
}: StatCardProps) {
  if (loading) {
    return (
      <div className="card stat-card skeleton">
        <div className="skeleton-title" />
        <div className="skeleton-value" />
        <div className="skeleton-subtitle" />
      </div>
    );
  }

  return (
    <motion.div
      className="card stat-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <div className="stat-card-header">
        <Icon size={20} className="stat-card-icon" />
        {trend && (
          <span
            className={`stat-card-trend ${trend.value >= 0 ? "positive" : "negative"}`}
          >
            {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-title">{title}</div>
      {subtitle && <div className="stat-card-subtitle">{subtitle}</div>}
    </motion.div>
  );
}
```

**Step 2: Add styles**

```css
.stat-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.stat-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-card-icon {
  color: var(--accent);
}

.stat-card-trend {
  font-size: 12px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 12px;
}

.stat-card-trend.positive {
  color: var(--accent-2);
  background: rgba(0, 224, 164, 0.1);
}

.stat-card-trend.negative {
  color: var(--danger);
  background: rgba(255, 77, 90, 0.1);
}

.stat-card-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--ink);
  line-height: 1.2;
}

.stat-card-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--muted);
}

.stat-card-subtitle {
  font-size: 12px;
  color: var(--muted);
  opacity: 0.7;
}
```

**Step 3: Commit**

```bash
git add components/StatCard.tsx styles/global.css
git commit -m "feat: add StatCard component with icon and trend support"
```

---

## Phase 5: Update Dashboard Page

### Task 12: Refactor Dashboard with New Components

**Files:**

- Modify: `pages/dashboard.tsx`

**Step 1: Import new components**

```tsx
import { Package, Activity, AlertCircle } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { StatCard } from "../components/StatCard";
```

**Step 2: Replace stat cards with StatCard component**

Replace the inline stat cards with:

```tsx
<StatCard
  title="Total pendentes"
  value={pendingTotal}
  subtitle="Fretes aguardando notificação"
  icon={Package}
  loading={isLoading}
/>
<StatCard
  title="Status"
  value="Canal ativo"
  subtitle="Monitorando API em tempo real"
  icon={Activity}
  loading={isLoading}
/>
```

**Step 3: Replace empty state**

Replace "Nenhum frete encontrado" text with EmptyState component:

```tsx
{
  data.length === 0 && !isLoading && (
    <EmptyState
      title="Nenhum frete pendente"
      description="Todos os fretes foram processados."
      icon={Package}
      action={{
        label: "Verificar novamente",
        onClick: handleRefresh,
      }}
    />
  );
}
```

**Step 4: Replace error state**

Replace error text with ErrorState component.

**Step 5: Commit**

```bash
git add pages/dashboard.tsx
git commit -m "feat: refactor dashboard with EmptyState, ErrorState, StatCard"
```

---

## Phase 6: Create New Cargas Page

### Task 13: Rename Table to Cargas and Add Search

**Files:**

- Delete: `pages/table.tsx`
- Create: `pages/cargas.tsx`

**Step 1: Create new cargas page with search**

```tsx
import { useState, useMemo } from "react";
import { Search, Download, Filter, Package } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import Layout from "../components/Layout";
import useSWR from "swr";
import type { CargaRecord } from "@notifica/shared/types";
import { formatDateBR } from "../lib/date-format";

export default function CargasPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [pagination, setPagination] = useState({ limit: 16, offset: 0 });

  const { data, error, isLoading, mutate } = useSWR(
    ["cargas", pagination.limit, pagination.offset],
    () => fetchCargas(pagination),
  );

  const filteredData = useMemo(() => {
    if (!data?.cargas) return [];
    return data.cargas.filter((carga: CargaRecord) => {
      const matchesSearch =
        !searchQuery ||
        carga.origem?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        carga.destino?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        carga.produto?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        carga.id_viagem?.toString().includes(searchQuery);

      const matchesPriority =
        priorityFilter === "all" ||
        getPriorityLevel(carga.prev_coleta) === priorityFilter;

      return matchesSearch && matchesPriority;
    });
  }, [data, searchQuery, priorityFilter]);

  // ... rest of component with search bar, filters, table, mobile cards
}
```

**Step 2: Add responsive table/cards**

Desktop: Full table
Mobile: Card view with key info

**Step 3: Add export CSV functionality**

```tsx
function exportToCSV(cargas: CargaRecord[]) {
  const headers = [
    "Viagem",
    "Origem",
    "Destino",
    "Produto",
    "Equipamento",
    "Previsão",
  ];
  const rows = cargas.map((c) => [
    c.id_viagem,
    c.origem,
    c.destino,
    c.produto,
    c.equipamento,
    c.prev_coleta,
  ]);
  // ... CSV generation and download
}
```

**Step 4: Commit**

```bash
git rm pages/table.tsx
git add pages/cargas.tsx
git commit -m "feat: create new Cargas page with search, filter, export"
```

---

## Phase 7: Update Activity Page

### Task 14: Improve Activity Page Error Handling

**Files:**

- Modify: `pages/activity.tsx`

**Step 1: Add ErrorState component for API errors**

**Step 2: Add EmptyState for no activity**

**Step 3: Commit**

```bash
git add pages/activity.tsx
git commit -m "feat: improve Activity page with EmptyState and ErrorState"
```

---

## Phase 8: Update Status Page

### Task 15: Improve Status Page Error Handling

**Files:**

- Modify: `pages/status.tsx`

**Step 1: Add ErrorState component**

**Step 2: Improve loading states**

**Step 3: Commit**

```bash
git add pages/status.tsx
git commit -m "feat: improve Status page with ErrorState"
```

---

## Phase 9: Final Polish

### Task 16: Run Tests

**Files:**

- All modified files

**Step 1: Run tests**

Run: `bun run test`
Expected: All tests pass

**Step 2: Fix any failures**

**Step 3: Commit**

```bash
git commit -m "test: update tests for UI changes"
```

---

### Task 17: Verify Build

**Step 1: Build project**

Run: `bun run build`
Expected: Build succeeds

**Step 2: Commit**

```bash
git commit -m "chore: verify build passes"
```

---

## Summary of Changes

### Files Deleted:

- `pages/index.tsx` (redirect to dashboard)
- `pages/details.tsx`
- `pages/settings.tsx`
- `pages/profile.tsx`
- `pages/table.tsx` (replaced with cargas.tsx)

### Files Created:

- `styles/base/variables.css`
- `components/EmptyState.tsx`
- `components/ErrorState.tsx`
- `components/StatCard.tsx`
- `pages/cargas.tsx`

### Files Modified:

- `components/Layout.tsx` (navigation with icons)
- `components/BottomNav.tsx` (icons, fewer items)
- `pages/dashboard.tsx` (new components)
- `pages/activity.tsx` (error handling)
- `pages/status.tsx` (error handling)
- `styles/global.css` (import variables, new component styles)
- `package.json` (add lucide-react)

### Navigation Changes:

- Before: 8 items (Visão geral, Painel, Tabela, Detalhes, Status, Configurações, Perfil, Atividade)
- After: 4 items (Painel, Cargas, Status, Atividade)
- Mobile: 3 items (Painel, Cargas, Status)

### UX Improvements:

- Icons throughout (no more emojis or "->")
- Illustrated empty states
- Error states with retry buttons
- Searchable/filterable cargas page
- Responsive mobile card view
- CSV export functionality
