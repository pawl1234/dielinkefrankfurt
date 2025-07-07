import { faker } from '@faker-js/faker/locale/de';
import type { AntragPurposes } from '@/types/api-types';
import type { AntragCreateData } from '@/lib/db/antrag-operations';
import type { Antrag, AntragStatus } from '@prisma/client';

/**
 * Factory for creating test Antrag data
 */
export class AntragFactory {
  /**
   * Create valid purposes data with at least one enabled purpose
   */
  static createPurposes(overrides?: Partial<AntragPurposes>): AntragPurposes {
    const defaults: AntragPurposes = {
      zuschuss: {
        enabled: true,
        amount: faker.number.int({ min: 100, max: 5000 })
      },
      personelleUnterstuetzung: {
        enabled: faker.datatype.boolean(),
        details: faker.lorem.sentence()
      },
      raumbuchung: {
        enabled: faker.datatype.boolean(),
        location: faker.company.name(),
        numberOfPeople: faker.number.int({ min: 5, max: 100 }),
        details: faker.lorem.sentence()
      },
      weiteres: {
        enabled: faker.datatype.boolean(),
        details: faker.lorem.paragraph()
      }
    };
    
    const purposes = { ...defaults, ...overrides };
    
    // Ensure at least one purpose is enabled
    const hasEnabledPurpose = Object.values(purposes).some(
      purpose => purpose && typeof purpose === 'object' && purpose.enabled === true
    );
    
    if (!hasEnabledPurpose) {
      purposes.zuschuss = { enabled: true, amount: 1000 };
    }
    
    return purposes;
  }
  
  /**
   * Create data for creating a new Antrag
   */
  static createData(overrides?: Partial<AntragCreateData>): AntragCreateData {
    return {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email(),
      title: faker.lorem.sentence({ min: 3, max: 10 }),
      summary: faker.lorem.paragraph({ min: 2, max: 4 }),
      purposes: this.createPurposes(),
      fileUrls: faker.datatype.boolean() ? [faker.internet.url(), faker.internet.url()] : undefined,
      ...overrides
    };
  }
  
  /**
   * Create a complete Antrag object (as returned from database)
   */
  static create(overrides?: Partial<Antrag>): Antrag {
    const data = this.createData();
    const now = new Date();
    
    return {
      id: faker.string.uuid(),
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      title: data.title,
      summary: data.summary,
      purposes: JSON.stringify(data.purposes),
      fileUrls: data.fileUrls ? JSON.stringify(data.fileUrls) : null,
      status: 'NEU' as AntragStatus,
      decisionComment: null,
      decidedBy: null,
      decidedAt: null,
      createdAt: faker.date.recent({ days: 30 }),
      updatedAt: now,
      ...overrides
    };
  }
  
  /**
   * Create multiple Anträge
   */
  static createMany(count: number, overrides?: Partial<Antrag>): Antrag[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
  
  /**
   * Create an accepted Antrag
   */
  static createAccepted(overrides?: Partial<Antrag>): Antrag {
    return this.create({
      status: 'AKZEPTIERT' as AntragStatus,
      decisionComment: faker.lorem.sentence(),
      decidedBy: faker.internet.userName(),
      decidedAt: faker.date.recent({ days: 5 }),
      ...overrides
    });
  }
  
  /**
   * Create a rejected Antrag
   */
  static createRejected(overrides?: Partial<Antrag>): Antrag {
    return this.create({
      status: 'ABGELEHNT' as AntragStatus,
      decisionComment: faker.lorem.sentence(),
      decidedBy: faker.internet.userName(),
      decidedAt: faker.date.recent({ days: 5 }),
      ...overrides
    });
  }
  
  /**
   * Create invalid data for testing validation
   */
  static createInvalidData(invalidField: keyof AntragCreateData): AntragCreateData {
    const validData = this.createData();
    
    switch (invalidField) {
      case 'firstName':
        return { ...validData, firstName: 'A' }; // Too short
      case 'lastName':
        return { ...validData, lastName: '' }; // Empty
      case 'email':
        return { ...validData, email: 'invalid-email' }; // Invalid format
      case 'title':
        return { ...validData, title: 'AB' }; // Too short
      case 'summary':
        return { ...validData, summary: 'Too short' }; // Too short
      case 'purposes':
        return { ...validData, purposes: {} as AntragPurposes }; // No enabled purposes
      default:
        return validData;
    }
  }
}