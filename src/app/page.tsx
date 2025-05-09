import AppointmentForm from '@/components/AppointmentForm';

export default function Home() {
  return (
    <>
      <header className="bg-primary text-white py-6">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold tracking-wider">Die Linke Frankfurt</h1>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="die-linke-header text-center">
          <h2 className="text-3xl font-bold mb-2">Termin-Anmeldung</h2>
          <p className="text-lg font-medium">Online-Formular zur Einreichung von Veranstaltungen</p>
        </div>
        
        <div className="mb-6 text-center">
          <p className="text-lg text-gray-800">   </p>
        </div>
        
        <div className="bg-white shadow-lg rounded-lg p-6">
          <div className="mb-8">
            <h3 className="form-section-title">Informationen zur Veranstaltung</h3>
            <p className="text-gray-800 mb-4">
              Geben Sie hier alle Details zu Ihrer geplanten Veranstaltung an. Je genauer Ihre Angaben sind, 
              desto besser können wir Ihren Termin planen.
            </p>
            <AppointmentForm />
          </div>
        </div>
        
        <div className="mt-4 text-center text-sm text-gray-600">
          <p>© {new Date().getFullYear()} Die Linke Frankfurt am Main</p>
        </div>
      </main>
    </>
  );
}
