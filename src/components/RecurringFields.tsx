'use client';

import { useState } from 'react';
import { UseFormRegister } from 'react-hook-form';

interface RecurringFieldsProps {
  register: UseFormRegister<any>;
  errors: Record<string, any>;
}

const RecurringFields = ({ register, errors }: RecurringFieldsProps) => {
  const [showHelp, setShowHelp] = useState(false);
  
  return (
    <div className="form-section p-4 mb-6">
      <div className="flex items-center mb-2">
        <h3 className="form-section-title">Wiederholende Termine</h3>
        <button
          type="button"
          className="ml-2 text-sm bg-gray-200 rounded-full h-5 w-5 flex items-center justify-center hover:bg-gray-300"
          onClick={() => setShowHelp(!showHelp)}
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
        
        <p className="text-xs text-gray-500 mt-2">
          Beschreiben Sie den wiederkehrenden Termin in eigenen Worten, z. B. 'Jeden zweiten Mittwoch'. (optional)
        </p>
      </div>
      
      {showHelp && (
        <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded text-sm">
          <h4 className="font-bold mb-1">Wiederholende Termine erklären</h4>
          <p>Wenn Ihr Termin in regelmäßigen Abständen stattfindet, können Sie dies hier beschreiben. Schreiben Sie zum Beispiel:</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>Jeden Dienstag um 15:00 Uhr für 4 Wochen</li>
            <li>Alle zwei Wochen Mittwochmorgens</li>
          </ul>
          <p className="mt-1">Wenn der Termin nicht wiederholt wird, lassen Sie dieses Feld einfach leer.</p>
        </div>
      )}
    </div>
  );
};

export default RecurringFields;