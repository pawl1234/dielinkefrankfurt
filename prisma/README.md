# Prisma Database Setup

This directory contains the Prisma ORM configuration and utilities for managing the PostgreSQL database with Neon or any other PostgreSQL provider.

## Directory Structure

```
prisma/
├── db.js                # Core database utility functions
├── migrations/          # Migration files for PostgreSQL 
├── reset-database.js    # Script to completely reset the database
├── reset-migrations.js  # Script to reset and recreate migrations
├── schema.prisma        # Prisma schema definition
└── vercel-build.js      # Build script for Vercel deployment
```

## Available Scripts

This project includes several npm scripts for database management:

| Script | Description |
|--------|-------------|
| `npm run db:reset` | Completely reset the database (drop schema and recreate) |
| `npm run db:push` | Push schema changes directly to the database |
| `npm run db:studio` | Open Prisma Studio to visually explore and edit data |
| `npm run db:migrate` | Reset and recreate migrations based on the current schema |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:validate` | Validate the Prisma schema |

## Database Connection

The database connection is configured using the `DATABASE_URL` environment variable in the `.env` file. For production deployment on Vercel, this should be set in the Vercel project environment variables.

Example `.env` file for local development:

```
DATABASE_URL="postgres://user:password@localhost:5432/dielinkefrankfurt?schema=public"
```

Example Neon PostgreSQL connection string:

```
DATABASE_URL="postgres://user:password@ep-example-123456.eu-central-1.aws.neon.tech/neondb?sslmode=require"
```

## Deployment Process

When deploying to Vercel, the build process:

1. Validates the database connection
2. Ensures the schema is properly configured
3. Resets the database schema if needed
4. Creates fresh migrations
5. Pushes the schema to the database
6. Generates the Prisma client

This process is handled by the `vercel-build.js` script, which is automatically executed as part of the build command.

## Local Development Workflow

For local development:

1. Set up your local PostgreSQL database or connect to a remote Neon database
2. Create a `.env` file with your `DATABASE_URL`
3. Run `npm run db:start` to set up the database
3. Run `npm run db:reset` to set up the database
4. Run `npm run dev` to start the development server

## Database Schema

The current schema includes:

- `Appointment` model for storing event registrations
  - Core event details (title, description, dates)
  - Location information
  - Requester information
  - File attachments
  - Processing status

## Troubleshooting

If you encounter database connection issues:

1. Verify your DATABASE_URL is correct and accessible
2. Run `npm run db:validate` to check schema validity
3. Try `npm run db:reset` to rebuild the database
4. Check Vercel logs for specific error messages

For Neon-specific issues, ensure:
- The database is not in "paused" state
- Your IP is allowed in the Neon access control list
- The connection string includes `?sslmode=require`