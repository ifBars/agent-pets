# Security Policy

Agent Pets is local-first desktop software. Its default behavior is to read local pet packages, local Codex session metadata, and optional local status JSON files.

## Supported Versions

Security fixes target the latest released version.

## Reporting A Vulnerability

Open a private security advisory on GitHub when the repository is published, or contact the maintainer privately before disclosing exploit details.

Please include:

- affected version or commit
- operating system
- reproduction steps
- expected impact
- whether a crafted pet package or status file is involved

## Security Boundaries

- Pet packages are data only.
- Agent Pets does not execute code from pet packages.
- `spritesheetPath` is constrained to the pet package folder.
- Agent status integrations are local file reads unless a future provider explicitly documents otherwise.
- The app does not upload prompts, source code, session logs, pet files, or status files.

## Out Of Scope

- Visual quality issues in generated pets unless they create a parser, path traversal, or execution risk.
- Denial of service from extremely large local files outside documented package formats.
- Vulnerabilities in unsupported forks or modified builds.
