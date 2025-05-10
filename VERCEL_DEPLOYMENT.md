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
- Generate Prisma client during package installation
- Run enhanced database connection logging

### Database Migration
When switching from SQLite to PostgreSQL:
1. Create a new PostgreSQL database
2. Set the DATABASE_URL in your .env file
3. Run `npx prisma migrate deploy` to apply migrations
4. If needed, export data from SQLite and import to PostgreSQL

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