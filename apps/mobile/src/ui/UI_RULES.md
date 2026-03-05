# Mobile UI Rules

These rules convert the screenshot references in `apps/mobile/design-references/fintech/**` into implementation guidance for the existing mobile UI system.

## Source Of Truth

- Screenshots are the final visual source of truth.
- Existing tokens and primitives are the default implementation path when they match the screenshots.
- If screenshots and current components disagree, preserve the screenshot behavior and update the component later instead of forcing the screen into the old pattern.

## Layout Grid And Spacing Tokens

Use the spacing tokens from `apps/mobile/src/ui/tokens/spacing.ts`:

- `xxs`: 2
- `xs`: 6
- `sm`: 10
- `md`: 14
- `lg`: 18
- `xl`: 24
- `xxl`: 32
- `xxxl`: 40

Rules:

- Use token values only for padding, gap, and vertical rhythm.
- Standard screen horizontal padding is `md`.
- Use `sm` or `md` between tightly related items inside a block.
- Use `lg` for card padding and between grouped controls.
- Use `xl` or `xxl` to separate major sections.
- Reserve `xxxl` for hero spacing or unusually airy screenshot layouts.

## Typography

Use the variants from `apps/mobile/src/ui/tokens/typography.ts`.

- Titles: use `h2` for compact screen headers and `title` for prominent in-screen headings. Reserve `h1` or `display` for hero moments only.
- Subtitles: use `subtitle` for section headings and high-emphasis labels under the primary title tier.
- Body: use `body` for primary content and `bodyMuted` for secondary explanation or supporting text.
- Caption: use `caption` for metadata, timestamps, helper copy, chips, and row sublabels.
- Button labels: use `button` only inside buttons and high-emphasis CTAs.

## List Rows Pattern

Match `apps/mobile/src/ui/components/ListRow.tsx`.

- Rows are horizontal, vertically centered, and use `md` vertical padding.
- Keep a `sm` gap between content groups.
- Left side contains the primary label and optional secondary caption.
- Optional right-side value uses `caption` and muted color.
- Use one trailing affordance icon, typically a chevron, when the row navigates.
- Keep the full row pressable for navigational rows.
- Use a bottom divider by default unless the screenshot shows grouped cards instead of list separators.

## Card Pattern

Match `apps/mobile/src/ui/components/Card.tsx` unless a screenshot clearly requires a different treatment.

- Background uses the surface color.
- Border is visible at 1px.
- Radius uses `lg`.
- Internal padding uses `lg`.
- Use stacked content with token-based gaps rather than manually positioned children.
- Add only subtle elevation. Prefer flat bordered cards; use `shadows.sm` or `shadows.md` only when the screenshot reads as elevated.

## Header Pattern

Two header patterns already exist and should remain the default.

### TopNav

Use `apps/mobile/src/ui/components/TopNav.tsx` for detail flows and left-aligned titles.

- Back button is optional.
- Back and right action containers are 36x36.
- Header copy is left aligned.
- Title uses `subtitle`; supporting line uses `caption`.
- Vertical padding is compact, with `sm` rhythm.

### ScreenHeader

Use `apps/mobile/src/ui/screen/ScreenHeader.tsx` for primary screens and centered navigation titles.

- Respect safe-area top inset.
- Horizontal padding is `md`.
- Top and bottom rhythm uses `sm`.
- Left and right action slots remain visually balanced, with 36x36 control space.
- Title uses `h2`; supporting line uses `caption`.
- Divider is optional and should appear only when the screenshot shows a header boundary.

## CTA Pattern

Match `apps/mobile/src/ui/components/Button.tsx`.

- Primary CTA: filled action, default size `md`, full width for the main screen action, and `lg` when the screenshot shows a bottom-anchored or especially prominent CTA.
- Secondary CTA: surface button with border, used for alternate actions, empty states, and lower-emphasis follow-ups.
- `sm` button size is for dense layouts only.
- Keep label copy short and action-oriented.
- Do not place more than one visually dominant primary CTA in the same viewport unless the screenshot explicitly does so.

Current button heights:

- `sm`: 42
- `md`: 46
- `lg`: 50

## Loading, Error, And Empty Patterns

Use the feedback primitives under `apps/mobile/src/ui/feedback`.

- Loading: use inline loading for in-place refreshes, skeletons when the structure is known, and full-screen loading only for initial screen boot or blocking transitions.
- Error: use a centered bordered container with concise title and recovery copy. Use a single retry action unless the screenshot requires escalation choices.
- Empty: use a neutral centered state with one icon container, `h2` title, muted body copy, and one secondary CTA by default.
- Keep status messaging short. The visual hierarchy should explain the state before the user reads every line.

## Icon Usage

- Use icons to support navigation, state, or recognition, not as decoration filler.
- Header controls use 36x36 icon buttons.
- Empty-state icon containers can expand to 48x48 when the design needs a focal badge.
- Prefer one icon per actionable row or card edge, not repeated icon noise across every text line.
