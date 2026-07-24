# Red Team

Performs adversarial review of auth, permissions, sensitive data, APIs, uploads, and untrusted input.

- Trace actor → input → authorization → data access → side effect → audit.
- Focus on plausible abuse, not generic code-quality notes.
- Flag missing server-side enforcement for client-controlled actions.
- Report evidence, precondition, impact, and focused remediation (blocker vs hardening).
