'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Alert,
  CircularProgress,
  Typography,
  Divider,
  IconButton,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import { AIGenerationWithTopicsRequest, AIRefinementRequest, AIGenerationResponse, AITopicExtractionRequest, AITopicExtractionResponse } from '@/types/api-types';

interface AIGenerationModalProps {
  open: boolean;
  onClose: () => void;
  onAccept: (generatedText: string) => void;
  existingText?: string;
}

const MAX_REFINEMENTS = 10;

export default function AIGenerationModal({
  open,
  onClose,
  onAccept,
  existingText
}: AIGenerationModalProps) {
  const [topThemes, setTopThemes] = useState('');
  const [boardProtocol, setBoardProtocol] = useState('');
  const [extractedTopics, setExtractedTopics] = useState('');
  const [generatedText, setGeneratedText] = useState('');
  const [refinementInstructions, setRefinementInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'input' | 'topics' | 'result'>('input');
  const [conversationHistory, setConversationHistory] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [refinementCount, setRefinementCount] = useState(0);
  const [extractionLoading, setExtractionLoading] = useState(false);
  const [skipExtraction, setSkipExtraction] = useState(false);

  const handleExtractTopics = async () => {
    if (!boardProtocol?.trim()) {
      setError('Bitte geben Sie ein Vorstandsprotokoll ein');
      return;
    }

    setExtractionLoading(true);
    setError('');

    try {
      const requestData: AITopicExtractionRequest = {
        boardProtocol,
      };

      const response = await fetch('/api/admin/newsletter/ai/extract-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const data: AITopicExtractionResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Fehler bei der Themen-Extraktion');
      }

      setExtractedTopics(data.extractedTopics);
      setStep('topics');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein unbekannter Fehler ist aufgetreten');
    } finally {
      setExtractionLoading(false);
    }
  };

  const handleProceedToGeneration = () => {
    setStep('result');
    handleGenerate();
  };

  const handleSkipExtraction = () => {
    setSkipExtraction(true);
    setStep('result');
    handleGenerate();
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError('');

    try {
      const requestData: AIGenerationWithTopicsRequest = {
        topThemes,
        ...(skipExtraction ? { boardProtocol } : { extractedTopics }),
      };

      const response = await fetch('/api/admin/newsletter/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const data: AIGenerationResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Fehler bei der Generierung');
      }

      setGeneratedText(data.generatedText);
      
      // Initialize conversation history with the original generation
      // We need to reconstruct the original prompt for the conversation
      let originalPrompt = `Schreibe ein motivierendes Intro für den Newsletter der Partei DIE LINKE im Kreisverband Frankfurt. Der Text soll ansprechend, solidarisch und positiv formuliert sein und einen einladenden Ton anschlagen, der die Genoss*innen ermutigt, sich aktiv einzubringen. Nutze dazu folgende Informationen:

Top-Themen für die aktuelle Ausgabe:
"""
${topThemes}
"""
Die Top-Themen sollen höchste Priorität in den ersten 1-2 Absätzen des Intros einnehmen.`;

      // Add relevant sections based on what was actually used
      if (skipExtraction && boardProtocol?.trim()) {
        originalPrompt += `

Anschließend können Informationen aus der Kreisvorstandssitzung folgen. (Optional). Lies das folgende Protokoll und extrahiere die positiven oder motivierenden Informationen, die für die Mitglieder Relevanz haben und den Newsletter bereichern. Übergehe kontroverse oder unentschlossene Punkte. Präsentiere die beschlossenen Themen und Projekte in einem kurzen, leicht verständlichen Fließtext:
"""
${boardProtocol}
"""`;
      } else if (extractedTopics?.trim()) {
        originalPrompt += `

Aus der Kreisvorstandssitzung sind folgende relevante Themen hervorgegangen:

"""
${extractedTopics}
"""

Integriere diese Informationen sinnvoll in das Intro, falls sie das Newsletter-Intro bereichern.`;
      }

      originalPrompt += `

Wichtige Eigenschaften die dein Text haben soll:
- Gendergerechte Sprache (z. B. Genossinnen, Unterstützerinnen)
- Positiver Ton: Nur erfreuliche Nachrichten und motivierende Botschaften einbauen. 
- Fließtext ohne Überschriften. Der Text soll kurz und prägnant sein, dabei aber die wichtigsten Punkte hervorheben und abdecken.
- Der Text soll nicht länger als 10-15 Zeilen lang sein. Verzichte auf Prosa und konzentriere dich auf die Top-Themen. 
- WICHTIG: Füge keine Absätze hinzu, die die nicht auf das Protokoll oder Top Themen bezogen sind.`;

      setConversationHistory([
        { role: 'user', content: originalPrompt },
        { role: 'assistant', content: data.generatedText }
      ]);
      setRefinementCount(0);
      
      // Only set step to 'result' if we're not already there
      if (step !== 'result') {
        setStep('result');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein unbekannter Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  const handleRefine = async () => {
    if (!refinementInstructions.trim()) {
      setError('Bitte geben Sie Verfeinerungsanweisungen ein');
      return;
    }

    if (refinementCount >= MAX_REFINEMENTS) {
      setError('Maximale Anzahl an Verfeinerungszyklen erreicht!');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const requestData: AIRefinementRequest = {
        conversationHistory,
        refinementInstructions,
      };

      const response = await fetch('/api/admin/newsletter/ai/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const data: AIGenerationResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Fehler bei der Verfeinerung');
      }

      setGeneratedText(data.generatedText);
      
      // Update conversation history with the new refinement
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', content: refinementInstructions },
        { role: 'assistant', content: data.generatedText }
      ]);
      setRefinementCount(prev => prev + 1);
      setRefinementInstructions('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein unbekannter Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    onAccept(generatedText);
    handleClose();
  };

  const handleClose = () => {
    setTopThemes('');
    setBoardProtocol('');
    setExtractedTopics('');
    setGeneratedText('');
    setRefinementInstructions('');
    setError('');
    setStep('input');
    setConversationHistory([]);
    setRefinementCount(0);
    setSkipExtraction(false);
    onClose();
  };

  const handleBack = () => {
    if (step === 'topics') {
      setStep('input');
      setExtractedTopics('');
    } else if (step === 'result') {
      if (extractedTopics) {
        setStep('topics');
      } else {
        setStep('input');
      }
      setGeneratedText('');
      setRefinementInstructions('');
      setConversationHistory([]);
      setRefinementCount(0);
    }
    setError('');
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesomeIcon />
            <Typography variant="h6">
              {step === 'input' && 'Newsletter-Intro generieren'}
              {step === 'topics' && 'Extrahierte Themen'}
              {step === 'result' && 'Generierter Text'}
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {existingText && step === 'input' && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Achtung: Ein vorhandener Einführungstext wird überschrieben.
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {step === 'input' && (
          <Box>
            <TextField
              label="Top Themen"
              multiline
              rows={4}
              value={topThemes}
              onChange={(e) => setTopThemes(e.target.value)}
              fullWidth
              margin="normal"
              placeholder="Klimaschutz-Demo am Samstag, Mietenstopp-Petition erreicht 10.000 Unterschriften..."
              helperText="Die wichtigsten Themen für diese Newsletter-Ausgabe"
              disabled={loading || extractionLoading}
            />

            <TextField
              label="Vorstandsprotokoll (optional)"
              multiline
              rows={6}
              value={boardProtocol}
              onChange={(e) => setBoardProtocol(e.target.value)}
              fullWidth
              margin="normal"
              placeholder="Beschluss: Unterstützung der Klimademo am 25.01. mit eigenem Stand..."
              helperText="Geben Sie das Vorstandsprotokoll ein, um relevante Themen automatisch zu extrahieren"
              disabled={loading || extractionLoading}
            />
          </Box>
        )}

        {step === 'topics' && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Extrahierte Themen aus dem Vorstandsprotokoll:
            </Typography>
            <TextField
              multiline
              rows={8}
              value={extractedTopics}
              onChange={(e) => setExtractedTopics(e.target.value)}
              fullWidth
              margin="normal"
              placeholder="• Beschluss: Unterstützung der Klimademo..."
              helperText="Sie können die extrahierten Themen bearbeiten, bevor das Intro generiert wird"
              disabled={loading}
            />
          </Box>
        )}

        {step === 'result' && (
          <Box>
            <Typography variant="subtitle2" gutterBottom color="text.secondary">
              Generierter Einführungstext:
            </Typography>
            <Box 
              sx={{ 
                p: 2, 
                bgcolor: 'grey.50', 
                borderRadius: 1, 
                mb: 2,
                whiteSpace: 'pre-wrap',
                lineHeight: 1.6
              }}
            >
              {generatedText}
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2">
                Text verfeinern (optional):
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {refinementCount}/{MAX_REFINEMENTS} Verfeinerungen
              </Typography>
            </Box>
            
            {refinementCount >= MAX_REFINEMENTS && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Maximale Anzahl an Verfeinerungszyklen erreicht!
              </Alert>
            )}
            
            <TextField
              multiline
              rows={3}
              value={refinementInstructions}
              onChange={(e) => setRefinementInstructions(e.target.value)}
              fullWidth
              placeholder="Mache den Text etwas emotionaler und erwähne die neue AG Wohnen Sprecherin"
              helperText="Geben Sie hier Anweisungen zur Verfeinerung des Textes ein"
              disabled={loading || refinementCount >= MAX_REFINEMENTS}
            />
          </Box>
        )}

        {(loading || extractionLoading) && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <CircularProgress />
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {step === 'input' && (
          <>
            <Button onClick={handleClose} disabled={loading || extractionLoading}>
              Abbrechen
            </Button>
            {boardProtocol?.trim() ? (
              <>
                <Button
                  onClick={handleSkipExtraction}
                  disabled={loading || extractionLoading || !topThemes.trim()}
                  startIcon={loading ? <CircularProgress size={20} /> : <AutoAwesomeIcon />}
                >
                  {loading ? 'Generiere...' : 'Ohne Extraktion generieren'}
                </Button>
                <Button
                  variant="contained"
                  onClick={handleExtractTopics}
                  disabled={loading || extractionLoading || !topThemes.trim()}
                  startIcon={extractionLoading ? <CircularProgress size={20} /> : <AutoAwesomeIcon />}
                >
                  {extractionLoading ? 'Extrahiere...' : 'Themen extrahieren'}
                </Button>
              </>
            ) : (
              <Button
                variant="contained"
                onClick={handleSkipExtraction}
                disabled={loading || extractionLoading || !topThemes.trim()}
                startIcon={loading ? <CircularProgress size={20} /> : <AutoAwesomeIcon />}
              >
                {loading ? 'Generiere...' : 'Text generieren'}
              </Button>
            )}
          </>
        )}

        {step === 'topics' && (
          <>
            <Button onClick={handleBack} disabled={loading}>
              Zurück
            </Button>
            <Button
              variant="contained"
              onClick={handleProceedToGeneration}
              disabled={loading || !extractedTopics.trim()}
              startIcon={loading ? <CircularProgress size={20} /> : <AutoAwesomeIcon />}
            >
              {loading ? 'Generiere...' : 'Intro generieren'}
            </Button>
          </>
        )}

        {step === 'result' && (
          <>
            <Button onClick={handleBack} disabled={loading}>
              Zurück
            </Button>
            <Button
              onClick={handleRefine}
              disabled={loading || !refinementInstructions.trim() || refinementCount >= MAX_REFINEMENTS}
              startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
            >
              {loading ? 'Verfeinere...' : 'Verfeinern'}
            </Button>
            <Button
              variant="contained"
              onClick={handleAccept}
              disabled={loading}
            >
              Text übernehmen
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}