// scripts/seed-reports.ts
import { PrismaClient, StatusReportStatus } from '@prisma/client';
import { faker } from '@faker-js/faker/locale/de';
import fs from 'fs';
import path from 'path';

// Initialize Prisma client
const prisma = new PrismaClient();

// Types for configuration
interface ReportSeedConfig {
  count: number;
  statuses: {
    NEW: number;       // percentage (0-100)
    ACTIVE: number;    // percentage (0-100)
    ARCHIVED: number;  // percentage (0-100)
    REJECTED: number;  // percentage (0-100)
  };
  withFiles: number;   // percentage (0-100)
  filesPerReport: {
    min: number;
    max: number;
  };
}

// Default configuration
const defaultConfig: ReportSeedConfig = {
  count: 25,
  statuses: {
    NEW: 25,
    ACTIVE: 45,
    ARCHIVED: 20,
    REJECTED: 10,
  },
  withFiles: 60,
  filesPerReport: {
    min: 1,
    max: 5
  }
};

// Mock file URLs
const mockFileUrls = [
  'https://example.com/files/report1.pdf',
  'https://example.com/files/image1.jpg',
  'https://example.com/files/presentation.pptx',
  'https://example.com/files/meeting-notes.docx',
  'https://example.com/files/infographic.png',
  'https://example.com/files/data-analysis.xlsx',
  'https://example.com/files/event-photo.jpg',
  'https://example.com/files/protocol.pdf',
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

// Generate a status report
const generateStatusReport = (config: ReportSeedConfig, group: any) => {
  // Determine status based on config percentages
  const statusRand = Math.random() * 100;
  let status: StatusReportStatus;
  
  if (statusRand < config.statuses.NEW) {
    status = StatusReportStatus.NEW;
  } else if (statusRand < config.statuses.NEW + config.statuses.ACTIVE) {
    status = StatusReportStatus.ACTIVE;
  } else if (statusRand < config.statuses.NEW + config.statuses.ACTIVE + config.statuses.ARCHIVED) {
    status = StatusReportStatus.ARCHIVED;
  } else {
    status = StatusReportStatus.REJECTED;
  }

  // Generate title
  const title = `Aktivitätsbericht: ${group.name} - ${faker.date.month()} ${new Date().getFullYear()}`;

  // Generate content with HTML formatting
  const content = `
    <h3>Aktivitäten des letzten Monats</h3>
    <p>${faker.lorem.paragraph(3)}</p>
    
    <h3>Durchgeführte Veranstaltungen</h3>
    <ul>
      ${Array.from({length: getRandomInt(2, 5)}, () => `<li>${faker.lorem.sentence()}</li>`).join('')}
    </ul>
    
    <h3>Ergebnisse und Erfolge</h3>
    <p>${faker.lorem.paragraph(2)}</p>
    
    <h3>Planungen für kommende Monate</h3>
    <p>${faker.lorem.paragraph(2)}</p>
  `;

  // Generate file URLs if needed
  let fileUrls: string | null = null;
  if (shouldInclude(config.withFiles)) {
    const numFiles = getRandomInt(config.filesPerReport.min, config.filesPerReport.max);
    const files = [];
    for (let i = 0; i < numFiles; i++) {
      files.push(getRandomItem(mockFileUrls));
    }
    fileUrls = JSON.stringify(files);
  }

  return {
    title,
    content,
    reporterFirstName: faker.person.firstName(),
    reporterLastName: faker.person.lastName(),
    fileUrls,
    status,
    groupId: group.id
  };
};

// Main function to create status reports
async function seedStatusReports(configPath?: string) {
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

  try {
    // Get all groups to associate reports with
    // Prefer ACTIVE groups, but use any if there aren't enough
    const activeGroups = await prisma.group.findMany({
      where: { status: 'ACTIVE' }
    });
    
    const allGroups = activeGroups.length > 0 
      ? activeGroups 
      : await prisma.group.findMany();

    if (allGroups.length === 0) {
      console.log('No groups found. Please create groups first using the seed-groups script.');
      return;
    }

    console.log(`Creating ${config.count} test status reports for ${allGroups.length} groups...`);

    // Generate and insert status reports
    for (let i = 0; i < config.count; i++) {
      // Pick a random group
      const group = getRandomItem(allGroups);
      const reportData = generateStatusReport(config, group);
      
      const report = await prisma.statusReport.create({
        data: reportData
      });
      
      console.log(`Created status report #${i + 1}: "${report.title}" (ID: ${report.id}, Status: ${report.status})`);
    }

    console.log('All status reports created successfully!');
  } catch (error) {
    console.error('Error creating status reports:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get config file path from command line arguments
const configPath = process.argv[2];

// Run the script
seedStatusReports(configPath)
  .catch((e: Error) => {
    console.error(e);
    process.exit(1);
  });