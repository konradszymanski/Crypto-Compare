# Contributing

Thanks for helping improve Crypto-Compare. The project is intentionally small and runs directly in a browser.

## Getting started

1. Fork the repository and create a branch for one focused change.
2. Open `index.html` in a browser or run a local static file server from the repository root.
3. Keep the app usable without a build step unless a future proposal explains why one is needed.

## Before opening a pull request

- Describe the user problem and the behavior you changed.
- Manually check the affected flow in a current desktop browser and a narrow/mobile viewport.
- For API changes, check loading, empty-result, malformed-response, and network-error behavior.
- Avoid committing API credentials, personal data, generated files, or unrelated formatting changes.
- Update the README or relevant docs when setup, behavior, or project structure changes.
- Update `docs/PROJECT_LOG.md` when a release is merged and the deploy result is known.

Run the focused state and formatting checks with `node --test tests/comparison-core.test.js`. There is no automated browser test or lint command yet. If you add tooling, document how to install and run it and keep the setup proportionate to this static project.

## Pull request checklist

- [ ] The change has a clear, focused scope.
- [ ] The main flow and relevant error states were checked manually.
- [ ] Keyboard and screen-reader behavior were considered for interactive UI.
- [ ] Documentation was updated where needed.

