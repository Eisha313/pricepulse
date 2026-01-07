# Changelog

All notable changes to PricePulse will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-15

### Added

- Initial release of PricePulse
- Product tracking by URL with automatic price scraping
- Price alert system with customizable target prices
- Email notifications when prices drop below targets
- Interactive price history charts using Recharts
- User authentication with NextAuth.js (Google & GitHub providers)
- Premium subscription system via Stripe
  - Free tier: 3 active alerts
  - Premium tier: Unlimited alerts
- Stripe billing portal for subscription management
- Responsive dashboard with Tailwind CSS
- RESTful API with comprehensive error handling
- Automated price checking via Vercel cron jobs
- Form validation with Zod schemas
- PostgreSQL database with Prisma ORM
- TypeScript throughout the codebase

### Security

- Protected API routes with authentication middleware
- Rate limiting on sensitive endpoints
- Secure environment variable handling
- CSRF protection via NextAuth.js

### Documentation

- Comprehensive README with setup instructions
- API documentation with endpoint reference
- Architecture documentation with system design
- Setup guide for development and production

## [Unreleased]

### Planned Features

- Browser extension for one-click product tracking
- SMS notifications option
- Price drop predictions using ML
- Multi-currency support
- Product comparison feature
- Mobile app (React Native)
- Webhook integrations
- Team/family sharing for premium users