# Dashboard Redesign Implementation

## Overview

This document describes the dashboard redesign implementation that was completed to improve clarity and organization by removing misleading terminology.

## Changes Made

### 1. Terminology Updates

- Removed "fila" (queue) terminology - this is just a list of freights, not a queue
- Changed "Em fila" to "Total pendentes" (Total pending)
- Changed "Fila principal" to "Fretes pendentes" (Pending freights)
- Removed "Reset fila" button (not applicable without queue concept)
- Removed "Ritmo" card entirely

### 2. New Layout

#### Stats Cards (2 cards instead of 3)

1. **Total pendentes** - Shows `pagination.total`
   - Subtitle: "Fretes aguardando notificacao"
2. **Status** - Shows "Canal ativo"
   - Subtitle: "Monitorando API em tempo real"

#### Table Section

- Title: "Fretes pendentes"
- Show count: "Exibindo X-Y de Z fretes"
- Columns:
  - Viagem
  - Origem
  - Destino
  - Produto
  - Previsao
  - Criado em (NEW - shows created_at formatted)
- Sorted by: created_at DESC (newest first) - handled by repository

#### Detail View

- Kept existing detail view
- Shows all fields of selected freight

### 3. Environment Variable for Migrations

The "Rodar migrations" button is now controlled by the `ALLOW_PRODUCTION_MIGRATIONS` environment variable:

- Set `ALLOW_PRODUCTION_MIGRATIONS=true` to show the button
- Button is hidden by default (safer for production)

## Files Modified

1. `pages/dashboard.js` - Main dashboard page with new layout and conditional migrations button
2. `tests/ui/dashboard.test.js` - Updated tests with new assertions for migrations button visibility

## Technical Details

### Sorting

Data is sorted by `created_at DESC` in the repository layer (`repositories/cargas-repository.js` method `findNotNotified`).

### Date Formatting

Two helper functions were added:

- `formatDate()` - Formats date as DD/MM/YY (for previsao column)
- `formatDateTime()` - Formats date as DD/MM, HH:MM (for created_at column)

### Environment Variable Handling

The `ALLOW_PRODUCTION_MIGRATIONS` env var is read in `getServerSideProps` and passed as a prop to the Dashboard component. This allows the UI to react to server-side configuration.

## Visual Structure

```
[Header: Dashboard - Fretes pendentes de notificacao]
[Actions: Atualizar | Rodar migrations* | Status: Atualizado agora]
                     *only if ALLOW_PRODUCTION_MIGRATIONS=true

[Stats Grid]
┌─────────────────┬─────────────────┐
│ Total pendentes │ Status          │
│ 42              │ Canal ativo     │
│ Fretes          │ Monitorando API │
│ aguardando      │ em tempo real   │
│ notificacao     │                 │
└─────────────────┴─────────────────┘

[Table Section]
┌──────────────────────────────────────────────────────────────────────────┐
│ Fretes pendentes                                           Exibindo 1-10 │
├──────────┬────────┬─────────┬──────────┬───────────┬─────────────────────┤
│ Viagem   │ Origem │ Destino │ Produto  │ Previsao  │ Criado em           │
├──────────┼────────┼─────────┼──────────┼───────────┼─────────────────────┤
│ 12345    │ SP     │ RJ      │ Cimento  │ 18/02/26  │ 17/02, 14:30        │
│ 12344    │ MG     │ SP      │ Areia    │ 19/02/26  │ 17/02, 13:15        │
└──────────┴────────┴─────────┴──────────┴───────────┴─────────────────────┘
[Anterior] [Proxima]

[Detail Section]
┌─────────────────────┐
│ Detalhe rapido      │
├─────────────────────┤
│ Viagem: 12345       │
│ Origem: SP          │
│ Destino: RJ         │
│ Produto: Cimento    │
│ Equipamento: Truck  │
│ Previsao: 2026-02-20│
│ Frete: R$ 5.000,00  │
└─────────────────────┘
```
