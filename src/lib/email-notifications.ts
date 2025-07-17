import { ResponsiblePerson, Group, StatusReport, Antrag } from '@prisma/client';
import { sendEmail, type EmailAttachment } from './email';
import { getBaseUrl } from './base-url';
import { prepareEmailAttachments } from './email-attachment-utils';
import { logger } from './logger';
import type { AntragPurposes } from '@/types/api-types';

// Types for extended models
export type GroupWithResponsiblePersons = Group & {
  responsiblePersons: ResponsiblePerson[];
};

export type StatusReportWithGroup = StatusReport & {
  group: GroupWithResponsiblePersons;
};

/**
 * Format purposes for email display
 * @param purposes The purposes object from Antrag
 * @returns HTML formatted string showing selected purposes
 */
function formatPurposesForEmail(purposes: string | AntragPurposes): string {
  let purposesObj: AntragPurposes;
  
  // Parse purposes if it's a string (from database)
  if (typeof purposes === 'string') {
    try {
      purposesObj = JSON.parse(purposes);
    } catch (e) {
      console.error('Error parsing purposes:', e);
      return '<p>Fehler beim Anzeigen der Zwecke</p>';
    }
  } else {
    purposesObj = purposes;
  }
  
  const purposesList: string[] = [];
  
  // Financial support
  if (purposesObj.zuschuss?.enabled) {
    purposesList.push(`
      <li>
        <strong>Finanzieller Zuschuss:</strong> ${purposesObj.zuschuss.amount} €
      </li>
    `);
  }
  
  // Personnel support
  if (purposesObj.personelleUnterstuetzung?.enabled) {
    purposesList.push(`
      <li>
        <strong>Personelle Unterstützung:</strong><br/>
        ${purposesObj.personelleUnterstuetzung.details}
      </li>
    `);
  }
  
  // Room booking
  if (purposesObj.raumbuchung?.enabled) {
    purposesList.push(`
      <li>
        <strong>Raumbuchung:</strong><br/>
        Ort: ${purposesObj.raumbuchung.location}<br/>
        Anzahl Personen: ${purposesObj.raumbuchung.numberOfPeople}<br/>
        Details: ${purposesObj.raumbuchung.details}
      </li>
    `);
  }
  
  // Other
  if (purposesObj.weiteres?.enabled) {
    purposesList.push(`
      <li>
        <strong>Weiteres:</strong><br/>
        ${purposesObj.weiteres.details}
      </li>
    `);
  }
  
  if (purposesList.length === 0) {
    return '<p>Keine Zwecke ausgewählt</p>';
  }
  
  return `<ul style="margin-top: 10px; margin-bottom: 20px;">${purposesList.join('')}</ul>`;
}

/**
 * Send notification email when an Antrag is submitted
 * @param antrag The submitted Antrag
 * @param fileUrls Array of uploaded file URLs
 * @param recipientEmails Array of recipient email addresses
 * @returns Result with success status and optional error
 */
