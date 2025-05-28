## The Following Featured are planned to be implemented

* Emailverstand bei Benutzer CRUD Operationen.
* In DB speichern, wann Benutzer sich zuletzt angemeldet hat. 
* Unterschriften sammeln.
* Vorstandsprotokolle oder alle Protokolle sammeln.
* Newsletter Intro KI generiert
* Newsletter which has been sent should be accessible via URL.
* Unsubscribe Feature.
* Archived Articles should be restorable and permanently removable

- Newsletter Analysefunktion einbauen, dass man sieht wieviele clicks es gibt.
- Let the whole system fail if Database is not available
- Log in Database when an users is logging in (e.g. admin).

-Newsletter Settings
  1. Content Settings:
    - defaultIntroText - Default introduction text template for new newsletters
    - maxAppointments - Limit number of appointments included
    - maxStatusReports - Limit number of status reports per group
    - statusReportDays - Days to look back for status reports (currently hardcoded to 14)
  2. Email Settings:
    - smtpHost, smtpPort, smtpUser, smtpPassword - Custom SMTP configuration
    - bounceEmail - Email for handling bounces
    - trackingPixel - Enable/disable email tracking
    - maxRetries - Maximum retry attempts for failed emails
  3. Display Settings:
    - dateFormat - Custom date format for newsletters
    - timezone - Timezone for date formatting
    - maxPreviewLength - Length of status report previews in newsletter
    - showGroupLogos - Toggle to show/hide group logos
  4. Archive Settings:
    - archiveRetentionDays - How long to keep old newsletters
    - enablePublicArchive - Make newsletter archives publicly viewable
    - archivePageSize - Number of newsletters per archive page
## Technische Schulden

* Security Audit der Seite
** APIs alle geschützt?
** Was machen gegen Bots?
* Reusability erhöhen
* Remove unneeded libraries
* Fix Linting errors
