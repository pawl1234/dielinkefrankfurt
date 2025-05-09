'use client';

import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import RichTextEditor from './RichTextEditor';
import FileUpload from './FileUpload';
import DateTimePicker from './DateTimePicker';
import AddressFields from './AddressFields';
import RequesterFields from './RequesterFields';
import RecurringFields from './RecurringFields';
import CaptchaField from './CaptchaField';

interface FormInput {
  teaser: string;
  mainText: string;
  startDateTime: Date;
  endDateTime?: Date;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  firstName?: string;
  lastName?: string;
  recurringText?: string;
  captchaToken?: string;
}

export default function AppointmentForm() {
  const [submissionCount, setSubmissionCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [mainText, setMainText] = useState('');
  const [fileData, setFileData] = useState<File | Blob | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [teaserLength, setTeaserLength] = useState(0);
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormInput>();

  const showCaptcha = submissionCount >= 3;
  const startDateTime = watch('startDateTime');
  
  const onSubmit: SubmitHandler<FormInput> = async (data) => {
    setIsSubmitting(true);
    setSubmissionError(null);
    
    try {
      // Replace with actual form data
      const formData = new FormData();
      formData.append('teaser', data.teaser || '');
      formData.append('mainText', mainText);
      formData.append('startDateTime', data.startDateTime.toISOString());
      if (data.endDateTime) {
        formData.append('endDateTime', data.endDateTime.toISOString());
      }
      formData.append('street', data.street || '');
      formData.append('city', data.city || '');
      formData.append('state', data.state || '');
      formData.append('postalCode', data.postalCode || '');
      formData.append('firstName', data.firstName || '');
      formData.append('lastName', data.lastName || '');
      formData.append('recurringText', data.recurringText || '');
      
      if (fileData) {
        formData.append('file', fileData);
      }
      
      if (showCaptcha && !data.captchaToken) {
        throw new Error('Bitte bestätigen Sie, dass Sie kein Roboter sind.');
      }
      
      const response = await fetch('/api/submit-appointment', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Ihre Anfrage konnte nicht gesendet werden. Bitte versuchen Sie es später erneut.');
      }
      
      setSubmissionCount(submissionCount + 1);
      setSubmissionSuccess(true);
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <RequesterFields register={register} errors={errors} />
      
      <div className="form-section p-4 mb-6">
        <h3 className="form-section-title">Beschreibung der Veranstaltung</h3>
        <div className="mb-4">
          <label className="block text-2x1 font-semibold text-gray-800 mb-1">
            Teaser <span className="text-primary">*</span>
          </label>
          <p className="text-xs text-gray-800">
            Kurze Zusammenfassung Ihrer Veranstaltung (max. 300 Zeichen).
            {teaserLength > 100 && (
              <p><span className="text-dark-crimson"> Bitte halten Sie den Teaser so kurz wie möglich.</span></p>
            )}
          </p>
         
          <div className="relative">
            <textarea
              {...register('teaser', { required: 'Teaser ist erforderlich', maxLength: 300 })}
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-dark-teal"
              rows={2}
              placeholder="Kurze Zusammenfassung der Veranstaltung..."
              maxLength={300}
              onChange={(e) => setTeaserLength(e.target.value.length)}
            />
            <div className="absolute bottom-2 right-2 text-xs text-gray-800">
              {teaserLength}/300
            </div>
          </div>
          {errors.teaser && (
            <p className="mt-1 text-dark-crimson text-sm">
              {errors.teaser.message}
            </p>
          )}

        </div>
        
        <div className="mb-4 mt-4">
          <label className="block text-2x1 font-semibold text-gray-800 mt-2 mb-2">
            Beschreibung <span className="text-primary">*</span>
          </label>
          <RichTextEditor 
            value={mainText} 
            onChange={setMainText} 
            maxLength={1000} 
          />
          {errors.mainText && (
            <p className="mt-1 text-dark-crimson text-sm">
              {errors.mainText.message}
            </p>
          )}
          <p className="text-xs text-gray-800 mt-2">
            Bitte beschreiben Sie Ihre Veranstaltung. Diese Beschreibung wird für die interne Planung verwendet.
          </p>
        </div>
        
        <div className="mb-4">
          <FileUpload 
            onFileSelect={setFileData} 
          />
          <p className="text-xs text-gray-800 mt-2">
            Optional können Sie ein Bild oder ein PDF-Dokument hochladen (max. 5MB).
          </p>
        </div>
      </div>
      
      <div className="form-section p-4 mb-6">
        <h3 className="form-section-title">Datum und Uhrzeit</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs text-gray-800 mt-2">
              Wann beginnt Ihre Veranstaltung?
            </p>
            <DateTimePicker 
              label="Startdatum und -uhrzeit" 
              name="startDateTime"
              register={register} 
              required={true}
              setValue={setValue}
              error={errors.startDateTime?.message}
            />
          </div>
          
          <div>
            <p className="text-xs text-gray-800 mt-1">
              Wann endet Ihre Veranstaltung? Falls nicht bekannt, lassen Sie dieses Feld leer.
            </p>            
            <DateTimePicker 
              label="Enddatum und -uhrzeit (optional)" 
              name="endDateTime"
              register={register} 
              required={false}
              setValue={setValue}
              error={errors.endDateTime?.message}
              minDate={startDateTime}
            />
          </div>
        </div>

        <div className="mt-1">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="h-4 w-4 text-primary rounded focus:ring-primary border-gray-300"
            />
            <span className="text-sm font-medium text-gray-800">Handelt es sich um einen wiederkehrenden Termin?</span>
          </label>
        </div>

        {isRecurring && (
          <div className="mt-4">
            <div className="flex items-center mb-2">
              <h4 className="text-sm font-semibold text-gray-800">Wiederholende Termine</h4>
              <button
                type="button"
                className="ml-2 text-sm bg-gray-200 rounded-full h-5 w-5 flex items-center justify-center hover:bg-gray-300"
                onClick={() => {
                  const helpElem = document.getElementById('recurring-help');
                  if (helpElem) {
                    helpElem.classList.toggle('hidden');
                  }
                }}
              >
                ?
              </button>
            </div>
            
            <div>
              <textarea
                {...register('recurringText')}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-dark-teal"
                rows={3}
                placeholder="Beschreiben Sie den wiederkehrenden Termin..."
              />
              {errors.recurringText && (
                <p className="mt-1 text-dark-crimson text-sm">{errors.recurringText.message}</p>
              )}
              
              <p className="text-xs text-gray-800 mt-2">
                Beschreiben Sie den wiederkehrenden Termin in eigenen Worten, z. B. 'Jeden zweiten Mittwoch'.
              </p>
            </div>
            
            <div id="recurring-help" className="hidden mt-3 p-3 bg-gray-50 border border-gray-200 rounded text-sm">
              <h4 className="font-bold mb-1">Wiederholende Termine erklären</h4>
              <p>Wenn Ihr Termin in regelmäßigen Abständen stattfindet, können Sie dies hier beschreiben. Schreiben Sie zum Beispiel:</p>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>Jeden Dienstag um 15:00 Uhr für 4 Wochen</li>
                <li>Alle zwei Wochen Mittwochmorgens</li>
              </ul>
              <p className="mt-1">Wenn der Termin nicht wiederholt wird, lassen Sie dieses Feld einfach leer.</p>
            </div>
          </div>
        )}
      </div>
      
      <AddressFields register={register} errors={errors} />
      
      {showCaptcha && (
        <div className="form-section p-4 mb-6">
          <h3 className="form-section-title">Sicherheitsverifizierung</h3>
          <CaptchaField 
            register={register} 
            error={errors.captchaToken?.message} 
            setValue={setValue}
          />
        </div>
      )}
      
      {submissionError && (
        <div className="error-message p-4 mb-6">
          <strong>Fehler beim Absenden:</strong> {submissionError}
        </div>
      )}
      
      {submissionSuccess && (
        <div className="success-message p-4 mb-6">
          <strong>Erfolg!</strong> Ihre Anfrage wurde erfolgreich gesendet. Vielen Dank!
        </div>
      )}
      
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary disabled:opacity-50"
        >
          {isSubmitting ? 'Wird gesendet...' : 'Termin einreichen'}
        </button>
      </div>
    </form>
  );
}