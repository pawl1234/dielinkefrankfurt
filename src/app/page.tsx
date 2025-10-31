import { MainLayout } from '@/components/layout/MainLayout';
import { Container } from '@mui/material';
import HomePageHeader from '@/components/layout/HomePageHeader';
import { findAppointmentsPartial } from '@/lib/db/appointment-operations';
import { getPublicGroups } from '@/lib/groups';
import { PaginatedResponse } from '@/types/api-types';
import { PublicAppointment } from '@/types/component-types';
import { Group } from '@prisma/client';
import { logger } from '@/lib/logger';
import AppointmentsSectionServer from '@/components/layout/AppointmentsSectionServer';
import GroupsSectionServer from '@/components/layout/GroupsSectionServer';

/**
 * Revalidate page every 5 minutes to show fresh appointment/group data.
 * This balances data freshness with server performance.
 * Adjust if data update frequency changes.
 */
export const revalidate = 300; // 5 minutes

/**
 * Homepage server component with URL-based pagination.
 * Fetches appointments and groups data on the server for SEO and performance.
 * Supports independent pagination for appointments (aPage) and groups (gPage).
 *
 * @param searchParams - URL search parameters containing page numbers
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ aPage?: string; gPage?: string }>;
}) {
  const params = await searchParams;

  // Parse and validate page numbers (default to 1, handle invalid values)
  const aPage = Math.max(1, parseInt(params.aPage || '1', 10)) || 1;
  const gPage = Math.max(1, parseInt(params.gPage || '1', 10)) || 1;

  // Fetch appointments and groups in parallel for better performance
  const [appointmentsResult, groupsResult] = await Promise.allSettled([
    // Fetch appointments
    (async () => {
      const filter = { status: 'accepted', startDateTime: { gte: new Date() } };
      const select = {
        id: true,
        title: true,
        mainText: true,
        startDateTime: true,
        endDateTime: true,
        street: true,
        city: true,
        locationDetails: true,
        postalCode: true,
        slug: true,
        featured: true
      };
      return await findAppointmentsPartial(
        filter,
        aPage,
        5,
        { startDateTime: 'asc' },
        select
      );
    })(),
    // Fetch groups
    getPublicGroups(gPage, 9)
  ]);

  // Process appointments result with error handling
  let appointmentsData: PaginatedResponse<PublicAppointment>;
  if (appointmentsResult.status === 'fulfilled') {
    appointmentsData = appointmentsResult.value as PaginatedResponse<PublicAppointment>;
    logger.info('Fetched appointments for homepage', {
      module: 'homepage',
      context: { page: aPage, itemCount: appointmentsData.items.length }
    });
  } else {
    logger.error('Failed to fetch appointments', {
      module: 'homepage',
      context: { page: aPage, error: appointmentsResult.reason }
    });
    // Graceful degradation: show empty state instead of crashing
    appointmentsData = {
      items: [],
      totalItems: 0,
      page: aPage,
      pageSize: 5,
      totalPages: 0
    };
  }

  // Process groups result with error handling
  let groupsData: PaginatedResponse<Group>;
  if (groupsResult.status === 'fulfilled') {
    const result = groupsResult.value as PaginatedResponse<Group> | Group[];
    // getPublicGroups returns either PaginatedResponse or array, ensure we have PaginatedResponse
    if (Array.isArray(result)) {
      groupsData = {
        items: result,
        totalItems: result.length,
        page: gPage,
        pageSize: 9,
        totalPages: Math.ceil(result.length / 9)
      };
    } else {
      groupsData = result;
    }
    logger.info('Fetched groups for homepage', {
      module: 'homepage',
      context: { page: gPage, itemCount: groupsData.items.length }
    });
  } else {
    logger.error('Failed to fetch groups', {
      module: 'homepage',
      context: { page: gPage, error: groupsResult.reason }
    });
    groupsData = {
      items: [],
      totalItems: 0,
      page: gPage,
      pageSize: 9,
      totalPages: 0
    };
  }

  return (
    <MainLayout
      breadcrumbs={[
        { label: 'Start', href: '/', active: true }
      ]}
    >
      <Container maxWidth="lg">
        <HomePageHeader
          mainTitle="Die Linke Frankfurt"
          subtitle="Willkommen auf unserem Mitgliederportal."
          introText="Hier finden Sie alle Termine und wichtige Informationen für Mitglieder der Linken in Frankfurt."
        />
        <AppointmentsSectionServer
          appointments={appointmentsData}
          currentPage={aPage}
          groupsPage={gPage}
        />
        <GroupsSectionServer
          groups={groupsData}
          currentPage={gPage}
          appointmentsPage={aPage}
        />
      </Container>
    </MainLayout>
  );
}