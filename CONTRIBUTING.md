# Contributing to Database Handler CLI

First off, thank you for considering contributing to Database Handler CLI! It's people like you that make this tool better for everyone.

## 🌟 Beginner-Friendly & Welcoming

**This project is perfect for your first open-source contribution!**

Whether you're new to open source or an experienced developer, you're welcome here. Don't worry about making perfect PRs or asking "dumb" questions—there are no such things.

### What This Means:
- ✅ **Imperfect PRs are welcome**: Submit what you have, even if incomplete. We'll work on it together!
- ✅ **No pressure**: Take your time. There's no rush or deadline.
- ✅ **Ask anything**: Confused about something? Reach out directly—I'm happy to help!
- ✅ **Learn together**: This is a learning space. Mistakes are part of the journey.

### Ways to Get Help:
- 📧 **Email me**: [romaintibo6@gmail.com](mailto:romaintibo6@gmail.com) - I respond to everyone!
- 💬 **GitHub Discussions**: Ask questions publicly so others can learn too
- 🐛 **Draft PRs**: Open a draft PR early and we'll collaborate on it
- 💡 **Ideas**: Share half-baked ideas—they often become the best features!

**Remember**: The goal is to learn, collaborate, and have fun. There's zero pressure here. 🎉

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Submitting Changes](#submitting-changes)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [romaintibo6@gmail.com](mailto:romaintibo6@gmail.com).

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the [existing issues](https://github.com/Raumain/database-handler-cli/issues) to avoid duplicates.

When creating a bug report, include:
- **Clear title and description**
- **Steps to reproduce** the issue
- **Expected behavior** vs actual behavior
- **Environment details** (Node.js version, PostgreSQL version, OS)
- **Error messages** or logs if applicable

### Suggesting Features

Feature suggestions are welcome! Please:
- Check if the feature has already been suggested
- Provide a clear use case for the feature
- Explain why this would be useful to most users
- Consider whether it fits the project's scope

### Code Contributions

We welcome pull requests for:
- Bug fixes (even tiny ones!)
- New features (please discuss in an issue first for major features, but small additions are always welcome)
- Documentation improvements (typos, clarity, examples)
- Performance optimizations
- Test coverage improvements
- Code refactoring
- **Literally anything that makes the project better!**

**New to contributing?** Start with:
- 🟢 Issues labeled [`good first issue`](https://github.com/Raumain/database-handler-cli/labels/good%20first%20issue)
- 📝 Documentation improvements (README, comments, examples)
- 🐛 Small bug fixes
- 💡 Suggesting ideas (open an issue—no code required!)

## Development Setup

### Prerequisites

- **Node.js** 18+ or **Bun** runtime
- **PostgreSQL** 12+
- **Git**

### Getting Started

1. **Fork the repository** on GitHub

2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/database-handler-cli.git
   cd database-handler-cli
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/Raumain/database-handler-cli.git
   ```

4. **Install dependencies**:
   ```bash
   bun install
   # or
   npm install
   ```

5. **Create a `.env` file** with your test database:
   ```bash
   # Test database
   DATABASE_URL=postgresql://user:password@localhost:5432/test_db
   ```

6. **Run the CLI in development**:
   ```bash
   bun src/cli.ts
   ```

### Docker Setup (Optional)

For an isolated development environment:

```bash
docker compose up -d
docker compose exec -it bun bash
```

## Project Structure

```
src/
├── features/           # Core features (dump, import, drop, etc.)
│   ├── dump.ts
│   ├── import.ts
│   ├── drop.ts
│   ├── empty.ts
│   ├── list.ts
│   └── schema.ts
├── utils/              # Helper functions
│   ├── getAllTableNames.ts
│   ├── getDbConnections.ts
│   ├── getDumpFilePath.ts
│   └── toCamelCase.ts
├── database.ts         # Kysely database connection
└── cli.ts              # CLI entry point
```

### Key Concepts

- **Features** contain the main logic for each CLI operation
- **Utils** provide reusable helper functions
- **database.ts** handles PostgreSQL connection setup
- **cli.ts** orchestrates the interactive CLI interface

## Coding Standards

**Don't let these scare you!** These are guidelines to help maintain consistency, but they're not strict rules. If you're stuck or unsure, just do your best—I'm happy to help polish things up during review.

### TypeScript

- Use **TypeScript strict mode** (already enabled)
- Prefer **type inference** over explicit types when obvious
- Use `const` by default, `let` only when mutation is necessary
- Never use `any` - use `unknown` if type is truly unknown

### Code Style

This project uses **Biome** for linting and formatting:

```bash
# Check code style
bun run fmt.check

# Auto-fix issues
bun run fmt
```

**Please run `bun run fmt` before committing.**

> **First-time contributor?** If you forget this step or something doesn't format correctly, no worries! I can help fix it, or GitHub Actions will catch it. The most important thing is your contribution, not perfect formatting.

### Naming Conventions

- **Functions**: `camelCase` with verb prefixes (`getUserById`, `exportSchema`)
- **Variables**: `camelCase` (`tableName`, `dumpPath`)
- **Types/Interfaces**: `PascalCase` when needed
- **Constants**: `UPPER_SNAKE_CASE` (`BACKUPS_DIR`)
- **Files**: `kebab-case.ts` (`get-db-connections.ts`)

### Best Practices

- **Single Responsibility**: Each function should do one thing well
- **Descriptive Names**: Function and variable names should be self-documenting
- **Error Handling**: Always handle errors gracefully with user-friendly messages
- **Transactions**: Database operations should use transactions when appropriate
- **Type Safety**: Leverage Kysely's type-safe query builder
- **Comments**: Only add comments for complex logic; code should be self-explanatory

### Example Code

```typescript
// ✅ Good: Clear, type-safe, single responsibility
async function getAllTableNames(
  db: Kysely<Record<string, unknown>>
): Promise<string[]> {
  const result = await sql<{ table_name: string }>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
  `.execute(db)
  
  return result.rows.map((r) => r.table_name)
}

// ❌ Bad: No types, unclear purpose
async function getTables(db: any) {
  const r = await db.execute(...)
  return r
}
```

## Submitting Changes

### Branch Naming

Create a descriptive branch name:
- `feat/add-mysql-support`
- `fix/import-rollback-issue`
- `docs/improve-readme`
- `refactor/simplify-drop-logic`

### Commit Messages

Follow conventional commits format:

```
type(scope): brief description

Longer explanation if needed.

Fixes #123
```

**Types**: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

**Examples**:
```
feat(dump): add parallel export for large tables
fix(import): handle circular foreign key dependencies
docs(readme): clarify multi-database setup
```

### Pull Request Process

1. **Update from upstream**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Create your branch**:
   ```bash
   git checkout -b feat/your-feature-name
   ```

3. **Make your changes** following the coding standards

4. **Format your code**:
   ```bash
   bun run fmt
   ```

5. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```

6. **Push to your fork**:
   ```bash
   git push origin feat/your-feature-name
   ```

7. **Open a Pull Request** on GitHub

### PR Requirements

Your PR should ideally:
- [ ] Follow the coding standards (but we can fix formatting together!)
- [ ] Include a clear description of the changes
- [ ] Reference any related issues
- [ ] Pass all formatting checks (`bun run fmt.check`)
- [ ] Work with PostgreSQL 12+ (if database-related)
- [ ] Not break existing functionality

**Don't stress about these!** If your PR doesn't meet all requirements, that's okay. Open it anyway as a draft, and we'll work on it together. The important part is getting your idea or fix out there.

### Review Process

- I'll review your PR as soon as I can (usually within a few days)
- I'll provide **friendly, constructive feedback**—never criticism
- **Don't worry about making mistakes**—we all do, and that's how we learn
- Feel free to ask questions or request clarification on any feedback
- Once everything looks good, I'll merge it and celebrate your contribution! 🎉

**Pro tip**: If you're unsure about something, open a **Draft PR** early. That way, we can discuss and iterate together before finalizing.

## Reporting Bugs

### Before Submitting

- Check [existing issues](https://github.com/Raumain/database-handler-cli/issues)
- Ensure you're using the latest version
- Verify the issue occurs with a fresh installation

### Bug Report Template

```markdown
**Description**
A clear description of the bug.

**Steps to Reproduce**
1. Run command `database-handler`
2. Select 'Dump'
3. ...

**Expected Behavior**
What should happen.

**Actual Behavior**
What actually happens.

**Environment**
- OS: [e.g., macOS 14.0]
- Node.js version: [e.g., 20.10.0]
- PostgreSQL version: [e.g., 15.3]
- CLI version: [e.g., 1.1.0]

**Error Messages**
```
Paste any error messages here
```

**Additional Context**
Any other relevant information.
```

## Suggesting Features

### Feature Request Template

```markdown
**Is your feature related to a problem?**
A clear description of the problem.

**Proposed Solution**
How you think this should be implemented.

**Alternatives Considered**
Other approaches you've thought about.

**Use Case**
Who would benefit and how?

**Additional Context**
Any other relevant information or examples.
```

## Questions?

**Don't hesitate to reach out!** I'm here to help and genuinely enjoy hearing from contributors.

### Ways to Connect:
- 📧 **Email**: [romaintibo6@gmail.com](mailto:romaintibo6@gmail.com) - Best for direct questions or if you want to discuss ideas privately
- 💬 **GitHub Discussions**: [Start a discussion](https://github.com/Raumain/database-handler-cli/discussions) - Great for public Q&A so others can benefit
- 🐙 **GitHub Issues**: Open an issue for bugs, features
- 🌐 **Social Media**: Find me on X or Instagram (check my bio)

### No Question is Too Small

Seriously! Whether you want to:
- Ask about a specific line of code
- Discuss a feature idea before implementing it
- Get help setting up your development environment
- Learn more about PostgreSQL, TypeScript, or Kysely
- Just chat about the project

**I'm happy to help!** This project exists because of people like you, and I want everyone to feel welcome and supported.

---

Thank you for contributing! 🎉
