# KostKita Backend

## Environment Variables

Copy `.env.example` to `.env` and fill in the values.

```bash
cp .env.example .env
```

## Development

```bash
npm run dev
```

## Database

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed database
npm run db:seed

# Open Prisma Studio
npm run db:studio
```

## Build

```bash
npm run build
```
