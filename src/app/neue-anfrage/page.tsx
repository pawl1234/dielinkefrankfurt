'use client';

import AppointmentForm from '@/components/forms/appointments/AppointmentForm';
import FormPageLayout from '@/components/forms/shared/FormPageLayout';

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