# Security

Crypto-Compare is a static client-side application. It makes browser requests to CoinGecko and does not currently have a backend or a place to store secrets.

## Reporting a vulnerability

Please report suspected security issues privately to the repository owner through GitHub's security advisory or private vulnerability reporting feature, if enabled. Include the affected page or file, steps to reproduce, and potential impact. Avoid publishing exploit details before the owner has had a chance to investigate.

## Data handling notes

- Do not add API keys or other secrets to files served to the browser; client-side values are public.
- Treat API responses as untrusted input. Use text APIs for user-visible labels and validate URLs before using them as resource sources.
- Keep third-party dependencies and permissions minimal if they are introduced later.

