# Admin UI Demo Guide

## Goal
Show the redesigned admin panel as a production-ready demo, not just source code.

## Pre-check
1. Use Node 20:
```bash
nvm use 20
```
2. Install deps:
```bash
yarn install
```
3. Start app:
```bash
yarn workspace @event/admin dev
```
4. Verify quality:
```bash
yarn workspace @event/admin typecheck
yarn workspace @event/admin lint
yarn workspace @event/admin build
```

## Demo Storyboard (record in this order)
1. Login flow
- Open `/login`
- Show OTP email flow UI states

2. Dashboard
- Show system status card
- Show quick-links grid
- Show responsive behavior (desktop -> mobile width)

3. Events
- Switch organization
- Open event details
- Edit title/description and show markdown preview

4. Attendees
- Switch list/table view
- Open attendee drawer
- Reorder rows, set row color

5. Waitlist + Stats + Actions
- Open each section
- Show KPI cards in stats
- Show action buttons and state messages

6. Organizations
- Create/edit org form blocks
- Members table actions (role change/remove)

7. Theme
- Toggle light/dark theme
- Refresh page and confirm theme persists

## Required Media
Store all media in `docs/demo-assets/`.

### GIFs
- `docs/demo-assets/gifs/01-dashboard.gif`
- `docs/demo-assets/gifs/02-events.gif`
- `docs/demo-assets/gifs/03-attendees-table.gif`
- `docs/demo-assets/gifs/04-organizations.gif`
- `docs/demo-assets/gifs/05-theme-toggle.gif`

### Screenshots
- `docs/demo-assets/screens/dashboard-light.png`
- `docs/demo-assets/screens/dashboard-dark.png`
- `docs/demo-assets/screens/events.png`
- `docs/demo-assets/screens/attendees-table.png`
- `docs/demo-assets/screens/organizations.png`
- `docs/demo-assets/screens/login.png`

## Recording Tips
- Keep each GIF 8-20 seconds.
- Use consistent window size (1366x768).
- Hide devtool panels and local notifications.
- Prefer 12-16 FPS for smaller file size.

## Acceptance Checklist
- [ ] CI badge is green on main branch
- [ ] README contains demo section and launch instructions
- [ ] GIFs and screenshots are committed under `docs/demo-assets/`
- [ ] All commands in README were re-tested after latest changes
