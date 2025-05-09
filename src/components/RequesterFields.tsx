'use client';

import { UseFormRegister } from 'react-hook-form';

interface RequesterFieldsProps {
  register: UseFormRegister<any>;
  errors: Record<string, any>;
}

const RequesterFields = ({ register, errors }: RequesterFieldsProps) => {
  return (
    <div className="form-section p-4 mb-6">
      <h3 className="form-section-title">Antragsteller</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vorname
          </label>
          <input
            type="text"
            {...register('firstName', {
              pattern: {
                value: /^[A-Za-zÀ-ÖØ-öø-ÿ\s-]+$/,
                message: 'Bitte nur Buchstaben eingeben',
              },
            })}
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-dark-teal"
            placeholder="Vorname"
          />
          {errors.firstName && (
            <p className="mt-1 text-dark-crimson text-sm">{errors.firstName.message}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nachname
          </label>
          <input
            type="text"
            {...register('lastName', {
              pattern: {
                value: /^[A-Za-zÀ-ÖØ-öø-ÿ\s-]+$/,
                message: 'Bitte nur Buchstaben eingeben',
              },
            })}
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-dark-teal"
            placeholder="Nachname"
          />
          {errors.lastName && (
            <p className="mt-1 text-dark-crimson text-sm">{errors.lastName.message}</p>
          )}
        </div>
      </div>
      
      <p className="text-xs text-gray-500 mt-2">
        Bitte geben Sie Ihren Namen an, damit wir Sie bei Rückfragen kontaktieren können.
      </p>
    </div>
  );
};

export default RequesterFields;