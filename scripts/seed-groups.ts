// scripts/seed-groups.ts
import { PrismaClient, GroupStatus } from '@prisma/client';
import { faker } from '@faker-js/faker/locale/de';
import fs from 'fs';
import path from 'path';
import slugify from 'slugify';

// Initialize Prisma client
const prisma = new PrismaClient();

// Types for configuration
interface GroupSeedConfig {
  count: number;
  statuses: {
    NEW: number;    // percentage (0-100)
    ACTIVE: number; // percentage (0-100)
    ARCHIVED: number; // percentage (0-100)
  };
  withLogo: number; // percentage (0-100)
  withResponsiblePersons: { // how many responsible persons per group
    min: number;
    max: number;
  };
}

// Default configuration
const defaultConfig: GroupSeedConfig = {
  count: 15,
  statuses: {
    NEW: 20,
    ACTIVE: 70,
    ARCHIVED: 10,
  },
  withLogo: 60,
  withResponsiblePersons: {
    min: 1,
    max: 3
  }
};

// Group types for selection
const groupTypes = [
  'Ortsverein',
  'Arbeitskreis',
  'Stadtteilgruppe',
  'Projekt',
  'Initiative',
  'Themengruppe',
];

// Mock logo URLs
const mockLogoUrls = [
  'https://example.com/logos/logo1.png',
  'https://example.com/logos/logo2.png',
  'https://example.com/logos/logo3.png',
  'https://example.com/logos/logo4.png',
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

// Generate a unique slug from name
const generateSlug = (name: string, existingSlugs: Set<string>): string => {
  const baseSlug = slugify(name, { lower: true, strict: true });
  let slug = baseSlug;
  let counter = 1;
  
  // Ensure slug is unique
  while (existingSlugs.has(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  existingSlugs.add(slug);
  return slug;
};

// Generate a random group with responsible persons
const generateGroup = (config: GroupSeedConfig, existingSlugs: Set<string>) => {
  // Determine status based on config percentages
  const statusRand = Math.random() * 100;
  let status: GroupStatus;
  
  if (statusRand < config.statuses.NEW) {
    status = GroupStatus.NEW;
  } else if (statusRand < config.statuses.NEW + config.statuses.ACTIVE) {
    status = GroupStatus.ACTIVE;
  } else {
    status = GroupStatus.ARCHIVED;
  }

  // Generate group name
  const groupType = getRandomItem(groupTypes);
  const topic = faker.lorem.words(getRandomInt(1, 3));
  const name = `${groupType} ${topic}`;
  
  // Generate unique slug
  const slug = generateSlug(name, existingSlugs);

  // Generate description with HTML formatting
  const description = `
    <p>${faker.lorem.paragraph(3)}</p>
    <h4>Unsere Ziele</h4>
    <ul>
      ${Array.from({length: getRandomInt(2, 5)}, () => `<li>${faker.lorem.sentence()}</li>`).join('')}
    </ul>
    <p>${faker.lorem.paragraph(2)}</p>
  `;

  // Generate logo URL if needed
  let logoUrl: string | null = null;
  if (shouldInclude(config.withLogo)) {
    logoUrl = getRandomItem(mockLogoUrls);
  }

  // Generate metadata with original logo URL if applicable
  const metadata = logoUrl ? JSON.stringify({
    originalLogoUrl: logoUrl
  }) : null;

  // Generate responsible persons
  const responsiblePersonCount = getRandomInt(
    config.withResponsiblePersons.min,
    config.withResponsiblePersons.max
  );
  
  const responsiblePersons = Array.from({ length: responsiblePersonCount }, () => ({
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email(),
  }));

  return {
    name,
    slug,
    description,
    logoUrl,
    metadata,
    status,
    responsiblePersons,
  };
};

// Main function to create groups
async function seedGroups(configPath?: string) {
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

  console.log(`Creating ${config.count} test groups...`);

  try {
    // Keep track of existing slugs to ensure uniqueness
    const existingSlugs = new Set<string>();
    
    // Get existing slugs from database
    const existingGroups = await prisma.group.findMany({
      select: { slug: true }
    });
    existingGroups.forEach(group => existingSlugs.add(group.slug));

    // Generate and insert groups
    for (let i = 0; i < config.count; i++) {
      const groupData = generateGroup(config, existingSlugs);
      const { responsiblePersons, ...groupDetails } = groupData;
      
      // Create group and its responsible persons
      const group = await prisma.group.create({
        data: {
          ...groupDetails,
          responsiblePersons: {
            create: responsiblePersons
          }
        },
        include: {
          responsiblePersons: true
        }
      });
      
      console.log(`Created group #${i + 1}: "${group.name}" (ID: ${group.id}, Status: ${group.status})`);
      console.log(`- Added ${group.responsiblePersons.length} responsible persons`);
    }

    console.log('All groups created successfully!');
  } catch (error) {
    console.error('Error creating groups:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get config file path from command line arguments
const configPath = process.argv[2];

// Run the script
seedGroups(configPath)
  .catch((e: Error) => {
    console.error(e);
    process.exit(1);
  });