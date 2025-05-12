'use client';

import { useState } from 'react';
import { UseFormRegister } from 'react-hook-form';
import { Box, Typography, IconButton, Paper } from '@mui/material';

interface RecurringFieldsProps {
  register: UseFormRegister<any>;
  errors: Record<string, any>;
}

const RecurringFields = ({ register, errors }: RecurringFieldsProps) => {
  const [showHelp, setShowHelp] = useState(false);
  
  return (
    <Box sx={{ mb: 3, p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }}>
          Wiederholende Termine
        </Typography>
        <IconButton
          size="small"
          onClick={() => setShowHelp(!showHelp)}
          sx={{ ml: 1, width: 20, height: 20, bgcolor: 'grey.200', '&:hover': { bgcolor: 'grey.300' } }}
        >
          ?
        </IconButton>
      </Box>

      <Box>
        <textarea
          {...register('recurringText')}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
            outline: 'none',
            transition: 'border-color 0.2s',
            fontFamily: 'inherit',
            fontSize: '1rem'
          }}
          rows={3}
          placeholder="Beschreiben Sie den wiederkehrenden Termin..."
        />
        {errors.recurringText && (
          <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
            {errors.recurringText.message}
          </Typography>
        )}

        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Beschreiben Sie den wiederkehrenden Termin in eigenen Worten, z. B. 'Jeden zweiten Mittwoch'. (optional)
        </Typography>
      </Box>

      {showHelp && (
        <Paper sx={{ mt: 2, p: 2, bgcolor: 'grey.50', border: 1, borderColor: 'grey.200', borderRadius: 1 }}>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
            Wiederholende Termine erklären
          </Typography>
          <Typography variant="body2">
            Wenn Ihr Termin in regelmäßigen Abständen stattfindet, können Sie dies hier beschreiben. Schreiben Sie zum Beispiel:
          </Typography>
          <Box component="ul" sx={{ pl: 3, mt: 1, '& > li': { mb: 0.5 } }}>
            <li>Jeden Dienstag um 15:00 Uhr für 4 Wochen</li>
            <li>Alle zwei Wochen Mittwochmorgens</li>
          </Box>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Wenn der Termin nicht wiederholt wird, lassen Sie dieses Feld einfach leer.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default RecurringFields;