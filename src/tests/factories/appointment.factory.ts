import { Appointment } from '@prisma/client';
import { addDays, addHours, startOfDay } from 'date-fns';

export function createMockAppointment(overrides?: Partial<Appointment>): Appointment {
  const now = new Date();
  const tomorrow = addDays(now, 1);
  const startDateTime = addHours(startOfDay(tomorrow), 19); // 7 PM tomorrow
  const endDateTime = addHours(startDateTime, 2); // 2 hours duration
  
  return {
    id: overrides?.id || `appointment-${Math.floor(Math.random() * 10000)}`,
    title: 'Mitgliederversammlung Die Linke Frankfurt',
    slug: 'mitgliederversammlung-die-linke-frankfurt-2025',
    mainText: '<p>Herzlich willkommen zur monatlichen Mitgliederversammlung. Wir besprechen aktuelle politische Themen und planen kommende Aktionen.</p>',
    startDateTime,
    endDateTime,
    location: 'Studierendenhaus',
    street: 'Mertonstraße 26',
    city: 'Frankfurt am Main',
    state: 'Hessen',
    postalCode: '60325',
    organizerType: 'ORGANIZATION',
    organizationName: 'Die Linke Frankfurt',
    contactFirstName: null,
    contactLastName: null,
    contactEmail: 'info@die-linke-frankfurt.de',
    contactPhone: '+49 69 123456',
    ticketUrl: null,
    websiteUrl: 'https://die-linke-frankfurt.de',
    createdAt: now,
    updatedAt: now,
    status: 'pending',
    featured: false,
    processingDate: null,
    processed: false,
    firstName: 'Max',
    lastName: 'Mustermann',
    email: 'max.mustermann@example.com',
    phone: '+49 171 1234567',
    socialMediaHandles: JSON.stringify({
      twitter: '@dielinkeFFM',
      instagram: 'dielinke_frankfurt'
    }),
    rejectionReason: null,
    fileUrls: null,
    coverImageUrl: null,
    statusChangeDate: null,
    ...overrides
  };
}

export function createMockAppointmentWithFiles(overrides?: Partial<Appointment>): Appointment {
  return createMockAppointment({
    fileUrls: JSON.stringify([
      'https://example.com/files/flyer-mitgliederversammlung.pdf',
      'https://example.com/files/tagesordnung.pdf'
    ]),
    coverImageUrl: 'https://example.com/images/event-cover.jpg',
    ...overrides
  });
}

export function createMockAppointmentInPast(overrides?: Partial<Appointment>): Appointment {
  const yesterday = addDays(new Date(), -1);
  const startDateTime = addHours(startOfDay(yesterday), 19);
  const endDateTime = addHours(startDateTime, 2);
  
  return createMockAppointment({
    startDateTime,
    endDateTime,
    ...overrides
  });
}

export function createMockAppointmentInFuture(daysInFuture: number = 7, overrides?: Partial<Appointment>): Appointment {
  const futureDate = addDays(new Date(), daysInFuture);
  const startDateTime = addHours(startOfDay(futureDate), 19);
  const endDateTime = addHours(startDateTime, 2);
  
  return createMockAppointment({
    startDateTime,
    endDateTime,
    ...overrides
  });
}

export function createMockAppointmentWithStatus(
  status: 'pending' | 'accepted' | 'rejected' | 'NEW' | 'ACTIVE' | 'REJECTED',
  overrides?: Partial<Appointment>
): Appointment {
  const statusDefaults: Partial<Appointment> = {};
  
  // Map old status values to new ones for backward compatibility
  const normalizedStatus = status === 'NEW' ? 'pending' : 
                          status === 'ACTIVE' ? 'accepted' : 
                          status === 'REJECTED' ? 'rejected' : status;
  
  switch (normalizedStatus) {
    case 'accepted':
      statusDefaults.status = 'accepted';
      statusDefaults.processed = true;
      statusDefaults.processingDate = new Date();
      statusDefaults.statusChangeDate = new Date();
      break;
    case 'rejected':
      statusDefaults.status = 'rejected';
      statusDefaults.processed = true;
      statusDefaults.processingDate = new Date();
      statusDefaults.statusChangeDate = new Date();
      statusDefaults.rejectionReason = 'Veranstaltung entspricht nicht unseren Richtlinien';
      break;
    default:
      statusDefaults.status = 'pending';
      statusDefaults.processed = false;
  }
  
  return createMockAppointment({
    ...statusDefaults,
    ...overrides
  });
}

export function createMockFeaturedAppointment(overrides?: Partial<Appointment>): Appointment {
  return createMockAppointment({
    status: 'accepted',
    featured: true,
    processed: true,
    processingDate: new Date(),
    ...overrides
  });
}

// Helper for creating form submission data
export function createMockAppointmentFormData(overrides?: Partial<Record<string, unknown>>) {
  const tomorrow = addDays(new Date(), 1);
  const startDateTime = addHours(startOfDay(tomorrow), 19);
  const endDateTime = addHours(startDateTime, 2);
  
  return {
    title: 'Test Appointment',
    mainText: '<p>Herzlich willkommen zur monatlichen Mitgliederversammlung. Wir besprechen aktuelle politische Themen und planen kommende Aktionen.</p>',
    startDateTime: startDateTime.toISOString(),
    endDateTime: endDateTime.toISOString(),
    location: 'Studierendenhaus',
    street: 'Mertonstraße 26',
    city: 'Frankfurt am Main',
    state: 'Hessen',
    postalCode: '60325',
    organizerType: 'ORGANIZATION',
    organizationName: 'Die Linke Frankfurt',
    contactEmail: 'info@die-linke-frankfurt.de',
    contactPhone: '+49 69 123456',
    websiteUrl: 'https://die-linke-frankfurt.de',
    firstName: 'Max',
    lastName: 'Mustermann',
    email: 'max.mustermann@example.com',
    phone: '+49 171 1234567',
    socialMediaHandles: {
      twitter: '@dielinkeFFM',
      instagram: 'dielinke_frankfurt'
    },
    ...overrides
  };
}