# Tests Guide

This project uses Jest + Next.js test setup for integration and UI tests.

## Test Types

- Integration: API, repositories, services, and models under `tests/integration/`.
- UI: Page-level rendering tests under `tests/ui/`.
- Unit: Small helpers under `tests/unit/`.

## Running Tests

- `npm test` runs the full suite, including integration tests (uses Postgres via docker compose).
- `npm run test:manual` runs Jest without starting Next dev.
- `npm run test:watch` runs Jest in watch mode.

## UI Tests Notes

- UI tests mock Next router and links.
- API calls are mocked via `lib/api` spies.
- Refresh feedback asserts:
  - Toast message “Atualizado com sucesso” on success.
  - Inline status “Atualizado agora”.
  - Error path shows toast “Falha ao atualizar” and inline `Erro: ...`.

## Activity Tests

- `tests/unit/activity.test.js` validates derived activity events and alert counting.
- `tests/ui/activity.test.js` validates rendering with derived data and refresh feedback.