export async function sendAntragSubmissionEmail(
  antrag: Antrag,
  fileUrls: string[],
  recipientEmails: string[]
): Promise<{ success: boolean; error?: Error | string }> {
  try {
    if (!recipientEmails || recipientEmails.length === 0) {
      console.error('No recipient emails provided for Antrag submission');
      return { success: false, error: 'No recipient emails provided' };
    }
    
    const recipients = recipientEmails.join(',');
    const adminUrl = `${getBaseUrl()}/admin/antraege/${antrag.id}`;
    
    // Prepare file attachments
    let attachments: EmailAttachment[] = [];
    
    if (fileUrls && fileUrls.length > 0) {
      try {
        const attachmentResult = await prepareEmailAttachments(fileUrls);
        attachments = attachmentResult.attachments;
        
        // Log attachment preparation results
        if (attachmentResult.attachments.length > 0) {
          logger.info('Antrag email attachments prepared', {
            context: {
              antragId: antrag.id,
              attachmentCount: attachmentResult.attachments.length,
              totalSize: attachmentResult.totalSize,
              skippedCount: attachmentResult.skippedFiles.length
            }
          });
        }
        
        // Add warnings for skipped files
        if (attachmentResult.skippedFiles.length > 0) {
          logger.warn('Some files could not be attached to Antrag email', {
            context: {
              antragId: antrag.id,
              skippedFiles: attachmentResult.skippedFiles.map(f => ({
                filename: f.filename,
                reason: f.reason
              }))
            }
          });
        }
        
      } catch (attachmentError) {
        // If attachment preparation fails completely, log the error
        logger.error('Failed to prepare attachments for Antrag email', {
          context: {
            antragId: antrag.id,
            error: attachmentError instanceof Error ? attachmentError.message : String(attachmentError)
          }
        });
      }
    }
    
    // Generate HTML using React Email
    const { renderNotificationEmail } = await import('./email-render');
    const html = await renderNotificationEmail('AntragSubmission', {
      antrag,
      fileUrls,
      adminUrl
    });
    
    await sendEmail({
      to: recipients,
      subject: `Neuer Antrag: ${antrag.title}`,
      html,
      attachments: attachments.length > 0 ? attachments : undefined
    });
    
    console.log(`✅ Antrag submission email sent to ${recipients}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending Antrag submission email:', error);
    return { success: false, error: error instanceof Error ? error : String(error) };
  }
}

/**
 * Send notification email when a group is accepted
 * @param group Group with responsible persons
 * @returns Result with success status and optional error
 */
export async function sendGroupAcceptanceEmail(
  group: GroupWithResponsiblePersons
): Promise<{ success: boolean; error?: Error | string }> {
  try {
    if (!group.responsiblePersons || group.responsiblePersons.length === 0) {
      console.error(`No responsible persons found for group ${group.id}`);
      return { success: false, error: 'No responsible persons found' };
    }
    
    const recipients = group.responsiblePersons.map(person => person.email).join(',');
    const statusReportFormUrl = `${getBaseUrl()}/gruppen-bericht`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Ihre Gruppe "${group.name}" wurde freigeschaltet</h2>
        
        <p>Liebe Verantwortliche der Gruppe "${group.name}",</p>
        
        <p>wir freuen uns, Ihnen mitteilen zu können, dass Ihre Gruppe nun freigeschaltet wurde und auf unserer Website sichtbar ist.</p>
        
        <p>Sie können ab sofort Statusberichte für Ihre Gruppe einreichen unter: <a href="${statusReportFormUrl}">${statusReportFormUrl}</a></p>
        
        <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
        
        <p>
          Mit freundlichen Grüßen,<br>
          Das Team von Die Linke Frankfurt
        </p>
      </div>
    `;
    
    await sendEmail({
      to: recipients,
      subject: `Ihre Gruppe "${group.name}" wurde freigeschaltet`,
      html
    });
    
    console.log(`✅ Group acceptance email sent to ${recipients}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending group acceptance email:', error);
    return { success: false, error: error instanceof Error ? error : String(error) };
  }
}

/**
 * Send notification email when a group is rejected
 * @param group Group with responsible persons
 * @returns Result with success status and optional error
 */
export async function sendGroupRejectionEmail(
  group: GroupWithResponsiblePersons
): Promise<{ success: boolean; error?: Error | string }> {
  try {
    if (!group.responsiblePersons || group.responsiblePersons.length === 0) {
      console.error(`No responsible persons found for group ${group.id}`);
      return { success: false, error: 'No responsible persons found' };
    }
    
    const recipients = group.responsiblePersons.map(person => person.email).join(',');
    const contactEmail = process.env.CONTACT_EMAIL || 'info@die-linke-frankfurt.de';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Ihre Gruppenanfrage "${group.name}" wurde abgelehnt</h2>
        
        <p>Liebe Verantwortliche der Gruppe "${group.name}",</p>
        
        <p>wir müssen Ihnen leider mitteilen, dass Ihre Anfrage zur Erstellung einer Gruppe auf unserer Website nicht genehmigt werden konnte.</p>
        
        <p>Für weitere Informationen oder Fragen wenden Sie sich bitte an: <a href="mailto:${contactEmail}">${contactEmail}</a></p>
        
        <p>
          Mit freundlichen Grüßen,<br>
          Das Team von Die Linke Frankfurt
        </p>
      </div>
    `;
    
    await sendEmail({
      to: recipients,
      subject: `Ihre Gruppenanfrage "${group.name}" wurde abgelehnt`,
      html
    });
    
    console.log(`✅ Group rejection email sent to ${recipients}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending group rejection email:', error);
    return { success: false, error: error instanceof Error ? error : String(error) };
  }
}

/**
 * Send notification email when a group is archived
 * @param group Group with responsible persons
 * @returns Result with success status and optional error
 */
export async function sendGroupArchivingEmail(
  group: GroupWithResponsiblePersons
): Promise<{ success: boolean; error?: Error | string }> {
  try {
    if (!group.responsiblePersons || group.responsiblePersons.length === 0) {
      console.error(`No responsible persons found for group ${group.id}`);
      return { success: false, error: 'No responsible persons found' };
    }
    
    const recipients = group.responsiblePersons.map(person => person.email).join(',');
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Ihre Gruppe "${group.name}" wurde archiviert</h2>
        
        <p>Liebe Verantwortliche der Gruppe "${group.name}",</p>
        
        <p>wir möchten Sie darüber informieren, dass Ihre Gruppe auf unserer Website archiviert wurde und nicht mehr öffentlich sichtbar ist.</p>
        
        <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
        
        <p>
          Mit freundlichen Grüßen,<br>
          Das Team von Die Linke Frankfurt
        </p>
      </div>
    `;
    
    await sendEmail({
      to: recipients,
      subject: `Ihre Gruppe "${group.name}" wurde archiviert`,
      html
    });
    
    console.log(`✅ Group archiving email sent to ${recipients}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending group archiving email:', error);
    return { success: false, error: error instanceof Error ? error : String(error) };
  }
}

/**
 * Send notification email when a status report is accepted
 * @param statusReport Status report with group information
 * @returns Result with success status and optional error
 */
export async function sendStatusReportAcceptanceEmail(
  statusReport: StatusReportWithGroup
): Promise<{ success: boolean; error?: Error | string }> {
  try {
    if (!statusReport.group.responsiblePersons || statusReport.group.responsiblePersons.length === 0) {
      console.error(`No responsible persons found for group ${statusReport.group.id}`);
      return { success: false, error: 'No responsible persons found' };
    }
    
    const recipients = statusReport.group.responsiblePersons.map(person => person.email).join(',');
    const reportUrl = `${getBaseUrl()}/gruppen/${statusReport.group.slug}#report-${statusReport.id}`;
    const date = new Date(statusReport.createdAt).toLocaleDateString('de-DE');
    
    // Parse file URLs if they exist
    let fileList = '';
    if (statusReport.fileUrls) {
      try {
        const files = JSON.parse(statusReport.fileUrls);
        if (Array.isArray(files) && files.length > 0) {
          fileList = `
            <div style="margin-top: 20px; margin-bottom: 20px;">
              <p><strong>Angehängte Dateien:</strong></p>
              <ul>
                ${files.map(file => {
                  const fileName = file.split('/').pop();
                  return `<li><a href="${file}" target="_blank">${fileName}</a></li>`;
                }).join('')}
              </ul>
            </div>
          `;
        }
      } catch (e) {
        console.error('Error parsing file URLs:', e);
      }
    }
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Statusbericht "${statusReport.title}" wurde freigeschaltet</h2>
        
        <p>Liebe Verantwortliche der Gruppe "${statusReport.group.name}",</p>
        
        <p>wir möchten Sie darüber informieren, dass der Statusbericht "${statusReport.title}" vom ${date} nun freigeschaltet wurde und auf unserer Website sichtbar ist.</p>
        
        <p>Sie können den Bericht hier einsehen: <a href="${reportUrl}">${reportUrl}</a></p>
        
        ${fileList}
        
        <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
        
        <p>
          Mit freundlichen Grüßen,<br>
          Das Team von Die Linke Frankfurt
        </p>
      </div>
    `;
    
    await sendEmail({
      to: recipients,
      subject: `Statusbericht "${statusReport.title}" wurde freigeschaltet`,
      html
    });
    
    console.log(`✅ Status report acceptance email sent to ${recipients}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending status report acceptance email:', error);
    return { success: false, error: error instanceof Error ? error : String(error) };
  }
}

/**
 * Send notification email when a status report is rejected
 * @param statusReport Status report with group information
 * @returns Result with success status and optional error
 */
export async function sendStatusReportRejectionEmail(
  statusReport: StatusReportWithGroup
): Promise<{ success: boolean; error?: Error | string }> {
  try {
    if (!statusReport.group.responsiblePersons || statusReport.group.responsiblePersons.length === 0) {
      console.error(`No responsible persons found for group ${statusReport.group.id}`);
      return { success: false, error: 'No responsible persons found' };
    }
    
    const recipients = statusReport.group.responsiblePersons.map(person => person.email).join(',');
    const contactEmail = process.env.CONTACT_EMAIL || 'info@die-linke-frankfurt.de';
    const date = new Date(statusReport.createdAt).toLocaleDateString('de-DE');
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Ihr Statusbericht "${statusReport.title}" wurde abgelehnt</h2>
        
        <p>Liebe Verantwortliche der Gruppe "${statusReport.group.name}",</p>
        
        <p>wir müssen Ihnen leider mitteilen, dass Ihr Statusbericht "${statusReport.title}" vom ${date} für die Veröffentlichung auf unserer Website nicht genehmigt werden konnte.</p>
        
        <p>Sie können gerne einen überarbeiteten Bericht einreichen oder für weitere Informationen und Fragen wenden Sie sich bitte an: <a href="mailto:${contactEmail}">${contactEmail}</a></p>
        
        <p>
          Mit freundlichen Grüßen,<br>
          Das Team von Die Linke Frankfurt
        </p>
      </div>
    `;
    
    await sendEmail({
      to: recipients,
      subject: `Ihr Statusbericht "${statusReport.title}" wurde abgelehnt`,
      html
    });
    
    console.log(`✅ Status report rejection email sent to ${recipients}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending status report rejection email:', error);
    return { success: false, error: error instanceof Error ? error : String(error) };
  }
}

/**
 * Send notification email when a status report is archived
 * @param statusReport Status report with group information
 * @returns Result with success status and optional error
 */
export async function sendStatusReportArchivingEmail(
  statusReport: StatusReportWithGroup
): Promise<{ success: boolean; error?: Error | string }> {
  try {
    if (!statusReport.group.responsiblePersons || statusReport.group.responsiblePersons.length === 0) {
      console.error(`No responsible persons found for group ${statusReport.group.id}`);
      return { success: false, error: 'No responsible persons found' };
    }
    
    const recipients = statusReport.group.responsiblePersons.map(person => person.email).join(',');
    const date = new Date(statusReport.createdAt).toLocaleDateString('de-DE');
    
    // Parse file URLs to list them in the email
    let fileList = '';
    if (statusReport.fileUrls) {
      try {
        const files = JSON.parse(statusReport.fileUrls);
        if (Array.isArray(files) && files.length > 0) {
          fileList = `
            <div style="margin-top: 20px; margin-bottom: 20px;">
              <p><strong>Angehängte Dateien, die nicht mehr öffentlich verfügbar sind:</strong></p>
              <ul>
                ${files.map(file => {
                  const fileName = file.split('/').pop();
                  return `<li>${fileName}</li>`;
                }).join('')}
              </ul>
            </div>
          `;
        }
      } catch (parseError) {
        console.error('Error parsing file URLs:', parseError);
      }
    }
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Ihr Statusbericht "${statusReport.title}" wurde archiviert</h2>
        
        <p>Liebe Verantwortliche der Gruppe "${statusReport.group.name}",</p>
        
        <p>wir möchten Sie darüber informieren, dass Ihr Statusbericht "${statusReport.title}" vom ${date} nun archiviert wurde und nicht mehr öffentlich auf unserer Website sichtbar ist.</p>
        
        ${fileList}
        
        <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
        
        <p>
          Mit freundlichen Grüßen,<br>
          Das Team von Die Linke Frankfurt
        </p>
      </div>
    `;
    
    await sendEmail({
      to: recipients,
      subject: `Ihr Statusbericht "${statusReport.title}" wurde archiviert`,
      html
    });
    
    console.log(`✅ Status report archiving email sent to ${recipients}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending status report archiving email:', error);
    return { success: false, error: error instanceof Error ? error : String(error) };
  }
}

/**
 * Send notification email when an Antrag is accepted
 * @param antrag The accepted Antrag
 * @param decisionComment Optional comment from the admin
 * @returns Result with success status and optional error
 */
export async function sendAntragAcceptanceEmail(
  antrag: Antrag,
  decisionComment?: string
): Promise<{ success: boolean; error?: Error | string }> {
  try {
    if (!antrag.email) {
      console.error('No email address found for antrag applicant');
      return { success: false, error: 'No email address found for applicant' };
    }
    
    const date = new Date(antrag.createdAt).toLocaleDateString('de-DE');
    const contactEmail = process.env.CONTACT_EMAIL || 'info@die-linke-frankfurt.de';
    
    // Format purposes section
    const purposesHtml = formatPurposesForEmail(antrag.purposes);
    
    // Format decision comment if provided
    const decisionSection = decisionComment ? `
      <div style="margin-top: 20px; margin-bottom: 20px; padding: 15px; background-color: #e8f5e8; border-left: 4px solid #4caf50; border-radius: 5px;">
        <p style="margin: 0; color: #333;"><strong>Kommentar der Entscheidung:</strong></p>
        <p style="margin: 5px 0 0 0;">${decisionComment}</p>
      </div>
    ` : '';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #e8f5e8; padding: 20px; border-radius: 10px; margin-bottom: 20px; border-left: 4px solid #4caf50;">
          <h1 style="color: #2e7d32; margin-top: 0;">✅ Ihr Antrag wurde angenommen</h1>
          <p style="color: #666; margin-bottom: 0;">Entscheidung vom: ${new Date().toLocaleDateString('de-DE')}</p>
        </div>
        
        <div style="background-color: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #333; border-bottom: 2px solid #e9ecef; padding-bottom: 10px;">Antragsdetails</h2>
          <table style="width: 100%; margin-bottom: 20px;">
            <tr>
              <td style="padding: 5px 0; color: #666; width: 150px;">Titel:</td>
              <td style="padding: 5px 0;"><strong>${antrag.title}</strong></td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #666;">Eingereicht am:</td>
              <td style="padding: 5px 0;">${date}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #666;">Antragsteller:</td>
              <td style="padding: 5px 0;">${antrag.firstName} ${antrag.lastName}</td>
            </tr>
          </table>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
            <p style="margin: 0; color: #666;"><strong>Zusammenfassung:</strong></p>
            <p style="margin: 5px 0 0 0;">${antrag.summary}</p>
          </div>
          
          <h3 style="color: #333; margin-bottom: 10px;">Anliegen/Zwecke</h3>
          ${purposesHtml}
          
          ${decisionSection}
          
          <div style="margin-top: 30px; padding: 20px; background-color: #e3f2fd; border-radius: 5px;">
            <h3 style="color: #333; margin-top: 0;">Nächste Schritte</h3>
            <p style="margin: 10px 0;">
              Ihr Antrag wurde von unserem Team geprüft und angenommen. 
              Sie werden in Kürze von uns kontaktiert, um die weiteren Details zu besprechen.
            </p>
            <p style="margin: 10px 0;">
              Bei Fragen können Sie sich gerne an uns wenden: 
              <a href="mailto:${contactEmail}" style="color: #0066cc;">${contactEmail}</a>
            </p>
          </div>
        </div>
        
        <div style="margin-top: 20px; text-align: center; color: #666; font-size: 12px;">
          <p>Diese E-Mail wurde automatisch generiert. Sie können auf diese E-Mail antworten.</p>
          <p>© ${new Date().getFullYear()} Die Linke Frankfurt</p>
        </div>
      </div>
    `;
    
    await sendEmail({
      to: antrag.email,
      subject: `✅ Ihr Antrag "${antrag.title}" wurde angenommen`,
      html
    });
    
    console.log(`✅ Antrag acceptance email sent to ${antrag.email}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending Antrag acceptance email:', error);
    return { success: false, error: error instanceof Error ? error : String(error) };
  }
}

/**
 * Send notification email when an Antrag is rejected
 * @param antrag The rejected Antrag
 * @param decisionComment Optional comment from the admin explaining the rejection
 * @returns Result with success status and optional error
 */
export async function sendAntragRejectionEmail(
  antrag: Antrag,
  decisionComment?: string
): Promise<{ success: boolean; error?: Error | string }> {
  try {
    if (!antrag.email) {
      console.error('No email address found for antrag applicant');
      return { success: false, error: 'No email address found for applicant' };
    }
    
    const date = new Date(antrag.createdAt).toLocaleDateString('de-DE');
    const contactEmail = process.env.CONTACT_EMAIL || 'info@die-linke-frankfurt.de';
    
    // Format purposes section
    const purposesHtml = formatPurposesForEmail(antrag.purposes);
    
    // Format decision comment if provided
    const decisionSection = decisionComment ? `
      <div style="margin-top: 20px; margin-bottom: 20px; padding: 15px; background-color: #ffebee; border-left: 4px solid #f44336; border-radius: 5px;">
        <p style="margin: 0; color: #333;"><strong>Begründung der Entscheidung:</strong></p>
        <p style="margin: 5px 0 0 0;">${decisionComment}</p>
      </div>
    ` : '';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #ffebee; padding: 20px; border-radius: 10px; margin-bottom: 20px; border-left: 4px solid #f44336;">
          <h1 style="color: #c62828; margin-top: 0;">❌ Ihr Antrag wurde abgelehnt</h1>
          <p style="color: #666; margin-bottom: 0;">Entscheidung vom: ${new Date().toLocaleDateString('de-DE')}</p>
        </div>
        
        <div style="background-color: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #333; border-bottom: 2px solid #e9ecef; padding-bottom: 10px;">Antragsdetails</h2>
          <table style="width: 100%; margin-bottom: 20px;">
            <tr>
              <td style="padding: 5px 0; color: #666; width: 150px;">Titel:</td>
              <td style="padding: 5px 0;"><strong>${antrag.title}</strong></td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #666;">Eingereicht am:</td>
              <td style="padding: 5px 0;">${date}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #666;">Antragsteller:</td>
              <td style="padding: 5px 0;">${antrag.firstName} ${antrag.lastName}</td>
            </tr>
          </table>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
            <p style="margin: 0; color: #666;"><strong>Zusammenfassung:</strong></p>
            <p style="margin: 5px 0 0 0;">${antrag.summary}</p>
          </div>
          
          <h3 style="color: #333; margin-bottom: 10px;">Anliegen/Zwecke</h3>
          ${purposesHtml}
          
          ${decisionSection}
          
          <div style="margin-top: 30px; padding: 20px; background-color: #fff3e0; border-radius: 5px;">
            <h3 style="color: #333; margin-top: 0;">Weitere Möglichkeiten</h3>
            <p style="margin: 10px 0;">
              Wir bedauern, dass wir Ihrem Antrag nicht entsprechen konnten. 
              Gerne können Sie einen überarbeiteten Antrag einreichen oder sich mit uns in Verbindung setzen, 
              um mögliche Alternativen zu besprechen.
            </p>
            <p style="margin: 10px 0;">
              Bei Fragen zur Entscheidung oder für weitere Informationen wenden Sie sich bitte an: 
              <a href="mailto:${contactEmail}" style="color: #0066cc;">${contactEmail}</a>
            </p>
          </div>
        </div>
        
        <div style="margin-top: 20px; text-align: center; color: #666; font-size: 12px;">
          <p>Diese E-Mail wurde automatisch generiert. Sie können auf diese E-Mail antworten.</p>
          <p>© ${new Date().getFullYear()} Die Linke Frankfurt</p>
        </div>
      </div>
    `;
    
    await sendEmail({
      to: antrag.email,
      subject: `❌ Ihr Antrag "${antrag.title}" wurde abgelehnt`,
      html
    });
    
    console.log(`✅ Antrag rejection email sent to ${antrag.email}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending Antrag rejection email:', error);
    return { success: false, error: error instanceof Error ? error : String(error) };
  }
}