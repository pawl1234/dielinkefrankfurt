'use client';

import AppointmentForm from '@/components/AppointmentForm';
import FormPageLayout from '@/components/FormPageLayout';
import FormSection from '@/components/FormSection';
import { Typography } from '@mui/material';

export default function NewAppointmentPage() {
  return (
    <FormPageLayout
      title="Neuer Termin"
      subtitle="Online-Formular zur Einreichung von Veranstaltungen"
      introText="Das nachfolgende Formular bietet die Möglichkeit neue Termine in den Kalender und den Newsletter aufnehmen zu lassen. Es erfolgt eine Freigabe durch den Kreisvorstand."
      breadcrumbs={[
        { label: 'Start', href: '/' },
        { label: 'Neue Termin Anfrage', href: '/neue-anfrage', active: true },
      ]}
    >
      <AppointmentForm />
    </FormPageLayout>
  );
}