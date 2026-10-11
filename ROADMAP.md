# Roadmap

This roadmap records useful directions for future work. It is not a promise or a fixed release plan; feature proposals should be scoped around user needs.

## Product direction

- Focus on research tools that put crypto prices in historical-cycle and sourced macro-event context.
- Keep the app free and static, with no backend or client-side secrets; prefer public data and browser-side caching.
- Present curated, source-linked events as context for price movements, not as proof of causation.
- A personal portfolio tracker is outside the current product scope.

## Foundations

- [x] Document the project, data flow, contribution workflow, and security notes.
- [x] Make coin search independent of the current top-market results and handle common search failures.
- [x] Prevent duplicate comparison entries and let users remove selected coins.
- [x] Keep comparison readable on small screens and clarify displayed units.
- [ ] Add automated browser checks for search behavior and responsive rendering.
- [ ] Separate API access, formatting, and UI state when a feature makes the current single script difficult to maintain.

## Candidate features

- [x] Add a market overview with global capitalization, volume, BTC/ETH dominance, top assets, and ATH drawdown context.
- [x] Add a sourced historical event timeline with BTC price-window comparisons and clear non-causal framing.
- [x] Select a display currency and make the selected currency visible in the table.
- [ ] Add sortable fields and clearer formatting for percentages and missing supply values.
- [ ] Add keyboard navigation and richer screen-reader feedback for search suggestions.
- [ ] Persist a user's selected coins locally, with a clear way to reset them.
- [x] Add data freshness indicators and a deliberate refresh action.
- [ ] Expand the reviewed, source-linked historical events catalogue and add macro context that can be served without introducing paid data or client-side secrets.
- [ ] Add asset research pages with category context, supply history, and cycle-aware performance comparisons.

## Product questions for later

- Which comparison fields matter most, and should users be able to choose them?
- Should selections persist across visits or be shareable as a link?
- What browser support and accessibility target should guide UI work?

