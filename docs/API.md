# PricePulse API Documentation

This document describes the REST API endpoints available in PricePulse.

## Authentication

All API endpoints (except public routes) require authentication via NextAuth.js session cookies or JWT tokens.

## Base URL

```
Production: https://your-domain.com/api
Development: http://localhost:3000/api
```

## Endpoints

### Products

#### GET /api/products

Get all products for the authenticated user.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clx123...",
      "url": "https://example.com/product",
      "name": "Product Name",
      "currentPrice": 99.99,
      "targetPrice": 79.99,
      "imageUrl": "https://example.com/image.jpg",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### POST /api/products

Add a new product to track.

**Request Body:**
```json
{
  "url": "https://example.com/product",
  "targetPrice": 79.99
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clx123...",
    "url": "https://example.com/product",
    "name": "Product Name",
    "currentPrice": 99.99,
    "targetPrice": 79.99
  }
}
```

#### GET /api/products/[id]

Get a specific product by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clx123...",
    "url": "https://example.com/product",
    "name": "Product Name",
    "currentPrice": 99.99,
    "targetPrice": 79.99
  }
}
```

#### PUT /api/products/[id]

Update a product's target price.

**Request Body:**
```json
{
  "targetPrice": 69.99
}
```

#### DELETE /api/products/[id]

Delete a tracked product.

**Response:**
```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

#### GET /api/products/[id]/price-history

Get price history for a product.

**Query Parameters:**
- `days` (optional): Number of days of history (default: 30)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "price": 99.99,
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Alerts

#### GET /api/alerts

Get all alerts for the authenticated user.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clx456...",
      "productId": "clx123...",
      "targetPrice": 79.99,
      "isActive": true,
      "triggeredAt": null,
      "product": {
        "name": "Product Name",
        "currentPrice": 99.99
      }
    }
  ]
}
```

#### POST /api/alerts

Create a new price alert.

**Request Body:**
```json
{
  "productId": "clx123...",
  "targetPrice": 79.99
}
```

#### DELETE /api/alerts/[id]

Delete an alert.

### Subscription & Billing

#### GET /api/subscription

Get current user's subscription status.

**Response:**
```json
{
  "success": true,
  "data": {
    "isPremium": true,
    "plan": "premium",
    "expiresAt": "2024-12-31T00:00:00.000Z"
  }
}
```

#### POST /api/checkout

Create a Stripe checkout session for premium subscription.

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://checkout.stripe.com/..."
  }
}
```

#### POST /api/billing-portal

Create a Stripe billing portal session.

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://billing.stripe.com/..."
  }
}
```

### Usage

#### GET /api/usage

Get current usage statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "productsTracked": 5,
    "alertsActive": 3,
    "limits": {
      "maxProducts": 10,
      "maxAlerts": 5
    }
  }
}
```

### Scraping

#### POST /api/scrape

Scrape product information from a URL.

**Request Body:**
```json
{
  "url": "https://example.com/product"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "Product Name",
    "price": 99.99,
    "imageUrl": "https://example.com/image.jpg",
    "currency": "USD"
  }
}
```

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `LIMIT_EXCEEDED` | 403 | Usage limit reached |
| `INTERNAL_ERROR` | 500 | Server error |

## Rate Limiting

API requests are rate limited to:
- Free users: 100 requests/hour
- Premium users: 1000 requests/hour

## Webhooks

PricePulse sends webhooks for:
- `price.dropped` - When a tracked price drops below target
- `subscription.created` - When a subscription is created
- `subscription.cancelled` - When a subscription is cancelled

Configure webhook endpoints in your dashboard settings.
