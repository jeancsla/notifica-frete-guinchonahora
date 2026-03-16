# Task: Security and Quality Improvement Implementation

## Completed Changes

### Database & Security

- [x] Modified `apps/api/src/infra/database.ts`
  - Removed hardcoded `app.current_role=api` from connection options
  - Added `setSessionRole()` utility function to set role per transaction/session
  - Added `resetSessionRole()` utility to reset role
  - Added `withTransactionAndRole()` for convenience

### API Data Validation

- [x] Created new `apps/api/src/lib/schemas.ts`
  - Reusable Zod schemas for Carga, Login, and Pagination
  - Helper functions for formatting Zod errors
  - `parseQueryParams()` utility for safe query parsing

- [x] Modified `apps/api/src/controllers/auth-controller.ts`
  - Refactored body validation to use Zod
  - Improved error messages for bad credentials with detailed validation info

- [x] Modified `apps/api/src/controllers/cargas/validators.ts`
  - Replaced manual parsing with Zod schema validation
  - Now uses `ListCargasQuerySchema` from lib/schemas

### Frontend UI/UX

- [x] Modified `pages/dashboard.tsx`
  - Fixed mobile overlay behavior with proper backdrop
  - Enhanced scroll locking to prevent layout shift using scrollbar width calculation
  - Improved accessibility with better keyboard handling (Escape key)
  - Added `role="complementary"` and `aria-label` to detail panel

- [x] Modified `components/Layout.tsx`
  - Enhanced accessibility with better ARIA labels
  - Fixed z-index conflicts between mobile navigation and content
  - Added `aria-current="page"` for active navigation items
  - Improved skip link accessibility

- [x] Modified `components/BottomNav.tsx`
  - Fixed z-index from z-[1000] to z-40 to prevent conflicts
  - Added better ARIA labels with current page indication
  - Added focus-visible ring for keyboard navigation

## Verification Plan

### Automated Tests (Pending - WSL path issues)

- [ ] API Integration Tests: Run `bun run test:integration:api`
- [ ] New Zod Validation Tests: Add unit tests for the new Zod schemas
- [ ] Auth Flow Test: Run `tests/integration/api/v1/cargas/auth.test.ts`

### Manual Verification

- [ ] Responsive Audit: Open the dashboard and check layout from 320px to 1440px
- [ ] Mobile Navigation: Verify BottomNav doesn't overlap important buttons
- [ ] Mobile Detail Panel: Verify backdrop correctly closes the detail panel
- [ ] Login Rate Limit: Attempt multiple failed logins to verify block behavior

## Review

All planned security and quality improvements have been implemented:

1. **Database RLS**: Moved role setting from connection pool level to per-request using new utility functions
2. **Zod Validation**: Centralized schemas in lib/schemas with proper error formatting
3. **Auth Improvements**: Login now uses Zod for validation with better error messages
4. **UI/UX Fixes**: Improved mobile overlay behavior, scroll locking, and accessibility throughout
