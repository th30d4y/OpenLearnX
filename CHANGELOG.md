# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.1] - 2026-11-22

Security-hardening release. It removes insecure authentication fallbacks and
fixes several account-takeover and sandbox-escape issues tracked in the
project's GitHub Security Advisories. Because identity-header and unsigned
wallet-login authentication paths are removed, this is a breaking change and
ships as a major version.

### Security
- **CRITICAL — Wallet login signature verification bypass → full account takeover (GHSA-6jh7-q9mf-9p28).**
  `verify_wallet_signature` was a stub that accepted any signature. Replaced
  with real `ecrecover`-based verification, so only the holder of a wallet's
  private key can authenticate as that wallet.
- **HIGH — Client-controlled identity header authentication bypass (GHSA-p7p9-jc8p-p38m).**
  Endpoints trusted attacker-supplied `X-Wallet-Address` / `X-User-ID` headers.
  Added an auth gate to `mark_lesson_complete` and removed header-derived identity.
- **HIGH — Unauthenticated header fallback after JWT failure (GHSA-fhwv-x9rc-w3qw).**
  `verify_wallet_authentication()` fell back to an unauthenticated identity
  header once JWT verification failed. The fallback is removed.
- **HIGH — Python sandbox validator bypass (GHSA-rw3v-xxwg-3p4g; residual of CVE-2026-41900).**
  Blocked the `__builtins__.__dict__['__import__']` indirection that reached
  subprocess execution in the code-execution environment.
- **P1 hardening sweep.** Removed credential logging, replaced weak hashing,
  moved to constant-time token comparison, and eliminated fallback identity paths.

### Changed
- **Breaking:** identity-header and unsigned wallet-login authentication paths
  are removed. Authenticate with a verified JWT or a signed wallet nonce.

### Fixed
- Chat history: keep failed history ranges available for retry and reconcile
  optimistic sends when retrying.

### Build
- Bumped `github/codeql-action` 4.39.0 → 4.39.3 (Dependabot).

## [2.0.4] - 2026-05-08

### Security
- **CRITICAL**: Fixed JWT signature verification vulnerability (GHSA-223g-f5mq-gw33)
  - Enabled proper JWT signature verification in `backend/routes/dashboard.py`
  - Enabled proper JWT signature verification in `backend/main.py`
  - Enabled proper JWT signature verification in `backend/activity_logger.py`
  - Replaced `verify_signature=False` with cryptographic verification using `JWT_SECRET_KEY`
  - Prevents JWT forgery attacks and unauthorized account takeover
  - CVE: Pending

### Changed
- JWT tokens are now verified with the server's secret key
- Forged tokens will be properly rejected with authentication errors

## [2.0.3] - 2026-04-15

### Added
- Initial release with adaptive quizzes
- AI-powered course recommendations
- Code compilation and practice features
- Dashboard analytics
- MetaMask wallet integration
- Certificate NFT generation

