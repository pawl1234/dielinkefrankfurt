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
- Email generation with structured format

## Technologies Used

- Next.js 15 with TypeScript
- React Hook Form for form handling
- TipTap for rich text editing
- Uppy for file uploads
- React DatePicker for date/time selection
- Tailwind CSS for styling
- Nodemailer for email sending

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. The project includes a default `.env.local` file with development settings that allow you to run the application without real email or reCAPTCHA credentials.

### Development Mode

You can run the application in development mode with the included email testing server:

```bash
./dev.sh
```

This script starts both:
- Next.js development server on http://localhost:3000
- MailDev server on http://localhost:1080 (to view sent emails)

Alternatively, you can run the servers separately:

```bash
# Start the email testing server
npm run dev:emails

# In another terminal, start the Next.js development server
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the appointment form
5. When you submit the form, check [http://localhost:1080](http://localhost:1080) to see the emails

### Development Features

In development mode:
- No real email server is needed - emails are caught by MailDev and displayed in a web interface
- reCAPTCHA validation will be automatically bypassed in development
- File uploads will work but are temporarily stored and then deleted

## Environment Variables

- `EMAIL_HOST`: SMTP server hostname
- `EMAIL_PORT`: SMTP server port
- `EMAIL_SECURE`: Whether to use secure connection (true/false)
- `EMAIL_USER`: SMTP username
- `EMAIL_PASSWORD`: SMTP password
- `EMAIL_FROM`: Sender email address
- `EMAIL_TO`: Recipient email address
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`: Google reCAPTCHA site key

## Preparing for Production

When you're ready to deploy the application to production, you'll need to:

1. Update the `.env.local` file with real email server credentials:
   ```
   EMAIL_HOST=your-smtp-server.com
   EMAIL_PORT=587  # or your SMTP port
   EMAIL_SECURE=true  # use true for TLS
   EMAIL_USER=your-username
   EMAIL_PASSWORD=your-password
   EMAIL_FROM=appointments@dielinkefrankfurt.de
   EMAIL_TO=newsletter@dielinkefrankfurt.de
   ```

2. Get a real Google reCAPTCHA v2 key from https://www.google.com/recaptcha/admin/ and update:
   ```
   NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your-real-recaptcha-site-key
   ```

3. Build the application for production:
   ```bash
   npm run build
   ```

4. Start the production server:
   ```bash
   npm run start
   ```

## Project Structure

- `/src/app`: Next.js app router files
- `/src/components`: React components
- `/src/app/api`: API routes for form submission
- `/public`: Static assets

## License

ISC