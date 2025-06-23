export function createMockEmailList(name: string, count: number = 10): string[] {
  const emails: string[] = [];
  
  for (let i = 1; i <= count; i++) {
    emails.push(`${name}.user${i}@example.com`);
  }
  
  return emails;
}

export function createMockEmailRecipients(options?: {
  validCount?: number;
  invalidCount?: number;
  duplicateCount?: number;
}): string[] {
  const { validCount = 5, invalidCount = 0, duplicateCount = 0 } = options || {};
  
  const recipients: string[] = [];
  
  // Add valid emails
  for (let i = 1; i <= validCount; i++) {
    recipients.push(`user${i}@example.com`);
  }
  
  // Add invalid emails
  for (let i = 1; i <= invalidCount; i++) {
    recipients.push(`invalid-email-${i}`);
  }
  
  // Add duplicates
  for (let i = 1; i <= duplicateCount; i++) {
    recipients.push(`user1@example.com`); // Duplicate of first valid email
  }
  
  return recipients;
}

export function createMockEmailSendResult(email: string, success: boolean = true, error?: string) {
  return {
    email,
    success,
    error: error || null
  };
}

export function createMockFailedEmails(count: number = 3): Array<{ email: string; error: string }> {
  const failedEmails = [];
  
  for (let i = 1; i <= count; i++) {
    failedEmails.push({
      email: `failed${i}@example.com`,
      error: `Failed to send email: Rate limit exceeded`
    });
  }
  
  return failedEmails;
}

export function createMockRecipientsList(): Record<string, string[]> {
  return {
    'list1': createMockEmailList('list1', 50),
    'list2': createMockEmailList('list2', 30),
    'list3': createMockEmailList('list3', 20),
    'test-list': ['test1@example.com', 'test2@example.com']
  };
}