# Frontend Redesign with Tailwind + shadcn/ui

**Date:** 2026-03-06
**Status:** Approved

## Overview

Complete frontend migration from custom CSS to Tailwind CSS + shadcn/ui with a clean, minimal design aesthetic while preserving all existing functionality.

## Goals

1. Modernize UI with Tailwind + shadcn components
2. Improve responsiveness across all devices
3. Add accessible, pre-built UI components
4. Maintain all current features
5. Clean, minimal visual design

## Visual Direction

- **Theme:** Light, clean, minimal design with more white space
- **Color Palette:** shadcn default (zinc/slate) with custom accent color (orange from current theme)
- **Components:** Full shadcn/ui integration

## Tech Stack

- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Accessible component library
- **lucide-react** - Icons (already in use)
- **framer-motion** - Animations (already in use)

## Pages to Redesign

1. **Dashboard** - Stats cards, recent activity summary
2. **Cargas** - Search, filter, table with pagination
3. **Details** - Single carga detailed view
4. **Activity** - Activity log view
5. **Table** - Alternative cargas view
6. **Profile** - User profile
7. **Settings** - App settings
8. **Status** - System status
9. **Login** - Authentication

## shadcn Components to Use

- Button, Input, Select, Badge
- Card, Table, Dialog, Sheet (side panel)
- Dropdown Menu, Checkbox, Switch
- Toast (replace custom), Skeleton
- Form (react-hook-form + zod validation)
- Navigation Menu (top nav)
- Tabs (for different views)

## Design Tokens

```css
/* Current to migrate */
--bg: #0d0f14 → background (light mode: white/zinc-50) --bg-2: #151a23 → muted
  (zinc-100) --ink: #f6f6f4 → foreground (zinc-900) --accent: #ff7a00 → primary
  (custom orange) --danger: #ff4d5a → destructive (red);
```

## Migration Strategy

1. Install Tailwind CSS
2. Initialize shadcn/ui
3. Create design tokens config
4. Migrate layout/components first
5. Page-by-page migration
6. Test responsive behavior

## Feature Preservation

All features to be preserved:

- Dashboard stats display
- Cargas table with search/filter/sort
- Pagination
- Details view with all carga info
- Authentication flow
- Notifications/toasts
- Status page
- Settings page
- Activity log

## Implementation Order

1. Setup: Tailwind + shadcn config
2. Layout: App shell, navigation
3. Dashboard page
4. Cargas page (most complex)
5. Details page
6. Other pages
7. Polish: animations, transitions
