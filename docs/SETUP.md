# PricePulse Setup Guide

This guide will help you set up PricePulse for local development or production deployment.

## Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Stripe account (for payments)
- Resend account (for emails)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/pricepulse.git
cd pricepulse
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env.local
```

Fill in the required values:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/pricepulse"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# OAuth Providers (optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_ID="price_..."

# Email (Resend)
RESEND_API_KEY="re_..."
EMAIL_FROM="alerts@yourdomain.com"

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Database Setup

Generate the Prisma client and run migrations:

```bash
npx prisma generate
npx prisma db push
```

For production, use migrations:

```bash
npx prisma migrate deploy
```

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Configuration Details

### Stripe Setup

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Create a product and price in the Stripe dashboard
3. Set up webhooks pointing to `/api/webhooks/stripe`
4. Enable the following webhook events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

### Email Setup (Resend)

1. Create a Resend account at [resend.com](https://resend.com)
2. Add and verify your domain
3. Create an API key
4. Add the API key to your environment variables

### OAuth Setup (Google)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)

## Production Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

The `vercel.json` file configures cron jobs for price checking.

### Manual Deployment

```bash
npm run build
npm start
```

### Environment Variables Checklist

- [ ] `DATABASE_URL` - Production PostgreSQL connection string
- [ ] `NEXTAUTH_URL` - Your production URL
- [ ] `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
- [ ] `STRIPE_SECRET_KEY` - Live key for production
- [ ] `STRIPE_WEBHOOK_SECRET` - Production webhook secret
- [ ] `RESEND_API_KEY` - Production API key

## Cron Jobs

Price checking runs automatically via Vercel Cron:

- Every hour: Check all tracked product prices
- Send notifications when prices drop below targets

For self-hosted deployments, set up cron to hit `/api/cron/check-prices` with the `CRON_SECRET` header.

## Troubleshooting

### Database Connection Issues

```bash
# Test database connection
npx prisma db pull
```

### Stripe Webhook Issues

Use Stripe CLI for local testing:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### Price Scraping Issues

Check supported retailers in `src/lib/priceScraper.ts`. Not all websites support scraping.

## Support

For issues and feature requests, please open a GitHub issue.
