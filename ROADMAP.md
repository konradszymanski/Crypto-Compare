# Roadmap

This roadmap records useful directions for future work. It is not a promise or a fixed release plan; feature proposals should be scoped around user needs.

## Foundations

- [x] Document the project, data flow, contribution workflow, and security notes.
- [x] Make coin search independent of the current top-market results and handle common search failures.
- [x] Prevent duplicate comparison entries and let users remove selected coins.
- [x] Keep comparison readable on small screens and clarify displayed units.
- [ ] Add automated browser checks for search behavior and responsive rendering.
- [ ] Separate API access, formatting, and UI state when a feature makes the current single script difficult to maintain.

## Candidate features

- [ ] Select a display currency and make the selected currency visible in the table.
- [ ] Add sortable fields and clearer formatting for percentages and missing supply values.
- [ ] Add keyboard navigation and richer screen-reader feedback for search suggestions.
- [ ] Persist a user's selected coins locally, with a clear way to reset them.
- [ ] Add data freshness indicators and a deliberate refresh action.

## Product questions for later

- Which comparison fields matter most, and should users be able to choose them?
- Should selections persist across visits or be shareable as a link?
- Which currencies and locales should be supported first?
- What browser support and accessibility target should guide UI work?

