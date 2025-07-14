/**
 * Adds tracking pixel and rewrites links in newsletter HTML
 * 
 * @param html - The newsletter HTML content
 * @param analyticsToken - The unique token for tracking
 * @param baseUrl - The base URL of the application
 * @returns Modified HTML with tracking
 */
export function addTrackingToNewsletter(
  html: string,
  analyticsToken: string,
  baseUrl: string
): string {
  // Add tracking pixel at the end of the email
  const pixelUrl = `${baseUrl}/api/newsletter/track/pixel/${analyticsToken}`;
  const pixel = `<img src="${pixelUrl}" width="1" height="1" style="display:none" alt="" />`;
  
  // Replace appointments and status report links with tracking links
  let modifiedHtml = html.replace(
    /href="(https?:\/\/[^"]*\/(termine|gruppen)\/[^"]+)"/g,
    (match, url) => {
      // Determine link type
      const linkType = url.includes('/termine/') ? 'appointment' : 'statusreport';
      
      // Extract ID from URL
      let linkId = null;
      const appointmentMatch = url.match(/\/termine\/(\d+)/);
      const statusReportMatch = url.match(/#report-([a-zA-Z0-9]+)/);
      
      if (appointmentMatch) {
        linkId = appointmentMatch[1];
      } else if (statusReportMatch) {
        linkId = statusReportMatch[1];
      }
      
      // Encode the original URL
      const encodedUrl = Buffer.from(url).toString('base64url');
      
      // Create tracking URL
      const trackingUrl = `${baseUrl}/api/newsletter/track/click/${analyticsToken}?url=${encodedUrl}&type=${linkType}${linkId ? `&id=${linkId}` : ''}`;
      
      return `href="${trackingUrl}"`;
    }
  );
  
  // Add pixel before closing body tag or at the end
  if (modifiedHtml.includes('</body>')) {
    modifiedHtml = modifiedHtml.replace('</body>', `${pixel}</body>`);
  } else {
    modifiedHtml += pixel;
  }
  
  return modifiedHtml;
}