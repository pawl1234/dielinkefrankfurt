'use client';

/**
 * Recurring Meeting Pattern Selector Component
 * Reusable form component for selecting recurring meeting patterns
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  FormHelperText,
  IconButton,
  Paper,
  Stack
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { RecurringMeetingData, PatternConfig } from '@/types/form-types';
import { PATTERN_TYPE_OPTIONS, WEEKDAY_OPTIONS } from '@/lib/groups/recurring-patterns';

/**
 * Props for RecurringMeetingPatternSelector component
 */
export interface RecurringMeetingPatternSelectorProps {
  value?: RecurringMeetingData;
  onChange: (data: RecurringMeetingData) => void;
  onMeetingEnabledChange?: (enabled: boolean) => void;
  error?: string;
  labels?: {
    meetingLabel?: string;
    addPatternButton?: string;
    timeLabel?: string;
    patternTypeLabel?: string;
    weekdayLabel?: string;
    removePatternButton?: string;
  };
  disabled?: boolean;
  showTitle?: boolean;
}

/**
 * Default labels in German
 */
const DEFAULT_LABELS = {
  meetingLabel: 'Regelmäßiges Treffen',
  addPatternButton: 'Weiteres Muster hinzufügen',
  timeLabel: 'Uhrzeit',
  patternTypeLabel: 'Muster',
  weekdayLabel: 'Wochentag',
  removePatternButton: 'Entfernen'
};

/**
 * RecurringMeetingPatternSelector component
 */
export function RecurringMeetingPatternSelector({
  value,
  onChange,
  onMeetingEnabledChange,
  error,
  labels: customLabels,
  disabled = false,
  showTitle = false
}: RecurringMeetingPatternSelectorProps): React.ReactElement {
  const labels = { ...DEFAULT_LABELS, ...customLabels };

  // Invert logic: hasMeeting instead of hasNoMeeting
  const [hasMeeting, setHasMeeting] = useState(
    value?.hasNoMeeting === false
  );
  const [patterns, setPatterns] = useState<PatternConfig[]>(value?.patterns ?? []);
  const [time, setTime] = useState(value?.time ?? '');

  // Update local state when value prop changes
  useEffect(() => {
    setHasMeeting(value?.hasNoMeeting === false);
    setPatterns(value?.patterns ?? []);
    setTime(value?.time ?? '');
  }, [value]);

  /**
   * Handle checkbox change for "has meeting"
   */
  const handleMeetingChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setHasMeeting(checked);

    if (checked) {
      // Enable meeting mode - start with empty patterns
      onChange({
        patterns: [],
        time: undefined,
        hasNoMeeting: false
      });
    } else {
      // Disable meeting mode - clear everything
      setPatterns([]);
      setTime('');
      onChange({
        patterns: [],
        time: undefined,
        hasNoMeeting: true
      });
    }

    // Notify parent component about meeting enabled state change
    if (onMeetingEnabledChange) {
      onMeetingEnabledChange(checked);
    }
  };

  /**
   * Add new pattern
   */
  const handleAddPattern = () => {
    const newPattern: PatternConfig = {
      type: 'monthly-1st',
      weekday: 'MO'
    };
    const updatedPatterns = [...patterns, newPattern];
    setPatterns(updatedPatterns);
    onChange({
      patterns: updatedPatterns,
      time: time || undefined,
      hasNoMeeting: false
    });
  };

  /**
   * Remove pattern at index
   */
  const handleRemovePattern = (index: number) => {
    const updatedPatterns = patterns.filter((_, i) => i !== index);
    setPatterns(updatedPatterns);
    onChange({
      patterns: updatedPatterns,
      time: time || undefined,
      hasNoMeeting: false
    });
  };

  /**
   * Update pattern type at index
   */
  const handlePatternTypeChange = (index: number, newType: PatternConfig['type']) => {
    const updatedPatterns = [...patterns];
    updatedPatterns[index] = { ...updatedPatterns[index], type: newType };
    setPatterns(updatedPatterns);
    onChange({
      patterns: updatedPatterns,
      time: time || undefined,
      hasNoMeeting: false
    });
  };

  /**
   * Update pattern weekday at index
   */
  const handlePatternWeekdayChange = (index: number, newWeekday: PatternConfig['weekday']) => {
    const updatedPatterns = [...patterns];
    updatedPatterns[index] = { ...updatedPatterns[index], weekday: newWeekday };
    setPatterns(updatedPatterns);
    onChange({
      patterns: updatedPatterns,
      time: time || undefined,
      hasNoMeeting: false
    });
  };


  return (
    <Box sx={{ my: showTitle ? 3 : 0 }}>
      {showTitle && (
        <Typography variant="h6" gutterBottom>
          Regelmäßige Treffen
        </Typography>
      )}

      <FormControlLabel
        control={
          <Checkbox
            checked={hasMeeting}
            onChange={handleMeetingChange}
            disabled={disabled}
          />
        }
        label={labels.meetingLabel}
      />

      {hasMeeting && (
        <Box sx={{ mt: 2 }}>
          {patterns.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Fügen Sie mindestens ein Muster hinzu
            </Typography>
          )}

          <Stack spacing={2}>
            {patterns.map((pattern, index) => (
              <Paper key={index} sx={{ p: 2 }} variant="outlined">
                <Stack direction="row" spacing={2} alignItems="center">
                  <FormControl sx={{ minWidth: 250 }} size="small">
                    <InputLabel id={`pattern-type-label-${index}`}>
                      {labels.patternTypeLabel}
                    </InputLabel>
                    <Select
                      labelId={`pattern-type-label-${index}`}
                      value={pattern.type}
                      onChange={(e) =>
                        handlePatternTypeChange(index, e.target.value as PatternConfig['type'])
                      }
                      label={labels.patternTypeLabel}
                      disabled={disabled}
                    >
                      {PATTERN_TYPE_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl sx={{ minWidth: 150 }} size="small">
                    <InputLabel id={`weekday-label-${index}`}>
                      {labels.weekdayLabel}
                    </InputLabel>
                    <Select
                      labelId={`weekday-label-${index}`}
                      value={pattern.weekday}
                      onChange={(e) =>
                        handlePatternWeekdayChange(index, e.target.value as PatternConfig['weekday'])
                      }
                      label={labels.weekdayLabel}
                      disabled={disabled}
                    >
                      {WEEKDAY_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <IconButton
                    color="error"
                    onClick={() => handleRemovePattern(index)}
                    disabled={disabled}
                    aria-label={labels.removePatternButton}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Stack>
              </Paper>
            ))}
          </Stack>

          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleAddPattern}
            disabled={disabled}
            sx={{ mt: 2 }}
          >
            {labels.addPatternButton}
          </Button>
        </Box>
      )}

      {error && (
        <FormHelperText error sx={{ mt: 1 }}>
          {error}
        </FormHelperText>
      )}
    </Box>
  );
}
