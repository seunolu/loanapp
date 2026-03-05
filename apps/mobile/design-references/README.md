# Mobile Design References

This directory stores screenshot references for the mobile app. Treat screenshots in `apps/mobile/design-references/fintech/**` as UI truth. If a screenshot conflicts with an existing component, token, or older mock, follow the screenshot and update the docs before changing app code.

## Folder Map

- `fintech/onboarding`: first-run flows, welcome screens, permissions, phone/email entry, verification intro, and account setup.
- `fintech/home`: dashboard surfaces, balance cards, quick actions, summary widgets, and any primary landing screen state.
- `fintech/transactions`: transaction lists, filters, transaction detail views, receipts, and search/history states.
- `fintech/loans`: loan discovery, eligibility, application steps, offers, loan summary, and approval states.
- `fintech/repay`: repayment schedules, amount entry, repayment confirmation, autopay, and overdue states.
- `fintech/notifications`: inbox, activity feed, alerts, reminders, read/unread behavior, and notification detail screens.
- `fintech/support`: help center, contact support, FAQ, chat, escalation, and issue resolution flows.
- `fintech/profile-settings`: profile, account settings, security settings, preferences, linked accounts, and sign-out/account management flows.

## How To Use This Directory

- Drop each screenshot into the closest matching folder above.
- Keep multiple screenshots for the same flow together so Codex can infer transitions and state changes.
- Use filenames that describe the screen or state, for example `home-balance-card.png` or `repay-overdue-empty-state.png`.
- If a screenshot spans more than one domain, store it where the primary task lives and mention the overlap in the next implementation task.

## UI Rules Codex Must Follow

- Screenshot-first: screenshots override assumptions, generic fintech patterns, and older code when they disagree.
- Spacing scale: use the existing mobile spacing tokens only: `xxs=2`, `xs=6`, `sm=10`, `md=14`, `lg=18`, `xl=24`, `xxl=32`, `xxxl=40`. Do not introduce ad hoc spacing values unless the screenshot clearly forces it.
- Card style: default cards are surface panels with a 1px border, `lg` radius, and `lg` internal padding. Use subtle depth only when the screenshot reads as elevated, and keep shadows to `sm` or `md`.
- Typography hierarchy: use a clear ladder. Hero or high-emphasis headings use `display`, `h1`, or `title`; standard screen headings use `h2` or `subtitle`; primary copy uses `body`; secondary copy uses `bodyMuted`; metadata and helper text use `caption`.
- Button sizes: keep touch targets substantial. Existing button heights are `sm=42`, `md=46`, `lg=50`. Use `md` by default, `lg` for primary bottom actions, and `sm` only for compact contexts shown in the screenshots.
- Icon usage: icons should support navigation, status, or comprehension. Header icon buttons stay in 36x36 containers, list rows use one trailing affordance icon, and decorative icons should be rare unless the screenshots make them part of the visual system.
- Empty states: use a centered, calm layout with one simple icon container, a short title, brief supporting copy, and one secondary CTA unless the screenshot shows a different priority.

For implementation detail, use [UI_RULES.md](/C:/dev/loanapp/apps/mobile/src/ui/UI_RULES.md).
