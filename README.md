# Appointment Submission Form - Die Linke Frankfurt

This is a Next.js application for appointment submission for Die Linke Frankfurt's newsletter contributors.

## Features

- Rich text editor with formatting options (bold, italic, bullet points, hyperlinks)
- File upload for cover pictures (JPEG, PNG, PDF) with size and format validation
- Date and time picker for start and end times
- Address input fields
- Requester information fields
- Recurring appointment description
- CAPTCHA protection after multiple submissions
- Database storage of appointments with SQLite (or other database in production)
- Admin dashboard for appointment management
- Processing and archiving of appointment requests
- RSS feed for approved appointments

## Technologies Used

- Next.js 15 with TypeScript
- Material UI (MUI) for UI components and theming
- React Hook Form for form handling
- TipTap for rich text editing
- Uppy for file uploads
- Prisma ORM for database access
- SQLite for local development database
- NextAuth.js for authentication

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Generate Prisma client:
   ```bash
   npx prisma generate
   ```
4. The project includes a default `.env.local` file with development settings that allow you to run the application without real reCAPTCHA credentials.

#### Local Development with PostgreSQL

If you want to use PostgreSQL locally (recommended for testing production-like setup):

1. Install PostgreSQL on your machine or use Docker:
   ```bash
   npm run db:start
   ```

2. Update your `.env.local` file with the PostgreSQL connection string:
   ```
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dielinkefrankfurt"
   ```

3. Run migrations:
   ```bash
   npm run db:push
   ```

4. You can now start your app with:
   ```bash
   npm run dev
   ```

### Development Mode

You can run the application in development mode:

```bash
npm run dev
```

1. Open [http://localhost:3000](http://localhost:3000) in your browser to see the appointment form
2. Access the admin dashboard at [http://localhost:3000/admin](http://localhost:3000/admin) (default credentials: username `admin`, password `password123`)

### Building Without a Database

If you just want to build or run the application locally without setting up a database, you can do so by running:

```bash
npm run build
```

The build script will automatically skip the database operations if no DATABASE_URL is found in the environment.

### Development Features

In development mode:
- SQLite database is used for easy local development
- reCAPTCHA validation will be automatically bypassed in development
- File uploads are stored in the public/uploads directory

## Environment Variables

### Authentication
- `NEXTAUTH_URL`: Full URL of your application (e.g., https://your-domain.com)
- `NEXTAUTH_SECRET`: Secret key for session encryption (generate with `openssl rand -base64 32`)
- `ADMIN_USERNAME`: Admin login username (default: admin)
- `ADMIN_PASSWORD`: Admin login password (default: password123)

### Database Configuration
- `DATABASE_URL`: Connection string for your database

### Optional Configuration
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`: Google reCAPTCHA site key

## Preparing for Production

When you're ready to deploy the application to production, you'll need to:

1. Set up authentication for the admin dashboard:
   ```
   NEXTAUTH_URL=https://your-domain.com
   NEXTAUTH_SECRET=your-secure-random-secret-key
   ADMIN_USERNAME=your-admin-username
   ADMIN_PASSWORD=your-secure-admin-password
   ```

2. Configure a production database (PostgreSQL recommended):
   ```
   # Change the database provider in prisma/schema.prisma
   datasource db {
     provider = "postgresql"  # Change to postgresql, mysql, or other supported database
     url      = env("DATABASE_URL")
   }

   # Add the DATABASE_URL to your environment variables
   DATABASE_URL="postgresql://username:password@your-database-host:5432/database-name"
   ```

3. Get a real Google reCAPTCHA v2 key from https://www.google.com/recaptcha/admin/ and update:
   ```
   NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your-real-recaptcha-site-key
   ```

4. Apply database migrations to your production database:
   ```bash
   npx prisma migrate deploy
   ```

5. Build the application for production:
   ```bash
   npm run build
   ```

6. Start the production server:
   ```bash
   npm run start
   ```

### Production Database Considerations

For production deployment, we use a PostgreSQL database for better performance and reliability:

1. Create a PostgreSQL database on your hosting provider or use a managed service like:
   - Neon (currently used)
   - Supabase
   - Railway
   - Heroku Postgres
   - AWS RDS
   - DigitalOcean Managed Databases

2. Update your schema.prisma provider:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

3. Set your DATABASE_URL environment variable to your PostgreSQL connection string.

4. Run `npx prisma migrate deploy` to apply migrations to your production database.

5. If you need to make schema changes, develop them locally first with `npx prisma migrate dev`, then apply them to production with `npx prisma migrate deploy`.

### Database Migrations and Vercel Deployment

This project includes a custom deployment script (`prisma/vercel-build.js`) that:

1. Validates the database connection
2. Ensures schema is properly configured
3. Creates a baseline migration if needed (for existing databases)
4. Safely deploys schema changes without data loss

#### Understanding the Database Preservation System

The application uses a custom baselining approach to preserve production data between deployments:

1. When deployed to Vercel, it checks if the database has a Prisma migrations table
2. If not, it creates one and records existing tables as a baseline
3. Future schema changes are applied on top of this baseline

This system ensures:
- Production data is preserved between deployments
- Schema changes are safely applied
- No data loss occurs during migrations

#### Manually Baselining an Existing Database

If you need to manually baseline an existing database:

```bash
# Create a baseline migration
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/$(date +%Y%m%d%H%M%S)_baseline/migration.sql

# Apply the migration
npx prisma migrate deploy
```

## RSS Feed

The application provides an RSS feed of approved appointments that can be used to display events on other websites:

- **Feed URL**: `/api/rss/appointments`
- **Format**: RSS 2.0 (XML, browser-friendly)
- **Content**: Approved appointments only
- **Fields included**:
  - Title (from appointment title)
  - Description (from appointment teaser)
  - Link (to appointment detail page)
  - Publication date (from appointment startDateTime)
  - Category (from appointment city, if available)

### Using the RSS Feed

To integrate the appointments on another website:

1. Use the RSS feed URL: `https://your-domain.com/api/rss/appointments`
2. Import using any standard RSS reader or feed parsing library
3. The feed is cached for 1 hour to improve performance

### Example RSS Item

```xml
<item>
  <title>Appointment Title</title>
  <description>A short teaser text for the appointment</description>
  <link>https://your-domain.com/termine/123</link>
  <guid isPermaLink="true">https://your-domain.com/termine/123</guid>
  <pubDate>Mon, 30 Oct 2023 10:00:00 GMT</pubDate>
  <category>Frankfurt am Main</category>
</item>
```

## Project Structure

- `/src/app`: Next.js app router files
- `/src/components`: React components
- `/src/app/api`: API routes for form submission and RSS feed
- `/public`: Static assets

## License

ISC