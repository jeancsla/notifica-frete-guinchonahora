# UX/UI Improvement Plan - Refined

## Screenshots Captured

- `login-page.png` - Login with emoji mobile nav (📊 📋 🟢 ⚡)
- `visao-geral-page.png` - Static landing page (redundant)
- `dashboard-page.png` - Main dashboard with errors, empty states
- `tabela-page.png` - Table page, no search/filter
- `details-page.png` - Redundant detail view
- `status-page.png` - Status with failed loads
- `settings-page.png` - **NON-FUNCTIONAL** - static display only
- `profile-page.png` - **NON-FUNCTIONAL** - hardcoded fake data
- `activity-page.png` - Empty timeline, error state

---

## Critical Issues Found

### 1. Navigation (8 items → should be 4)

**Current:**

- Visão geral, Painel, Tabela, Detalhes, Status, Configurações, Perfil, Atividade

**Problem:**

- Visão geral = static marketing page with no data
- Painel = actual dashboard (these should merge)
- Tabela = table without search/filter
- Detalhes = duplicate of Painel's side panel
- Configurações = read-only static display
- Perfil = fake hardcoded data ("operacoes@guinchonahora.com", "+55 11 99999-9999")

### 2. Every Page Has "Erro: Internal server error"

All pages show errors because API is failing. Need better error states.

### 3. Empty States Are Ugly

Just plain text: "Nenhum frete encontrado." / "Nenhuma carga encontrada."

### 4. No Icons

- Navigation uses "->" text arrows
- Mobile uses emojis (📊 📋 🟢 ⚡)

### 5. Tables Have No Features

- No search
- No filtering
- No sorting
- No export

---

## Revised Implementation Plan

### Phase 1: Navigation Cleanup (Do This First)

**Delete/Merge Pages:**

1. **Remove** `/pages/index.tsx` (Visão geral) → Redirect to /dashboard
2. **Remove** `/pages/details.tsx` (Detalhes) → Already in dashboard panel
3. **Remove** `/pages/settings.tsx` (Configurações) → Non-functional
4. **Remove** `/pages/profile.tsx` (Perfil) → Fake data
5. **Rename** `/pages/table.tsx` → `/pages/cargas.tsx` with new design

**New Navigation (4 items):**

```
Painel (/)
Cargas (/cargas)
Status (/status)
Atividade (/atividade)
```

**Mobile nav (3 items):**

- Painel, Cargas, Status

### Phase 2: Add Icons + CSS Cleanup

**Install Lucide:**

```bash
bun add lucide-react
```

**Replace:**

- "->" arrows with ChevronRight icons
- Mobile emojis with: LayoutDashboard, Table, Activity, Settings

**Split CSS:**

- `styles/base/variables.css` - Colors, spacing, shadows
- `styles/components/layout.css` - Sidebar, nav
- `styles/components/cards.css` - Cards, stats
- `styles/components/tables.css` - Tables
- `styles/components/forms.css` - Buttons, inputs

### Phase 3: Dashboard Improvements

**Fix Error States:**

- Illustrated error card with retry button
- Not just red text

**Fix Empty States:**

```
┌─────────────────────────────────┐
│     [Package icon]              │
│   Nenhum frete pendente         │
│   Todos os fretes foram         │
│   processados.                  │
│                                 │
│   [Verificar novamente]         │
└─────────────────────────────────┘
```

**Stat Cards:**

- Add icons (Package, Bell, Clock)
- Better number formatting
- Loading skeletons

### Phase 4: New Cargas Page

**Features:**

- **Search bar** (full-text across origem, destino, produto)
- **Filters:** Prioridade (tags), Date range
- **Sort:** Click column headers
- **Export CSV** button
- **Mobile:** Card view instead of horizontal scroll

```
Desktop:
┌─────────────────────────────────────────────────────────┐
│ [Search...]     [Prioridade ▼] [Data ▼]    [Exportar]  │
├─────────────────────────────────────────────────────────┤
│ Viagem │ Origem │ Destino │ Produto │ Prioridade │ ... │
├─────────────────────────────────────────────────────────┤
│ 12345  │ SP     │ RJ      │ Eletr   │ [Critica]  │ ... │
└─────────────────────────────────────────────────────────┘

Mobile:
┌─────────────────────────────┐
│ [Search...]                 │
│ [Critica ▼] [Hoje ▼]        │
├─────────────────────────────┤
│ #12345              [Crit]  │
│ São Paulo → Rio             │
│ Eletrônicos                 │
│ Prev: Hoje 14:00            │
├─────────────────────────────┤
│ #12346              [Alta]  │
│ ...                         │
└─────────────────────────────┘
```

### Phase 5: Polish

**Toast Improvements:**

- Add icons (Check, X, Info)
- Progress bar for auto-dismiss
- Better positioning (top-right)

**Keyboard Shortcuts:**

- `/` - Focus search
- `r` - Refresh
- `?` - Show shortcuts

---

## Files to Modify/Create

### Delete:

- `pages/index.tsx` → redirect
- `pages/details.tsx`
- `pages/settings.tsx`
- `pages/profile.tsx`

### Rename/Recreate:

- `pages/table.tsx` → `pages/cargas.tsx` (new design)

### Modify:

- `components/Layout.tsx` - New nav, icons
- `components/BottomNav.tsx` - Icons, fewer items
- `pages/dashboard.tsx` - Better empty/error states
- `pages/status.tsx` - Better error state
- `pages/activity.tsx` - Remove or fix timeline
- `styles/global.css` - Split into modules

### Create:

- `styles/base/variables.css`
- `styles/components/*.css`
- `components/EmptyState.tsx`
- `components/ErrorState.tsx`
- `components/StatCard.tsx`
- `components/SearchBar.tsx`

---

## Quick Wins (Do These Now)

1. **Add Lucide icons** - Biggest visual improvement
2. **Remove 4 dead pages** - Immediately less confusing
3. **Fix empty states** - Simple illustrated component
4. **Fix error states** - Retry button, better design

---

## Design System

### Keep Current Colors:

```css
--bg: #0d0f14 --bg-2: #151a23 --card: #121720 --ink: #f6f3ea --muted: #a7afbe
  --accent: #ff7a00 --accent-2: #00e0a4 --danger: #ff4d5a --stroke: #2b3445;
```

### Add:

```css
--success: #22c55e --warning: #f59e0b --info: #3b82f6;
```

### Spacing:

```css
--space-1: 4px --space-2: 8px --space-3: 12px --space-4: 16px --space-5: 20px
  --space-6: 24px;
```
