# Security Policy

## Supported Versions

We actively support the following versions of Database Handler CLI:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

The Database Handler CLI team takes security vulnerabilities seriously. We appreciate your efforts to responsibly disclose your findings.

### How to Report

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to:
- **Email**: [romaintibo6@gmail.com](mailto:romaintibo6@gmail.com)
- **Subject**: [SECURITY] Brief description of the issue

### What to Include

To help us better understand and resolve the issue, please include as much of the following information as possible:

- **Type of vulnerability** (e.g., SQL injection, command injection, etc.)
- **Full paths of affected source files**
- **Location of the affected code** (tag/branch/commit or direct URL)
- **Step-by-step instructions to reproduce** the issue
- **Proof-of-concept or exploit code** (if possible)
- **Impact of the vulnerability** and how it could be exploited
- **Any potential fixes** you've identified

### Response Timeline

- **Initial Response**: Within 48 hours of receiving your report
- **Assessment**: Within 7 days, we'll provide an assessment of the issue
- **Fix Timeline**: We aim to release patches for confirmed vulnerabilities within 30 days
- **Disclosure**: We'll coordinate with you on the public disclosure timeline

### What to Expect

1. **Acknowledgment**: We'll acknowledge receipt of your report
2. **Investigation**: We'll investigate and validate the vulnerability
3. **Updates**: We'll keep you informed of our progress
4. **Resolution**: Once fixed, we'll notify you and coordinate disclosure
5. **Credit**: With your permission, we'll credit you in the release notes

## Security Best Practices

When using Database Handler CLI in production:

### Database Credentials

- **Never commit** database credentials to version control
- **Use `.env` files** that are properly gitignored
- **Rotate credentials** regularly
- **Use read-only accounts** when possible for dump operations
- **Limit permissions** to only what's necessary

### Network Security

- **Use SSL/TLS** for database connections in production
- **Firewall rules** should restrict database access
- **VPN/Bastion hosts** for sensitive environments

### Dump File Security

- **Encrypt backups** containing sensitive data
- **Secure storage** for backup files (proper permissions)
- **Regular cleanup** of old dumps
- **Access control** on the `backups/` directory

### Docker Usage

- **Don't use** `network_mode: host` in production
- **Isolate containers** with proper networking
- **Update base images** regularly
- **Scan for vulnerabilities** in dependencies

## Known Security Considerations

### `session_replication_role = 'replica'`

The tool uses `SET session_replication_role = 'replica'` to temporarily disable foreign key constraints during imports. This requires:

- Appropriate PostgreSQL user permissions
- Trust in the imported SQL content
- Awareness that constraint validation is bypassed

**Mitigation**: Only import dumps from trusted sources, preferably those you've created yourself with this tool.

### SQL Injection

The tool is designed to prevent SQL injection:
- Uses parameterized queries via Kysely
- Properly escapes identifiers and values
- Avoids dynamic SQL construction from user input

However, when importing SQL dumps, the tool executes raw SQL. **Only import dumps from trusted sources.**

## Security Updates

Security patches are released as minor version updates. To stay protected:

```bash
npm update -g database-handler-cli
```

Check for updates regularly:
```bash
npm outdated -g database-handler-cli
```

## Dependencies

We regularly audit and update our dependencies for known vulnerabilities. Major dependencies:

- `kysely` - SQL query builder with parameterized queries
- `pg` - PostgreSQL driver
- `inquirer` - CLI prompts (no security-critical operations)
- `chalk` - Terminal styling (no security implications)

## Disclosure Policy

We follow coordinated vulnerability disclosure:

1. Security issues are fixed in a private repository
2. A security advisory is prepared
3. Patches are released
4. Public disclosure is made after fixes are available
5. Credit is given to the reporter (unless they prefer anonymity)

## Security Hall of Fame

We appreciate the following individuals for responsibly disclosing security issues:

- *No vulnerabilities reported yet*

Thank you for helping keep Database Handler CLI and its users safe!
