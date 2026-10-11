# Contributing

Thanks for helping improve Crypto-Compare. It is a static, multi-page site built with Vite and deployed to GitHub Pages.

## Getting started

1. Fork the repository and create a branch for one focused change.
2. Use Node.js 20.19+ or 22.12+, run `npm ci`, and start the Vite development server with `npm run dev`.
3. Keep the app static and compatible with GitHub Pages. Production output is generated in `dist/`; do not commit that generated folder.

## Before opening a pull request

- Describe the user problem and the behavior you changed.
- Manually check the affected flow in a current desktop browser and a narrow/mobile viewport.
- For API changes, check loading, empty-result, malformed-response, and network-error behavior.
- Avoid committing API credentials, personal data, generated files, or unrelated formatting changes.
- Update the README or relevant docs when setup, behavior, or project structure changes.
- Update `docs/PROJECT_LOG.md` when a release is merged and the deploy result is known.

Run `npm test` for state and formatting checks, then run `npm run build` and `npm run test:e2e` to check the generated production output with Playwright. If you add tooling, document how to install and run it and keep the setup proportionate to this static project.

## Pull request checklist

- [ ] The change has a clear, focused scope.
- [ ] The main flow and relevant error states were checked manually.
- [ ] Keyboard and screen-reader behavior were considered for interactive UI.
- [ ] Documentation was updated where needed.

