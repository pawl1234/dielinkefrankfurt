import AntragForm from '@/components/forms/antraege/AntragForm';
import FormPageLayout from '@/components/forms/shared/FormPageLayout';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Antrag an Kreisvorstand | Die Linke Frankfurt',
  description: 'Online-Formular zur Einreichung von Anträgen an den Kreisvorstand der Linken Frankfurt. Beantragen Sie finanzielle Unterstützung, personelle Hilfe oder Raumnutzung.',
  keywords: 'Antrag, Kreisvorstand, Die Linke Frankfurt, finanzielle Unterstützung, Förderung, Raumbuchung',
  openGraph: {
    title: 'Antrag an Kreisvorstand | Die Linke Frankfurt',
    description: 'Reichen Sie Ihren Antrag an den Kreisvorstand der Linken Frankfurt ein',
    type: 'website',
  },
};

export default function AntragAnKreisvorstandPage() {
  return (
    <FormPageLayout
      title="Antrag an Kreisvorstand"
      subtitle="Online-Formular zur Einreichung von Anträgen"
      introText="Das nachfolgende Formular bietet die Möglichkeit, Anträge an den Kreisvorstand zu stellen. Sie können finanzielle Unterstützung, personelle Hilfe, Raumnutzung oder andere Unterstützung beantragen. Alle Anträge werden vom Kreisvorstand geprüft und bearbeitet."
      breadcrumbs={[
        { label: 'Start', href: '/' },
        { label: 'Antrag an Kreisvorstand', href: '/antrag-an-kreisvorstand', active: true },
      ]}
    >
      <AntragForm />
    </FormPageLayout>
  );
}