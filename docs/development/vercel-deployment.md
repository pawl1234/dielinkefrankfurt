# Vercel Deployment with Neon PostgreSQL

This document explains how to deploy this Next.js application to Vercel with a Neon PostgreSQL database.

## Setup Instructions

### 1. Create a Neon PostgreSQL Database

1. Log in to your Neon account at [console.neon.tech](https://console.neon.tech)
2. Create a new project (e.g., "dielinkefrankfurt")
3. Once created, navigate to the "Connection Details" section
4. Find the connection string that looks like:
   ```
   postgresql://user:password@ep-your-endpoint.region.aws.neon.tech/neondb?sslmode=require
   ```
5. Save this connection string securely for the next step

### 2. Configure Environment Variables

Required environment variables for production:
- `DATABASE_URL`: Your Neon PostgreSQL connection string
- `NEXTAUTH_SECRET`: Secret for NextAuth authentication
- `VERCEL_PROJECT_PRODUCTION_URL`: Your production URL (e.g., https://your-site.vercel.app)
- `ADMIN_USERNAME`: Admin login username
- `ADMIN_PASSWORD`: Admin login password

### 3. Deploy to Vercel

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)
2. Log in to your [Vercel dashboard](https://vercel.com/dashboard)
3. Click "Add New" → "Project"
4. Select your repository
5. Configure the project with these settings:
   - **Framework Preset**: Next.js
   - **Build Command**: Keep the default (`npm run build`)
   - **Install Command**: Keep the default (`npm install`)
   - **Output Directory**: Keep the default (`.next`)

6. Under "Environment Variables", add all the required variables listed above
7. Click "Deploy"

### 4. Custom Prisma Migration Strategy

This project uses a custom approach for handling PostgreSQL migrations:

1. The `vercel-build.js` script runs during the build process to:
   - Remove any problematic migrations
   - Create fresh PostgreSQL-compatible migrations
   - Reset the database schema if needed (for clean deployments)
   - Use `prisma db push` as primary method (more reliable than migrations)
   - Fall back to `prisma migrate deploy` if necessary

2. The custom script prevents common migration issues when deploying to Vercel with a Neon PostgreSQL database

### 5. Deployment Checklist
- [ ] Set up Neon PostgreSQL database
- [ ] Copy the Neon connection string
- [ ] Set all environment variables in Vercel dashboard
- [ ] Push code changes to your git repository
- [ ] Import and deploy the project in Vercel dashboard
- [ ] Verify build logs for any Prisma-related errors

## Local Development

For local development with Neon PostgreSQL:

1. Copy the `.env.example` file to `.env.local`
2. Update the `DATABASE_URL` with your Neon connection string
3. Run `npm install` to install dependencies
4. Run `npm run reset-db` to reset the database and migrations
5. Run `npm run dev` to start the development server

## Troubleshooting

### Common Errors

1. **Migration Failures**: If you see errors about failed migrations:
   - The error may show: "3 migrations found in prisma/migrations"
   - This is now handled by the custom `vercel-build.js` script
   - For manual fix, run `npm run reset-db` locally, commit changes, and redeploy

2. **Database Connection**: If the database connection fails:
   - Verify your Neon DATABASE_URL is correctly formatted
   - Ensure your Neon database is active and not in "pause" state
   - Check that the database is accessible from Vercel's servers

3. **Build Script Issues**:
   - Check Vercel build logs for any errors in the `vercel-build.js` script
   - Ensure the script has permissions to execute

4. **PostgreSQL Specific Errors**:
   - If you see `relation "Appointment" does not exist`, the migration failed to create tables
   - Use the Neon console to manually check if tables were created
   - You can use Neon's SQL Editor to verify database structure

5. **File Upload Permission**:
   - Check Vercel logs to ensure the app has permission to write files to uploads directory

### Manual Database Reset

If you need to manually reset the database:

1. Access your Neon project console
2. Use the SQL Editor to run:
   ```sql
   DROP SCHEMA IF EXISTS public CASCADE;
   CREATE SCHEMA public;
   GRANT ALL ON SCHEMA public TO postgres;
   GRANT ALL ON SCHEMA public TO public;
   ```
3. Redeploy your Vercel project