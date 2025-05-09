export function formatEmailBody({
  teaser,
  mainText,
  startDateTime,
  endDateTime,
  street,
  city,
  state,
  postalCode,
  firstName,
  lastName,
  recurringText,
}: {
  teaser: string;
  mainText: string;
  startDateTime: string;
  endDateTime?: string | null;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  firstName?: string;
  lastName?: string;
  recurringText?: string;
}) {
  return `
Teaser: ${teaser}
Main Text: ${mainText}
Start Date & Time: ${new Date(startDateTime).toLocaleString('de-DE')}
End Date & Time: ${endDateTime ? new Date(endDateTime).toLocaleString('de-DE') : 'No end date and time provided.'}
Address: 
  Street: ${street || 'No street provided'}
  City: ${city || 'No city provided'}
  State: ${state || 'No state provided'}
  Postal Code: ${postalCode || 'No postal code provided'}
Requester: 
  First Name: ${firstName || 'No first name provided.'}
  Last Name: ${lastName || 'No last name provided.'}
Recurring Appointments: ${recurringText || 'No recurring schedule specified.'}
  `;
}

export function formatHtmlEmailBody({
  teaser,
  mainText,
  startDateTime,
  endDateTime,
  street,
  city,
  state,
  postalCode,
  firstName,
  lastName,
  recurringText,
}: {
  teaser: string;
  mainText: string;
  startDateTime: string;
  endDateTime?: string | null;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  firstName?: string;
  lastName?: string;
  recurringText?: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Neue Terminanfrage</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
    }
    h1 {
      color: #FF0000;
    }
    .content {
      border: 1px solid #ddd;
      padding: 20px;
      border-radius: 5px;
    }
    .label {
      font-weight: bold;
    }
    .missing {
      color: #999;
      font-style: italic;
    }
  </style>
</head>
<body>
  <h1>Neue Terminanfrage</h1>
  <div class="content">
    <p><span class="label">Teaser:</span></p>
    <div>${teaser}</div>
    
    <p><span class="label">Haupttext:</span></p>
    <div>${mainText}</div>
    
    <p><span class="label">Startdatum und -uhrzeit:</span> ${new Date(startDateTime).toLocaleString('de-DE')}</p>
    
    <p><span class="label">Enddatum und -uhrzeit:</span> 
      ${endDateTime ? new Date(endDateTime).toLocaleString('de-DE') : '<span class="missing">No end date and time provided.</span>'}
    </p>
    
    <p><span class="label">Adresse:</span></p>
    <ul>
      <li>Straße: ${street || '<span class="missing">No street provided</span>'}</li>
      <li>Stadt: ${city || '<span class="missing">No city provided</span>'}</li>
      <li>Bundesland: ${state || '<span class="missing">No state provided</span>'}</li>
      <li>Postleitzahl: ${postalCode || '<span class="missing">No postal code provided</span>'}</li>
    </ul>
    
    <p><span class="label">Antragsteller:</span></p>
    <ul>
      <li>Vorname: ${firstName || '<span class="missing">No first name provided.</span>'}</li>
      <li>Nachname: ${lastName || '<span class="missing">No last name provided.</span>'}</li>
    </ul>
    
    <p><span class="label">Wiederkehrende Termine:</span> 
      ${recurringText || '<span class="missing">No recurring schedule specified.</span>'}
    </p>
  </div>
</body>
</html>
  `;
}