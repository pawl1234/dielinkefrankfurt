import { StatusReport, Group } from '@prisma/client';
import { subDays } from 'date-fns';
import { createMockStatusReport, createMockGroup } from '../test-utils';
import { createMockActiveGroup } from './group.factory';

// Re-export the existing createMockStatusReport for consistency
export { createMockStatusReport } from '../test-utils';

export function createMockStatusReportWithFiles(
  overrides?: Partial<StatusReport>,
  group?: Group
): StatusReport {
  return createMockStatusReport({
    fileUrls: JSON.stringify([
      'https://example.com/files/monatsbericht-januar.pdf',
      'https://example.com/files/aktivitaeten-fotos.zip',
      'https://example.com/files/pressemitteilung.docx'
    ]),
    ...overrides
  }, group);
}

export function createMockActiveStatusReport(
  overrides?: Partial<StatusReport>,
  group?: Group
): StatusReport {
  const activeGroup = group || createMockActiveGroup();
  return createMockStatusReport({
    status: 'ACTIVE',
    ...overrides
  }, activeGroup);
}

export function createMockRecentStatusReport(
  daysAgo: number = 3,
  overrides?: Partial<StatusReport>,
  group?: Group
): StatusReport {
  const createdAt = subDays(new Date(), daysAgo);
  return createMockStatusReport({
    createdAt,
    updatedAt: createdAt,
    ...overrides
  }, group);
}

export function createMockStatusReportForNewsletter(
  group?: Group,
  overrides?: Partial<StatusReport>
): StatusReport {
  const activeGroup = group || createMockActiveGroup({
    name: 'Fridays for Future Frankfurt',
    slug: 'fridays-for-future-frankfurt',
    logoUrl: 'https://example.com/logos/fff-logo.png'
  });
  
  return createMockActiveStatusReport({
    title: 'Klimastreik am Freitag - Großer Erfolg!',
    content: '<p>Am vergangenen Freitag haben über 5000 Menschen in Frankfurt für mehr Klimaschutz demonstriert. Die Demonstration startete am Hauptbahnhof und zog durch die Innenstadt zum Römerberg, wo eine Abschlusskundgebung stattfand.</p><p>Besonders erfreulich war die große Beteiligung von Schülerinnen und Schülern sowie die Unterstützung durch verschiedene Gewerkschaften und Umweltverbände.</p>',
    reporterFirstName: 'Lisa',
    reporterLastName: 'Neumann',
    createdAt: subDays(new Date(), 5),
    ...overrides
  }, activeGroup);
}

// Helper for creating form submission data
export function createMockStatusReportSubmission(
  groupId?: string,
  overrides?: Partial<Record<string, unknown>>
) {
  return {
    groupId: groupId || 'group-123',
    title: 'Monatsbericht Januar 2025',
    content: '<p>In diesem Monat haben wir verschiedene Aktivitäten durchgeführt:</p><ul><li>Wöchentliche Treffen jeden Mittwoch</li><li>Teilnahme an der Demo für bezahlbaren Wohnraum</li><li>Organisation eines Infoabends zum Thema Klimagerechtigkeit</li></ul><p>Für den kommenden Monat planen wir weitere Aktionen.</p>',
    reporterFirstName: 'Maria',
    reporterLastName: 'Weber',
    ...overrides
  };
}

export function createMockStatusReportFormData(
  groupId?: string,
  overrides?: Partial<Record<string, unknown>>
) {
  const submission = createMockStatusReportSubmission(groupId, overrides);
  
  return {
    groupId: submission.groupId,
    title: submission.title,
    content: submission.content,
    reporterFirstName: submission.reporterFirstName,
    reporterLastName: submission.reporterLastName,
    ...overrides
  };
}

// Helper for creating multiple status reports
export function createMockStatusReports(
  count: number,
  group?: Group,
  options?: {
    statusDistribution?: { NEW?: number; ACTIVE?: number; REJECTED?: number };
    dateRange?: { startDaysAgo: number; endDaysAgo: number };
  }
): StatusReport[] {
  const reports: StatusReport[] = [];
  const targetGroup = group || createMockActiveGroup();
  const distribution = options?.statusDistribution || { ACTIVE: count };
  
  let index = 0;
  Object.entries(distribution).forEach(([status, statusCount]) => {
    for (let i = 0; i < (statusCount || 0); i++) {
      const daysAgo = options?.dateRange 
        ? Math.floor(Math.random() * (options.dateRange.endDaysAgo - options.dateRange.startDaysAgo) + options.dateRange.startDaysAgo)
        : index * 7; // Default: one report per week
      
      reports.push(createMockStatusReport({
        id: `report-${index}`,
        title: `Bericht ${index + 1}`,
        status: status as 'NEW' | 'ACTIVE' | 'REJECTED',
        createdAt: subDays(new Date(), daysAgo),
        updatedAt: subDays(new Date(), daysAgo)
      }, targetGroup));
      index++;
    }
  });
  
  return reports;
}

// Helper for creating status reports for multiple groups
export function createMockStatusReportsByGroup(
  groupReportMap: Array<{ group: Group; reportCount: number }>
): Array<{ group: Group; reports: StatusReport[] }> {
  return groupReportMap.map(({ group, reportCount }) => ({
    group,
    reports: createMockStatusReports(reportCount, group, {
      statusDistribution: { ACTIVE: reportCount },
      dateRange: { startDaysAgo: 0, endDaysAgo: 14 } // Last 2 weeks
    })
  }));
}