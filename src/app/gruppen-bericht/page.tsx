'use client';

import StatusReportForm from '@/components/StatusReportForm';
import FormPageLayout from '@/components/FormPageLayout';

export default function GruppenBerichtPage() {
  return (
    <FormPageLayout
      title="Neuen Gruppenbericht"
      subtitle="Online-Formular zur Einreichung von Arbeitsgruppenberichten."
      introText="Hier finden Sie alle Termine und wichtige Informationen für Mitglieder der Linken in Frankfurt."
      breadcrumbs={[
        { label: 'Start', href: '/' },
        { label: 'Neuer Gruppenbericht', href: '/gruppen-bericht', active: true },
      ]}
    >
      <StatusReportForm />
    </FormPageLayout>
  );
}