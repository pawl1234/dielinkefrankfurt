// scripts/seed-appointments.ts
const { PrismaClient } = require('@prisma/client');
const { faker } = require('@faker-js/faker/locale/de');
const { format, addDays, subDays, addHours } = require('date-fns');
const fs = require('fs');
const path = require('path');

// Initialize Prisma Client
const prisma = new PrismaClient();

// Types for configuration
interface AppointmentSeedConfig {
  count: number;
  statuses: {
    pending: number;   // percentage (0-100)
    accepted: number;  // percentage (0-100)
    rejected: number;  // percentage (0-100)
  };
  dateSplit: {
    past: number;      // percentage (0-100)
    current: number;   // percentage (0-100)
    future: number;    // percentage (0-100)
  };
  featured: number;    // percentage (0-100)
  withFileUrls: number; // percentage (0-100)
  withCoverImages: number; // percentage (0-100)
}

// Locations in Frankfurt for test data
const frankfurtLocations = [
  {
    street: 'Römerberg 23',
    city: 'Frankfurt am Main',
    state: 'Hessen',
    postalCode: '60311',
  },
  {
    street: 'Mainkai 17',
    city: 'Frankfurt am Main',
    state: 'Hessen',
    postalCode: '60311',
  },
  {
    street: 'Berger Straße 121',
    city: 'Frankfurt am Main',
    state: 'Hessen',
    postalCode: '60385',
  },
  {
    street: 'Zeil 106',
    city: 'Frankfurt am Main',
    state: 'Hessen',
    postalCode: '60313',
  },
  {
    street: 'Kaiserstraße 56',
    city: 'Frankfurt am Main',
    state: 'Hessen',
    postalCode: '60329',
  },
];

// Default configuration
const defaultConfig: AppointmentSeedConfig = {
  count: 20,
  statuses: {
    pending: 30,
    accepted: 50,
    rejected: 20,
  },
  dateSplit: {
    past: 20,
    current: 30,
    future: 50,
  },
  featured: 30,
  withFileUrls: 40,
  withCoverImages: 20,
};

// Sample mock file URLs (replace with your actual test URLs)
const mockFileUrls = [
  'https://example.com/files/document1.pdf',
  'https://example.com/files/image1.jpg',
  'https://example.com/files/image2.png',
  'https://example.com/files/document2.pdf',
];

const mockCoverImageUrls = [
  'https://example.com/covers/cover1.jpg',
  'https://example.com/covers/cover2.jpg',
  'https://example.com/covers/cover3.jpg',
  'https://example.com/covers/cover4.jpg',
];

// Helper functions
const getRandomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const getRandomItem = <T>(items: T[]): T => {
  return items[Math.floor(Math.random() * items.length)];
};

const shouldInclude = (percentage: number): boolean => {
  return Math.random() * 100 < percentage;
};

// Generate a random appointment
const generateAppointment = (config: AppointmentSeedConfig) => {
  // Determine status based on config percentages
  const statusRand = Math.random() * 100;
  let status: 'pending' | 'accepted' | 'rejected';
  
  if (statusRand < config.statuses.pending) {
    status = 'pending';
  } else if (statusRand < config.statuses.pending + config.statuses.accepted) {
    status = 'accepted';
  } else {
    status = 'rejected';
  }

  // Determine date range
  const dateRand = Math.random() * 100;
  let startDateTime: Date;
  
  if (dateRand < config.dateSplit.past) {
    // Past appointment (1-60 days ago)
    startDateTime = subDays(new Date(), getRandomInt(1, 60));
  } else if (dateRand < config.dateSplit.past + config.dateSplit.current) {
    // Current appointment (today to 7 days)
    startDateTime = addDays(new Date(), getRandomInt(0, 7));
  } else {
    // Future appointment (8-120 days ahead)
    startDateTime = addDays(new Date(), getRandomInt(8, 120));
  }

  // Random end time 1-4 hours after start
  const endDateTime = addHours(startDateTime, getRandomInt(1, 4));

  // Determine if it should be featured
  const featured = shouldInclude(config.featured);

  // Randomly select a location
  const location = getRandomItem(frankfurtLocations);

  // Generate file URLs if needed
  let fileUrls: string | null = null;
  if (shouldInclude(config.withFileUrls)) {
    const numFiles = getRandomInt(1, 3);
    const files = [];
    for (let i = 0; i < numFiles; i++) {
      files.push(getRandomItem(mockFileUrls));
    }
    fileUrls = JSON.stringify(files);
  }

  // Generate cover image metadata if needed and if featured
  let metadata: string | null = null;
  if (featured && shouldInclude(config.withCoverImages)) {
    const coverImageUrl = getRandomItem(mockCoverImageUrls);
    const croppedCoverImageUrl = coverImageUrl.replace('.jpg', '_crop.jpg');
    metadata = JSON.stringify({
      coverImageUrl,
      croppedCoverImageUrl
    });
  }

  // Generate mainText with some HTML content
  const mainText = `
    <p>${faker.lorem.paragraph(5)}</p>
    <h3>${faker.lorem.words(3)}</h3>
    <p>${faker.lorem.paragraph(3)}</p>
    <ul>
      ${faker.lorem.words(5).split(' ').map((word: string) => `<li>${word}</li>`).join('')}
    </ul>
    <p>${faker.lorem.paragraph(2)}</p>
  `;

  // Return appointment data
  return {
    title: faker.lorem.words(getRandomInt(3, 6)),
    teaser: faker.lorem.sentence(),
    mainText,
    startDateTime,
    endDateTime,
    street: location.street,
    city: location.city,
    state: location.state,
    postalCode: location.postalCode,
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    recurringText: shouldInclude(30) ? `Findet jeden ${getRandomItem(['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'])} statt.` : null,
    fileUrls,
    featured,
    metadata,
    status,
    processed: status === 'accepted', // If accepted, mark as processed
    processingDate: status === 'accepted' ? new Date() : null,
  };
};

// Main function to create appointments
async function seedAppointments(configPath?: string) {
  let config = defaultConfig;

  // If config file path provided, load from file
  if (configPath) {
    try {
      const configFile = fs.readFileSync(path.resolve(configPath), 'utf-8');
      config = { ...defaultConfig, ...JSON.parse(configFile) };
      console.log('Loaded configuration from', configPath);
    } catch (error) {
      console.error('Error loading configuration file:', error);
      console.log('Using default configuration instead.');
    }
  }

  console.log(`Creating ${config.count} test appointments...`);

  try {
    // Generate and insert appointments
    for (let i = 0; i < config.count; i++) {
      const appointmentData = generateAppointment(config);
      const appointment = await prisma.appointment.create({
        data: appointmentData
      });
      
      console.log(`Created appointment #${i + 1}: "${appointment.title}" (ID: ${appointment.id}, Status: ${appointment.status})`);
    }

    console.log('All appointments created successfully!');
  } catch (error) {
    console.error('Error creating appointments:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get config file path from command line arguments
const configPath = process.argv[2];

// Run the script
seedAppointments(configPath)
  .catch((e: Error) => {
    console.error(e);
    process.exit(1);
  });