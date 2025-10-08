'use client';

import { useEffect, useState } from 'react';
import { Controller, Control, FormState, FieldValues, Path, UseFormSetValue } from 'react-hook-form';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
} from '@mui/material';
import FormSection from '../../shared/FormSection';

/**
 * Public address interface from API.
 */
interface PublicAddress {
  id: string;
  name: string;
  street: string;
  city: string;
  postalCode: string;
  locationDetails: string | null;
}

interface AddressSectionProps<TFormValues extends FieldValues> {
  control: Control<TFormValues>;
  formState: FormState<TFormValues>;
  setValue: UseFormSetValue<TFormValues>;
}

export function AddressSection<TFormValues extends FieldValues>({
  control,
  formState,
  setValue,
}: AddressSectionProps<TFormValues>) {
  const [addresses, setAddresses] = useState<PublicAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');

  /**
   * Fetch addresses from public API on component mount.
   */
  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        const response = await fetch('/api/addresses/public');
        if (response.ok) {
          const data = await response.json();
          setAddresses(data.addresses || []);
        }
      } catch (error) {
        // Silently fail - address dropdown is optional feature
        console.error('Failed to fetch addresses:', error);
      }
    };

    fetchAddresses();
  }, []);

  /**
   * Handle address selection from dropdown.
   * Auto-fills location fields with selected address data.
   *
   * @param addressId - Selected address ID
   */
  const handleAddressSelection = (addressId: string) => {
    setSelectedAddressId(addressId);

    if (!addressId) {
      // User cleared selection, do nothing (keep current field values)
      return;
    }

    const selectedAddress = addresses.find((addr) => addr.id === addressId);
    if (selectedAddress) {
      // Auto-fill location fields
      setValue('street' as Path<TFormValues>, selectedAddress.street as any);
      setValue('city' as Path<TFormValues>, selectedAddress.city as any);
      setValue(
        'postalCode' as Path<TFormValues>,
        selectedAddress.postalCode as any
      );
      setValue(
        'locationDetails' as Path<TFormValues>,
        (selectedAddress.locationDetails || '') as any
      );
    }
  };
  const helpText = `Bitte geben Sie den Ort an, an dem die Veranstaltung stattfinden soll:
        Die Straße und Hausnummer ermöglichen die genaue Lokalisierung.
        Die Stadt ist wichtig für die regionale Einordnung.
        Geben Sie zusätzliche Ortsangaben an, z.B. Raumnummer oder Gebäudename.
        Die Postleitzahl hilft bei der administrativen Zuordnung.
        Sollten Sie noch keinen genauen Ort haben, können Sie die ungefähre Gegend angeben oder das Feld frei lassen, wenn der Termin online stattfindet.`;

  return (
    <FormSection
      title="Veranstaltungsort (optional)"
      helpTitle="Adressinformationen"
      helpText={helpText}
    >
      {/* Address Dropdown */}
      {addresses.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth>
            <InputLabel id="address-select-label">
              Gespeicherte Adresse wählen (optional)
            </InputLabel>
            <Select
              labelId="address-select-label"
              id="address-select"
              value={selectedAddressId}
              label="Gespeicherte Adresse wählen (optional)"
              onChange={(e) => handleAddressSelection(e.target.value)}
            >
              <MenuItem value="">
                <em>Keine Auswahl</em>
              </MenuItem>
              {addresses.map((address) => (
                <MenuItem key={address.id} value={address.id}>
                  {address.name} ({address.street}, {address.city})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Oder geben Sie die Adresse manuell ein:
          </Typography>
        </Box>
      )}

      {/* Manual Address Fields */}
      <Box
        sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}
      >
        <Controller
          control={control}
          name={"street" as Path<TFormValues>}
          render={({ field: { onChange, onBlur, value, name: fieldName }, fieldState: { error } }) => (
            <TextField
              onChange={onChange}
              onBlur={onBlur}
              value={value || ''}
              name={fieldName}
              label="Straße und Hausnummer"
              fullWidth
              error={!!error && formState.isSubmitted}
              helperText={formState.isSubmitted && error ? error.message : undefined}
            />
          )}
        />
        <Controller
          control={control}
          name={"city" as Path<TFormValues>}
          render={({ field: { onChange, onBlur, value, name: fieldName }, fieldState: { error } }) => (
            <TextField
              onChange={onChange}
              onBlur={onBlur}
              value={value || ''}
              name={fieldName}
              label="Stadt"
              fullWidth
              error={!!error && formState.isSubmitted}
              helperText={formState.isSubmitted && error ? error.message : undefined}
            />
          )}
        />
        <Controller
          control={control}
          name={"postalCode" as Path<TFormValues>}
          render={({ field: { onChange, onBlur, value, name: fieldName }, fieldState: { error } }) => (
            <TextField
              onChange={onChange}
              onBlur={onBlur}
              value={value || ''}
              name={fieldName}
              label="Postleitzahl"
              fullWidth
              error={!!error && formState.isSubmitted}
              helperText={formState.isSubmitted && error ? error.message : undefined}
            />
          )}
        />
        <Controller
          control={control}
          name={"locationDetails" as Path<TFormValues>}
          render={({ field: { onChange, onBlur, value, name: fieldName }, fieldState: { error } }) => (
            <TextField
              onChange={onChange}
              onBlur={onBlur}
              value={value || ''}
              name={fieldName}
              label="Zusatzinformationen"
              fullWidth
              error={!!error && formState.isSubmitted}
              helperText={formState.isSubmitted && error ? error.message : undefined}
            />
          )}
        />
      </Box>
    </FormSection>
  );
}