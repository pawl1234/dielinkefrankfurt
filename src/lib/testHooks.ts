// This file contains testing helpers for the application

import { formatEmailBody } from './emailUtils';

export async function testEmailFormatting() {
  // Sample data
  const testData = {
    teaser: 'Test Event in Frankfurt',
    mainText: '<p>This is a test event for our newsletter.</p>',
    startDateTime: new Date('2025-06-01T18:00:00').toISOString(),
    endDateTime: new Date('2025-06-01T20:00:00').toISOString(),
    street: 'Teststraße 123',
    city: 'Frankfurt',
    state: 'Hessen',
    postalCode: '60311',
    firstName: 'Max',
    lastName: 'Mustermann',
    recurringText: 'Every first Sunday of the month',
  };

  // Format the email body
  const emailBody = formatEmailBody(testData);
  
  return {
    emailBody,
    originalData: testData
  };
}

export async function testFormSubmission(formData: FormData) {
  // This is a mock function for testing form submission
  // In a real application, this would send the data to the server
  
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate server response
      resolve({
        success: true,
        message: 'Form submitted successfully',
      });
    }, 1000);
  });
}