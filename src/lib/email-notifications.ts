import { ResponsiblePerson, Group, StatusReport } from '@prisma/client';
import { sendEmail } from './email';

// Types for extended models
export type GroupWithResponsiblePersons = Group & {
  responsiblePersons: ResponsiblePerson[];
};

export type StatusReportWithGroup = StatusReport & {
  group: GroupWithResponsiblePersons;
};

/**
 * Send notification email when a group is accepted
 * @param group Group with responsible persons
 * @returns Result with success status and optional error
 */
export async function sendGroupAcceptanceEmail(
  group: GroupWithResponsiblePersons
): Promise<{ success: boolean; error?: any }> {
  try {
    if (!group.responsiblePersons || group.responsiblePersons.length === 0) {
      console.error(`No responsible persons found for group ${group.id}`);
      return { success: false, error: 'No responsible persons found' };
    }
    
    const recipients = group.responsiblePersons.map(person => person.email).join(',');
    const statusReportFormUrl = `${process.env.VERCEL_PROJECT_PRODUCTION_URL}/gruppen-bericht`;
    
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
    return { success: false, error };
  }
}

/**
 * Send notification email when a group is rejected
 * @param group Group with responsible persons
 * @returns Result with success status and optional error
 */
export async function sendGroupRejectionEmail(
  group: GroupWithResponsiblePersons
): Promise<{ success: boolean; error?: any }> {
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
    return { success: false, error };
  }
}

/**
 * Send notification email when a group is archived
 * @param group Group with responsible persons
 * @returns Result with success status and optional error
 */
export async function sendGroupArchivingEmail(
  group: GroupWithResponsiblePersons
): Promise<{ success: boolean; error?: any }> {
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
    return { success: false, error };
  }
}

/**
 * Send notification email when a status report is accepted
 * @param statusReport Status report with group information
 * @returns Result with success status and optional error
 */
export async function sendStatusReportAcceptanceEmail(
  statusReport: StatusReportWithGroup
): Promise<{ success: boolean; error?: any }> {
  try {
    if (!statusReport.group.responsiblePersons || statusReport.group.responsiblePersons.length === 0) {
      console.error(`No responsible persons found for group ${statusReport.group.id}`);
      return { success: false, error: 'No responsible persons found' };
    }
    
    const recipients = statusReport.group.responsiblePersons.map(person => person.email).join(',');
    const reportUrl = `${process.env.VERCEL_PROJECT_PRODUCTION_URL}/gruppen/${statusReport.group.slug}#report-${statusReport.id}`;
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
    return { success: false, error };
  }
}

/**
 * Send notification email when a status report is rejected
 * @param statusReport Status report with group information
 * @returns Result with success status and optional error
 */
export async function sendStatusReportRejectionEmail(
  statusReport: StatusReportWithGroup
): Promise<{ success: boolean; error?: any }> {
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
    return { success: false, error };
  }
}