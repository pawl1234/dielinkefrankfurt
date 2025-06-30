import { Group, ResponsiblePerson } from '@prisma/client';
import { createMockGroup } from '../test-utils';

// Re-export the existing createMockGroup for consistency
export { createMockGroup } from '../test-utils';

export function createMockGroupWithResponsiblePersons(
  personCount: number = 2,
  groupOverrides?: Partial<Group>,
  personOverrides?: Partial<ResponsiblePerson>[]
): Group & { responsiblePersons: ResponsiblePerson[] } {
  const group = createMockGroup(groupOverrides);
  
  const responsiblePersons: ResponsiblePerson[] = Array.from({ length: personCount }, (_, index) => ({
    id: `person-${group.id}-${index}`,
    firstName: ['Anna', 'Peter', 'Maria', 'Thomas'][index] || `Person${index}`,
    lastName: ['Schmidt', 'Müller', 'Weber', 'Fischer'][index] || `Lastname${index}`,
    email: `${['anna.schmidt', 'peter.mueller', 'maria.weber', 'thomas.fischer'][index] || `person${index}`}@example.com`,
    groupId: group.id,
    ...(personOverrides?.[index] || {})
  }));
  
  return {
    ...group,
    responsiblePersons
  };
}

export function createMockActiveGroup(overrides?: Partial<Group>): Group {
  return createMockGroup({
    status: 'ACTIVE',
    ...overrides
  });
}

export function createMockArchivedGroup(overrides?: Partial<Group>): Group {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  
  return createMockGroup({
    status: 'ARCHIVED',
    updatedAt: threeMonthsAgo,
    ...overrides
  });
}

export function createMockGroupWithLogo(overrides?: Partial<Group>): Group {
  return createMockGroup({
    logoUrl: 'https://example.com/logos/gruppe-logo.png',
    ...overrides
  });
}

// Helper for creating form submission data
export function createMockGroupSubmission(overrides?: Partial<Record<string, unknown>>) {
  return {
    name: 'Fridays for Future Frankfurt',
    description: '<p>Wir sind die Ortsgruppe von Fridays for Future in Frankfurt. Wir setzen uns für Klimagerechtigkeit und eine nachhaltige Zukunft ein. Unsere Mission ist es, politische Entscheidungsträger zum Handeln gegen den Klimawandel zu bewegen.</p>',
    responsiblePersons: [
      {
        firstName: 'Anna',
        lastName: 'Schmidt',
        email: 'anna.schmidt@example.com'
      },
      {
        firstName: 'Peter',
        lastName: 'Müller',
        email: 'peter.mueller@example.com'
      }
    ],
    ...overrides
  };
}

export function createMockGroupFormData(overrides?: Partial<Record<string, unknown>>) {
  const submission = createMockGroupSubmission(overrides);
  
  // Convert to format expected by API - don't spread overrides again
  const formData: Record<string, unknown> = {
    name: submission.name,
    description: submission.description,
    responsiblePersons: JSON.stringify(submission.responsiblePersons)
  };
  
  // Handle specific overrides that need special processing
  if (overrides?.responsiblePersons && typeof overrides.responsiblePersons === 'string') {
    formData.responsiblePersons = overrides.responsiblePersons;
  }
  
  return formData;
}

// Helper for creating a group with specific slug
export function createMockGroupWithSlug(slug: string, overrides?: Partial<Group>): Group {
  return createMockGroup({
    slug,
    name: slug.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' '),
    ...overrides
  });
}

// Helper for creating multiple groups
export function createMockGroups(
  count: number,
  statusDistribution?: { NEW?: number; ACTIVE?: number; ARCHIVED?: number; REJECTED?: number }
): Group[] {
  const groups: Group[] = [];
  const distribution = statusDistribution || { ACTIVE: count };
  
  let index = 0;
  Object.entries(distribution).forEach(([status, statusCount]) => {
    for (let i = 0; i < (statusCount || 0); i++) {
      groups.push(createMockGroup({
        id: `group-${index}`,
        name: `Test Group ${index}`,
        slug: `test-group-${index}`,
        status: status as 'NEW' | 'ACTIVE' | 'ARCHIVED' | 'REJECTED'
      }));
      index++;
    }
  });
  
  return groups;
}