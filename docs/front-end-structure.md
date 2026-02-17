# Front-end Structure

This document describes the UI structure created for the read-only dashboard.

## Pages
- `pages/index.js` Overview landing.
- `pages/dashboard.js` Priority queue (notified=false) with cards and quick detail.
- `pages/table.js` Full list table with pagination.
- `pages/details.js` Selectable details for a single carga.
- `pages/status.js` Backend/database health.
- `pages/settings.js` Read-only settings summary.
- `pages/profile.js` Operator profile details.
- `pages/activity.js` Operational timeline.

## Shared Layout
- `components/Layout.js` provides the shell, sidebar navigation, and topbar actions.

## API Layer
- `lib/api.js` centralizes `fetchCargas` and `fetchStatus`.
- All data is read-only; no forms are included.
- Pages call APIs and provide an `Atualizar` button to refresh.

## Styling
- `styles/global.css` defines the bold direction: gradients, high contrast, strong typography.
- Uses Space Grotesk + IBM Plex Mono.

## Tests
- `tests/ui/*.test.js` cover the new pages with mocked API data.
