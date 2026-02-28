# Contributing to University Cafeteria Ordering System

Thank you for your interest in contributing to this project!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/cafeteria-ordering-system.git`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes thoroughly
6. Commit with clear messages: `git commit -m "Add: feature description"`
7. Push to your fork: `git push origin feature/your-feature-name`
8. Open a Pull Request

## Development Setup

```bash
# Install dependencies
npm install

# Copy environment files
cp .env.example .env

# Start services
docker-compose up -d

# Run tests
npm test
```

## Code Standards

- Follow existing code style
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR

## Commit Message Format

```
Type: Brief description

Detailed explanation (if needed)

Types: Add, Update, Fix, Remove, Refactor, Docs, Test
```

## Pull Request Process

1. Update README.md with details of changes if needed
2. Update documentation for any API changes
3. Ensure Docker builds successfully
4. Request review from maintainers

## Questions?

Open an issue for discussion before starting major changes.
