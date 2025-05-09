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

### Database Setup

The application uses SQLite for local development and can be configured to use PostgreSQL, MySQL, or other databases for production.

In development:
- SQLite database is automatically created at `prisma/dev.db`
- No additional setup is required

For database operations:
```bash
# View database data with Prisma Studio
npx prisma studio

# Apply database schema changes
npx prisma migrate dev

# Reset development database (caution: deletes all data)
npx prisma migrate reset
```

### Development Mode

You can run the application in development mode:

```bash
npm run dev
```

1. Open [http://localhost:3000](http://localhost:3000) in your browser to see the appointment form
2. Access the admin dashboard at [http://localhost:3000/admin](http://localhost:3000/admin) (default credentials: username `admin`, password `password123`)

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

For production deployment, we recommend using a PostgreSQL database for better performance and reliability:

1. Create a PostgreSQL database on your hosting provider or use a managed service like:
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

## Project Structure

- `/src/app`: Next.js app router files
- `/src/components`: React components
- `/src/app/api`: API routes for form submission
- `/public`: Static assets

## License

ISC