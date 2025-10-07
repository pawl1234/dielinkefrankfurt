/**
 * Default prompts for AI generation
 */

export const DEFAULT_AI_SYSTEM_PROMPT = `Schreibe ein motivierendes Intro für den Newsletter der Partei DIE LINKE im Kreisverband Frankfurt. Der Text soll ansprechend, solidarisch und positiv formuliert sein und einen einladenden Ton anschlagen, der die Genoss*innen ermutigt, sich aktiv einzubringen. Nutze dazu folgende Informationen:

Top-Themen für die aktuelle Ausgabe:
"""
{{topThemes}}
"""
Die Top-Themen sollen höchste Priorität in den ersten 1-2 Absätzen des Intros einnehmen.

Weiter gebe ich dir das letzte Intro aus dem Newsletter als Kontext. Nutze den Text, um die selben Formulierungen zu vermeiden und Themen erneut zu wiederholen. Nutze Inhalt aus dem vorherigen Newsletter ausschließlich, wenn du explizit aufgefordert wirst. Sonst sollten alle Dinge nicht erneut benannt werden. Der vorherige Newsletter:

"""
{{previousIntro}}
"""

Wichtige Eigenschaften die dein Text haben soll:
- Gendergerechte Sprache (z. B. Genossinnen, Unterstützerinnen)
- Positiver Ton: Nur erfreuliche Nachrichten und motivierende Botschaften einbauen. 
- Fließtext ohne Überschriften. Der Text soll kurz und prägnant sein, dabei aber die wichtigsten Punkte hervorheben und abdecken.
- Der Text soll nicht länger als 10-15 Zeilen lang sein. Verzichte auf Prosa und konzentriere dich auf die Top-Themen. 
- WICHTIG: Füge keine Absätze hinzu, die die nicht auf das Protokoll oder Top Themen bezogen sind.`;

export const DEFAULT_AI_VORSTANDSPROTOKOLL_PROMPT = `Anschließend können Informationen aus der Kreisvorstandssitzung folgen. (Optional). Lies das folgende Protokoll und extrahiere die positiven oder motivierenden Informationen, die für die Mitglieder Relevanz haben und den Newsletter bereichern. Übergehe kontroverse oder unentschlossene Punkte. Präsentiere die beschlossenen Themen und Projekte in einem kurzen, leicht verständlichen Fließtext:

"""
{{boardProtocol}}
"""`;

export const DEFAULT_TOPIC_EXTRACTION_PROMPT = `Analysiere das folgende Vorstandsprotokoll der Partei DIE LINKE im Kreisverband Frankfurt und extrahiere die wichtigsten Themen und Beschlüsse, die für den Newsletter relevant sind.

Vorstandsprotokoll:
"""
{{boardProtocol}}
"""

Bitte extrahiere und strukturiere die Informationen wie folgt:

1. **Beschlossene Themen und Projekte**: Konkrete Beschlüsse, neue Initiativen, geplante Aktionen
2. **Positive Entwicklungen**: Erfolge, erreichte Meilensteine, erfreuliche Nachrichten
3. **Ankündigungen**: Geplante Veranstaltungen, Termine, Mitgliederversammlungen
4. **Neue Personen/Rollen**: Neubesetzungen, neue Sprecher*innen, Arbeitsgruppen

Wichtige Richtlinien:
- Konzentriere dich nur auf positive, motivierende Informationen
- Übergehe kontroverse, unentschlossene oder interne Diskussionspunkte
- Formuliere prägnant und mitgliederfreundlich
- Verwende gendergerechte Sprache
- Strukturiere die Ausgabe als kurze, klar getrennte Punkte
- Falls keine relevanten Informationen vorhanden sind, gib "Keine newsletter-relevanten Themen gefunden" zurück

Format der Antwort:
- Nutze Stichpunkte mit "•" als Aufzählungszeichen
- Maximal 8-10 Punkte insgesamt
- Jeder Punkt sollte 1-2 Sätze lang sein`;

/**
 * Constructs the complete AI prompt by combining the main prompt with optional Vorstandsprotokoll prompt
 */
export function buildAIPrompt(
  mainPrompt: string,
  vorstandsprotokollPrompt: string | null,
  topThemes: string,
  boardProtocol: string | null,
  previousIntro: string | null
): string {
  let prompt = mainPrompt.replace('{{topThemes}}', topThemes);
  
  // Add Vorstandsprotokoll section if both prompt and protocol are provided
  if (vorstandsprotokollPrompt && boardProtocol?.trim()) {
    prompt += '\n\n' + vorstandsprotokollPrompt.replace('{{boardProtocol}}', boardProtocol);
  }
  
  // Replace previousIntro placeholder
  prompt = prompt.replace('{{previousIntro}}', previousIntro || 'Kein vorheriger Newsletter verfügbar.');
  
  return prompt;
}

/**
 * Constructs AI prompt for intro generation using extracted topics instead of raw protocol
 */
export function buildAIPromptWithExtractedTopics(
  mainPrompt: string,
  topThemes: string,
  extractedTopics: string | null,
  previousIntro: string | null
): string {
  let prompt = mainPrompt.replace('{{topThemes}}', topThemes);
  
  // Add extracted topics section if provided
  if (extractedTopics?.trim()) {
    prompt += `\n\nAus der Kreisvorstandssitzung sind folgende relevante Themen hervorgegangen:\n\n"""
${extractedTopics}
"""

Integriere diese Informationen sinnvoll in das Intro, falls sie das Newsletter-Intro bereichern.`;
  }
  
  // Replace previousIntro placeholder
  prompt = prompt.replace('{{previousIntro}}', previousIntro || 'Kein vorheriger Newsletter verfügbar.');
  
  return prompt;
}

/**
 * Build topic extraction prompt for Vorstandsprotokoll
 */
export function buildTopicExtractionPrompt(
  boardProtocol: string,
  topThemes: string,
  previousIntro: string | null,
  customPrompt?: string
): string {
  const promptTemplate = customPrompt || DEFAULT_TOPIC_EXTRACTION_PROMPT;
  return promptTemplate.replace('{{boardProtocol}}', boardProtocol);
}

/**
 * Build refinement prompt for conversation continuation
 */
export function buildRefinementPrompt(
  refinementRequest: string
): string {
  // For now, we just return the refinement request directly
  return refinementRequest;
}