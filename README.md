# PricePulse 📉

A modern price drop alert tool that notifies users when tracked products go on sale. Built with Next.js 14, TypeScript, and Prisma.

![PricePulse Dashboard](https://via.placeholder.com/800x400?text=PricePulse+Dashboard)

## ✨ Features

- **Track Product Prices** - Paste URLs from major retailers and set target prices
- **Real-time Alerts** - Get notified via email when prices drop below your target
- **Price History Charts** - Visualize price trends over time with interactive charts
- **Premium Subscription** - Unlock unlimited alerts with Stripe-powered subscriptions
- **Responsive Dashboard** - Beautiful, mobile-friendly interface

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Stripe account (for payments)
- SendGrid account (for emails)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/pricepulse.git
cd pricepulse

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Set up the database
npx prisma migrate dev

# Start the development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the app.

## 📚 Documentation

- [Setup Guide](docs/SETUP.md) - Detailed installation instructions
- [API Documentation](docs/API.md) - REST API reference
- [Architecture](docs/ARCHITECTURE.md) - System design overview

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Payments**: Stripe
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Email**: SendGrid

## 📁 Project Structure

```
src/
├── app/                  # Next.js App Router pages & API routes
│   ├── api/              # REST API endpoints
│   └── page.tsx          # Main dashboard
├── components/           # React components
│   ├── alerts/           # Alert-related components
│   ├── charts/           # Chart components
│   ├── products/         # Product-related components
│   └── ui/               # Reusable UI components
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions & configurations
├── repositories/         # Data access layer
└── services/             # Business logic services
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List user's tracked products |
| POST | `/api/products` | Add a new product to track |
| DELETE | `/api/products/[id]` | Remove a tracked product |
| GET | `/api/alerts` | List user's price alerts |
| POST | `/api/alerts` | Create a new price alert |
| POST | `/api/checkout` | Create Stripe checkout session |
| GET | `/api/subscription` | Get subscription status |

See [API Documentation](docs/API.md) for complete details.

## 🔒 Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | NextAuth.js secret key |
| `STRIPE_SECRET_KEY` | Stripe API secret key |
| `SENDGRID_API_KEY` | SendGrid API key |
| `CRON_SECRET` | Secret for cron job authentication |

See [.env.example](.env.example) for all required variables.

## 🚢 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables
4. Deploy!

The `vercel.json` includes cron job configuration for automatic price checks.

### Other Platforms

PricePulse can be deployed to any platform that supports Next.js:
- Railway
- Render
- DigitalOcean App Platform
- AWS Amplify

## 🧪 Development

```bash
# Run development server
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Database migrations
npx prisma migrate dev

# Open Prisma Studio
npx prisma studio
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React framework
- [Prisma](https://prisma.io/) - Next-generation ORM
- [Stripe](https://stripe.com/) - Payment processing
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
- [Recharts](https://recharts.org/) - Charting library

---

Built with ❤️ by the PricePulse team