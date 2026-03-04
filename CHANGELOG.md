# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-04

### Added
- ✨ Compensating transaction pattern for stock management
- ✨ Atomic multi-item order processing (all-or-nothing)
- ✨ Automatic stock rollback on order failures
- ✨ Stock release endpoint and service
- ✨ Enhanced error handling with structured logging
- ✨ Input validation for order items
- ✨ State tracking for transactions (stockReserved, dbTransactionStarted)
- ✨ Item enrichment with full menu details
- ✨ Integration and unit tests for multi-item orders
- ✨ Debug routes for order diagnostics
- ✨ Production docker-compose configuration
- ✨ Deployment scripts and documentation

### Changed
- 🔄 Improved reserveStock() with pre-validation
- 🔄 Enhanced circuit breaker state management
- 🔄 Updated order service with compensating transactions
- 🔄 Improved async handling with for...of loops
- 🔄 Better error objects with status codes and details
- 🔄 Updated README with comprehensive documentation

### Fixed
- 🐛 Fixed 502 Bad Gateway errors
- 🐛 Fixed 503 Service Unavailable errors
- 🐛 Fixed duplicate transaction ID constraint
- 🐛 Fixed stock leakage on order failures
- 🐛 Fixed circuit breaker not resetting properly
- 🐛 Fixed NGINX upstream resolution issues
- 🐛 Fixed ROLLBACK without BEGIN errors
- 🐛 Fixed multi-item order display issues

### Security
- 🔒 Enhanced validation for order inputs
- 🔒 Improved error handling to prevent information leakage
- 🔒 Added proper authentication checks

## [0.9.0] - 2026-03-03

### Added
- Initial microservices architecture
- User authentication with JWT
- Order management system
- Stock management with optimistic locking
- Admin dashboard
- Real-time notifications
- Monitoring with Prometheus and Grafana

### Changed
- Migrated from monolith to microservices
- Implemented event-driven architecture

### Fixed
- Various bug fixes and improvements

## [0.1.0] - 2026-02-01

### Added
- Initial project setup
- Basic CRUD operations
- Database schema

---

## Legend
- ✨ New feature
- 🔄 Changed/Updated
- 🐛 Bug fix
- 🔒 Security
- 📝 Documentation
- 🚀 Performance
- ♻️ Refactoring
- 🗑️ Deprecated
- ❌ Removed
