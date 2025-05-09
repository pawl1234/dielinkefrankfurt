'use client';

import { UseFormRegister } from 'react-hook-form';

interface AddressFieldsProps {
  register: UseFormRegister<any>;
  errors: Record<string, any>;
}

const AddressFields = ({ register, errors }: AddressFieldsProps) => {
  return (
    <div className="form-section p-4 mb-6">
      <h3 className="form-section-title">Veranstaltungsort</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Straße und Hausnummer
          </label>
          <input
            type="text"
            {...register('street')}
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-dark-teal"
            placeholder="Straße und Hausnummer"
          />
          {errors.street && (
            <p className="mt-1 text-dark-crimson text-sm">{errors.street.message}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Stadt
          </label>
          <input
            type="text"
            {...register('city')}
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-dark-teal"
            placeholder="Stadt"
          />
          {errors.city && (
            <p className="mt-1 text-dark-crimson text-sm">{errors.city.message}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bundesland
          </label>
          <input
            type="text"
            {...register('state')}
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-dark-teal"
            placeholder="Bundesland"
          />
          {errors.state && (
            <p className="mt-1 text-dark-crimson text-sm">{errors.state.message}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Postleitzahl
          </label>
          <input
            type="text"
            {...register('postalCode')}
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-dark-teal"
            placeholder="Postleitzahl"
          />
          {errors.postalCode && (
            <p className="mt-1 text-dark-crimson text-sm">{errors.postalCode.message}</p>
          )}
        </div>
      </div>
      
      <p className="text-xs text-gray-500 mt-2">
        Geben Sie den Ort an, an dem die Veranstaltung stattfinden soll. Leere Felder werden als "Nicht angegeben" gekennzeichnet.
      </p>
    </div>
  );
};

export default AddressFields;