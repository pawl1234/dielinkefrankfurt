# Newsletter Test Email Feature

This document explains how to use the newsletter test email feature for Die Linke Frankfurt's website.

## Overview

The newsletter system now includes a feature to send test emails before sending the actual newsletter to subscribers. This allows administrators to verify how the newsletter looks in different email clients.

## Features

1. **Test Email Button**: After generating a newsletter preview, a top section appears with a button to send a test email.
2. **Configurable Recipients**: Test emails are sent to email addresses configured in the admin settings.
3. **Multiple Recipients**: Multiple test email recipients can be added, separated by commas. Each recipient will receive an individual email.
4. **Email-Client Compatible**: The emails are formatted to be compatible with major email clients like Outlook, Gmail, and others.
5. **Local Testing**: A local SMTP testing tool is included for development environments.

## Setup & Configuration

### 1. Email Settings Configuration

Configure your email settings in the admin interface:

1. Navigate to the admin panel and click on "Einstellungen" in the Newsletter section
2. In the settings dialog, find the "Test-Email Empfänger" field
3. Enter one or more email addresses, separated by commas (e.g., `email1@beispiel.de, email2@beispiel.de`)
4. Click "Speichern" to save your settings

### 2. Email Server Configuration

Configure your email server settings by adding the following variables to your `.env.local` file:

```
# Email configuration for newsletter sending
EMAIL_SERVER_HOST="your-smtp-server.com"
EMAIL_SERVER_PORT=587  # or 465, 25, etc. depending on your SMTP server
EMAIL_SERVER_USER="your-username"
EMAIL_SERVER_PASSWORD="your-password"
EMAIL_FROM="newsletter@die-linke-frankfurt.de"
```

### 2. Local Development Testing

For local development, you can use MailDev, which is already set up in the project:

1. Start the MailDev server in a separate terminal:
   ```
   npm run mail:dev
   ```

2. This will start a mail server on port 1025 and a web interface on port 1080.

3. View sent emails by visiting [http://localhost:1080](http://localhost:1080) in your browser.

4. For local development, use these settings in your `.env.local`:
   ```
   EMAIL_SERVER_HOST="localhost"
   EMAIL_SERVER_PORT=1025
   EMAIL_SERVER_USER=""
   EMAIL_SERVER_PASSWORD=""
   ```

## Usage

1. Go to the Newsletter Generator in the admin panel.
2. Create your newsletter content by entering the introduction text.
3. Click "Newsletter Preview" to generate the newsletter.
4. A "Preview & Test" section will appear at the top.
5. Click "Test-Email senden" to send a test email to the configured recipients.
6. Check your email inbox (or MailDev interface in development) to view the sent newsletter.

## Troubleshooting

### Test Emails Not Sending

1. Check your SMTP settings in the environment variables.
2. Verify that you have configured test email recipients in the admin settings.
3. Ensure your SMTP server allows outgoing emails.
4. For local development, check that MailDev is running (`npm run mail:dev`).
5. Look for error messages in the server logs.

### Email Display Issues

If the newsletter doesn't look correct in email clients:

1. The newsletter uses email-compatible HTML/CSS which should work in most clients.
2. For more complex formatting issues, test with multiple email clients (Gmail, Outlook, etc.).
3. Consider using inline CSS for critical styling elements.

## Additional Resources

- [Nodemailer Documentation](https://nodemailer.com/about/)
- [MailDev GitHub Repository](https://github.com/maildev/maildev)
- [Email Client Compatibility Guide](https://www.caniemail.com/)