# Vercel Deployment Guide

## Setup Instructions

### Database Connection
1. **IMPORTANT**: This project now uses PostgreSQL as Vercel doesn't support SQLite
2. Add your PostgreSQL connection string as `DATABASE_URL` environment variable in Vercel
3. You can use services like Supabase, Neon, Railway, or any PostgreSQL host

### Environment Variables
Required environment variables for production:
- `DATABASE_URL`: Your PostgreSQL connection string
- `NEXTAUTH_SECRET`: Secret for NextAuth authentication
- `NEXTAUTH_URL`: Your production URL (e.g., https://your-site.vercel.app)
- `ADMIN_USERNAME`: Admin login username
- `ADMIN_PASSWORD`: Admin login password

### Prisma Setup
The project is configured to:
- Generate Prisma client during build process
- Run database migrations automatically during build
- Generate Prisma client during package installation
- Run enhanced database connection logging

### Database Migration
This project now automatically runs migrations during deployment with `prisma migrate deploy`.

When switching from SQLite to PostgreSQL:
1. Create a new PostgreSQL database (using Neon, Supabase, Railway, etc.)
2. Set the DATABASE_URL in your Vercel environment variables
3. The build process will automatically:
   - Generate the Prisma client
   - Run database migrations to create all required tables
   - Build the Next.js application

If you need to manually apply migrations:
```bash
# Local development
npx prisma migrate dev

# Production deployment
npx prisma migrate deploy
```

For data migration:
1. Export data from SQLite if needed
2. Import to PostgreSQL (can use pgAdmin or similar tools)

### Deployment Checklist
- [ ] Set up PostgreSQL database
- [ ] Set all environment variables in Vercel dashboard
- [ ] Push changes to git repository
- [ ] Import project in Vercel dashboard
- [ ] Verify build logs for any Prisma-related errors

## Troubleshooting

### Common Errors
1. **Prisma Client Generation**: If you see "Learn how: https://pris.ly/d/vercel-build" error, verify the build command includes Prisma generation.
2. **Database Connection**: Ensure your DATABASE_URL is correctly set and the database is accessible from Vercel's servers.
3. **File Upload Permission**: Check Vercel logs to ensure the app has permission to write files to uploads directory.
4. **Database Error Logs**: Review logs for database connection issues indicated by ❌ error symbols.
5. **Build Failures**: Check Vercel build logs for detailed error information.