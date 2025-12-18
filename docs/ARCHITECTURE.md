# PricePulse Architecture

This document describes the high-level architecture and design decisions of PricePulse.

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js Application                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Pages &   │  │    API      │  │      Components         │  │
│  │   Layouts   │  │   Routes    │  │   (React + TailwindCSS) │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │    Hooks    │  │    Libs     │  │     Repositories        │  │
│  │ (SWR-based) │  │ (utilities) │  │   (data access layer)   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   PostgreSQL  │    │    Stripe     │    │    Resend     │
│   (Prisma)    │    │  (Payments)   │    │   (Email)     │
└───────────────┘    └───────────────┘    └───────────────┘
```

## Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/          # NextAuth.js routes
│   │   ├── products/      # Product CRUD
│   │   ├── alerts/        # Alert management
│   │   ├── checkout/      # Stripe checkout
│   │   ├── cron/          # Scheduled tasks
│   │   └── webhooks/      # External webhooks
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # Base UI components
│   ├── products/         # Product-related components
│   ├── alerts/           # Alert-related components
│   └── charts/           # Data visualization
├── hooks/                 # Custom React hooks
│   ├── useProducts.ts    # Product data fetching
│   ├── useAlerts.ts      # Alert data fetching
│   └── usePriceHistory.ts # Price history fetching
├── lib/                   # Utility libraries
│   ├── db.ts             # Prisma client
│   ├── auth.ts           # NextAuth config
│   ├── stripe.ts         # Stripe client
│   ├── email.ts          # Email sending
│   ├── priceScraper.ts   # Web scraping
│   └── validations/      # Zod schemas
├── repositories/          # Data access layer
│   ├── productRepository.ts
│   └── alertRepository.ts
prisma/
└── schema.prisma          # Database schema
```

## Key Design Decisions

### 1. Repository Pattern

We use the repository pattern to abstract database operations:

```typescript
// repositories/productRepository.ts
export const productRepository = {
  findByUserId: async (userId: string) => {...},
  create: async (data: CreateProductInput) => {...},
  update: async (id: string, data: UpdateProductInput) => {...},
  delete: async (id: string) => {...},
};
```

**Benefits:**
- Testable: Easy to mock for unit tests
- Maintainable: Database logic in one place
- Flexible: Can swap database implementations

### 2. Custom Hooks with SWR

Data fetching is handled by custom hooks using SWR:

```typescript
// hooks/useProducts.ts
export function useProducts() {
  const { data, error, mutate } = useSWR('/api/products', fetcher);
  return {
    products: data,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}
```

**Benefits:**
- Automatic caching and revalidation
- Optimistic UI updates
- Consistent loading/error states

### 3. Validation with Zod

All API inputs are validated using Zod schemas:

```typescript
// lib/validations/product.ts
export const createProductSchema = z.object({
  url: z.string().url(),
  targetPrice: z.number().positive(),
});
```

**Benefits:**
- Type-safe validation
- Automatic TypeScript types
- Consistent error messages

### 4. API Response Format

All API responses follow a consistent format:

```typescript
// Success
{ success: true, data: {...} }

// Error
{ success: false, error: { message: '...', code: '...' } }
```

### 5. Middleware for Auth & Rate Limiting

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  // Check authentication
  // Apply rate limiting
  // Log requests
}
```

## Data Flow

### Adding a Product

```
1. User submits URL in AddProductForm
2. Form validates input with Zod
3. POST /api/products called
4. API validates & scrapes product info
5. Product saved via productRepository
6. SWR cache invalidated
7. UI updates optimistically
```

### Price Check Cron Job

```
1. Vercel Cron triggers /api/cron/check-prices
2. Fetch all products with active alerts
3. Scrape current prices in parallel
4. Compare with target prices
5. Send notifications for triggered alerts
6. Update price history records
```

## Scaling Considerations

### Current Limitations

- Price scraping is sequential (could parallelize)
- All users share same scraping rate limits
- Price history retention is unlimited

### Future Improvements

1. **Queue-based scraping**: Use a job queue for price checks
2. **Caching layer**: Redis for frequent queries
3. **Price history archival**: Archive old data to cold storage
4. **Multi-region**: Deploy to multiple regions for lower latency

## Security

- All API routes require authentication (except webhooks)
- CSRF protection via NextAuth.js
- Input validation on all endpoints
- SQL injection prevention via Prisma
- Stripe webhook signature verification
- Environment variables for secrets
