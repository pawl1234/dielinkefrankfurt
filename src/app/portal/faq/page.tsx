// src/app/portal/faq/page.tsx
'use client';

import { useEffect, useState } from 'react';
import SafeHtml from '@/components/ui/SafeHtml';
import { FAQ_SEARCH_MAX_LENGTH } from '@/lib/validation/faq-schema';

import {
  Box, Container, Typography, TextField, CircularProgress, Paper,
  Accordion, AccordionSummary, AccordionDetails, InputAdornment
} from '@mui/material';

import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import type { FaqEntryPublic } from '@/types/api-types';

export default function PortalFaqPage() {
  const [faqs, setFaqs] = useState<FaqEntryPublic[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchFaqs();
  }, []);

  const fetchFaqs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/portal/faq');
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to fetch FAQs');
      }
      const data = await response.json();
      setFaqs(data.faqs || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'FAQ konnten nicht geladen werden');
      setFaqs([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredFaqs = faqs.filter(faq => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase().slice(0, FAQ_SEARCH_MAX_LENGTH);
    return faq.title.toLowerCase().includes(term) ||
           faq.content.toLowerCase().includes(term);
  });

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          FAQ
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Häufig gestellte Fragen und Antworten
        </Typography>

        <TextField
          fullWidth
          placeholder="FAQ durchsuchen..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ mb: 3 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          inputProps={{ maxLength: FAQ_SEARCH_MAX_LENGTH }}
        />

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Paper sx={{ p: 4, bgcolor: 'error.light' }}>
            <Typography color="error">{error}</Typography>
          </Paper>
        ) : filteredFaqs.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography>
              {searchTerm ? 'Keine FAQ-Einträge gefunden' : 'Keine FAQ-Einträge verfügbar'}
            </Typography>
          </Paper>
        ) : (
          <Box>
            {filteredFaqs.map((faq) => (
              <Accordion
                key={faq.id}
                expanded={expandedId === faq.id}
                onChange={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                sx={{ mb: 1 }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">{faq.title}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <SafeHtml html={faq.content} />
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}
    </Container>
  );
}
