# FEATURE: AI Newsletter Intro Generation

A feature that integrates AI-powered intro text generation directly into the Die Linke Frankfurt newsletter creation workflow, eliminating the need to switch to external browser-based AI tools.

## USER STORIES

### Primary User Story
**As a newsletter admin**, I want to generate compelling intro texts using AI without leaving the application, so that I can streamline my workflow and maintain consistent quality while avoiding repetitive language patterns.

### Detailed User Stories

1. **As a newsletter admin**, I want to click an "Intro generieren" button on the newsletter edit page, so that I can access AI generation without switching contexts.

2. **As a newsletter admin**, I want to input "Top Themen" and "Vorstandsprotokoll" in a modal dialog, so that the AI can generate relevant intro text based on current content.

3. **As a newsletter admin**, I want the system to automatically include the previous newsletter's intro text in the AI prompt, so that repetitive language patterns are avoided.

4. **As a newsletter admin**, I want to refine generated intro texts with custom instructions, so that I can iterate until the content meets my expectations.

5. **As a newsletter admin**, I want to configure AI prompts and API settings, so that I can customize the generation behavior to match our party's communication style.

## INTEGRATION POINTS

### Newsletter Edit Page (`/admin/newsletter/edit`)
- Add "Intro generieren" button next to the intro text editor
- Integrate modal dialog for AI generation workflow
- Handle overwrite warnings when intro text already exists

### Newsletter Settings Page (`/admin/newsletter/settings`)
- Add new "AI-Generierung" accordion section
- Store AI system prompt (editable)
- Store refinement prompt template (editable)
- Store Anthropic API key configuration

### Newsletter Archives System
- Query most recent sent newsletter for previous intro text
- Provide intro text context to AI generation

### Authentication & Permissions
- Leverage existing admin authentication
- Use current session management for API access

## DATA MODEL

### Database Schema Extensions

#### Newsletter Settings Table
Add new columns to existing newsletter settings:
```sql
-- Add to existing newsletter_settings table
ALTER TABLE newsletter_settings ADD COLUMN ai_system_prompt TEXT;
ALTER TABLE newsletter_settings ADD COLUMN ai_refinement_prompt TEXT;
ALTER TABLE newsletter_settings ADD COLUMN anthropic_api_key TEXT;
```

#### Default Values
```typescript
// Default AI system prompt (your current prompt)
const DEFAULT_AI_SYSTEM_PROMPT = `Schreibe ein motivierendes Intro für den Newsletter der Partei DIE LINKE im Kreisverband Frankfurt. Der Text soll ansprechend, solidarisch und positiv formuliert sein und einen einladenden Ton anschlagen, der die Genoss*innen ermutigt, sich aktiv einzubringen. Nutze dazu folgende Informationen:

Top-Themen für die aktuelle Ausgabe:
"""
{{topThemes}}
"""
Die Top-Themen sollen höchste Priorität in den ersten 1-2 Absätzen der des Intros einnehmen. Anschließend können Informationen aus der Kreisvorstandssitzung folgen. (Optional). Lies das folgende Protokoll und extrahiere die positiven oder motivierenden Informationen, die für die Mitglieder Relevanz haben und den Newsletter bereichern. Übergehe kontroverse oder unentschlossene Punkte. Präsentiere die beschlossenen Themen und Projekte in einem kurzen, leicht verständlichen Fließtext:
"""
{{boardProtocol}}
"""
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

// Default refinement prompt
const DEFAULT_AI_REFINEMENT_PROMPT = `Du hast folgenden Newsletter-Intro-Text generiert:

"""
{{generatedText}}
"""

Bitte überarbeite den Text basierend auf folgenden Anweisungen:

"""
{{refinementInstructions}}
"""

Behalte dabei alle ursprünglichen Anforderungen bei:
- Gendergerechte Sprache
- Positiver Ton
- Fließtext ohne Überschriften
- Kurz und prägnant (10-15 Zeilen)
- Fokus auf die wichtigsten Punkte`;
```

### TypeScript Interfaces

```typescript
// Extend existing newsletter settings interface
interface NewsletterSettings {
  // ... existing fields
  aiSystemPrompt?: string;
  aiRefinementPrompt?: string;
  anthropicApiKey?: string;
}

// AI generation request/response types
interface AIGenerationRequest {
  topThemes: string;
  boardProtocol: string;
  previousIntro?: string;
}

interface AIRefinementRequest {
  generatedText: string;
  refinementInstructions: string;
}

interface AIGenerationResponse {
  generatedText: string;
  success: boolean;
  error?: string;
}
```

## API REQUIREMENTS

### New API Endpoints

#### 1. Generate Intro Text
```typescript
// POST /api/admin/newsletter/ai/generate
{
  topThemes: string;
  boardProtocol: string;
}

// Response
{
  generatedText: string;
  success: boolean;
  error?: string;
}
```

#### 2. Refine Intro Text
```typescript
// POST /api/admin/newsletter/ai/refine
{
  generatedText: string;
  refinementInstructions: string;
}

// Response
{
  generatedText: string;
  success: boolean;
  error?: string;
}
```

### Implementation Details

#### API Route: `/api/admin/newsletter/ai/generate`
```typescript
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request: Request) {
  // 1. Validate admin session
  // 2. Parse request body (topThemes, boardProtocol)
  // 3. Fetch newsletter settings (AI prompt, API key)
  // 4. Query most recent sent newsletter for previous intro
  // 5. Replace template placeholders in system prompt
  // 6. Call Anthropic API
  // 7. Return generated text
}
```

#### API Route: `/api/admin/newsletter/ai/refine`
```typescript
export async function POST(request: Request) {
  // 1. Validate admin session
  // 2. Parse request body (generatedText, refinementInstructions)
  // 3. Fetch refinement prompt from settings
  // 4. Replace template placeholders
  // 5. Call Anthropic API
  // 6. Return refined text
}
```

### Newsletter Settings API Extension
Extend existing `/api/admin/newsletter/settings` to handle new AI fields:
```typescript
// Add validation for AI fields
const aiSystemPrompt = body.aiSystemPrompt || DEFAULT_AI_SYSTEM_PROMPT;
const aiRefinementPrompt = body.aiRefinementPrompt || DEFAULT_AI_REFINEMENT_PROMPT;
const anthropicApiKey = body.anthropicApiKey || '';
```

## UI/UX DESIGN

### Newsletter Edit Page Updates

#### 1. Add Generation Button
```tsx
// In NewsletterEditContent component, after intro text editor
<Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
  <Button
    variant="outlined"
    onClick={() => setShowAIModal(true)}
    startIcon={<AutoAwesomeIcon />}
    disabled={saving}
  >
    Intro generieren
  </Button>
  {introductionText.trim() && (
    <Typography variant="caption" color="text.secondary">
      KI-Generierung überschreibt vorhandenen Text
    </Typography>
  )}
</Box>
```

#### 2. AI Generation Modal Component
```tsx
interface AIGenerationModalProps {
  open: boolean;
  onClose: () => void;
  onAccept: (generatedText: string) => void;
  existingText?: string;
}

const AIGenerationModal: React.FC<AIGenerationModalProps> = ({
  open,
  onClose,
  onAccept,
  existingText
}) => {
  // Modal with:
  // - Top Themen textarea
  // - Vorstandsprotokoll textarea
  // - Generate button
  // - Generated text display area
  // - Refinement input field
  // - Regenerate button
  // - Accept/Cancel buttons
  // - Loading states
  // - Error handling
};
```

### Newsletter Settings Page Updates

#### Add AI Configuration Section
```tsx
// New accordion section in NewsletterSettingsPage
<Accordion>
  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <AutoAwesomeIcon />
      <Typography variant="h6">AI-Generierung</Typography>
    </Box>
  </AccordionSummary>
  <AccordionDetails>
    <TextField
      label="Anthropic API Key"
      type="password"
      value={settings.anthropicApiKey || ''}
      onChange={(e) => setSettings({ ...settings, anthropicApiKey: e.target.value })}
      fullWidth
      margin="normal"
      helperText="API-Schlüssel für Anthropic Claude"
    />
    
    <TextField
      label="System-Prompt für Intro-Generierung"
      multiline
      rows={10}
      value={settings.aiSystemPrompt || DEFAULT_AI_SYSTEM_PROMPT}
      onChange={(e) => setSettings({ ...settings, aiSystemPrompt: e.target.value })}
      fullWidth
      margin="normal"
      helperText="Haupt-Prompt für die KI-Generierung. Verwende {{topThemes}}, {{boardProtocol}}, {{previousIntro}} als Platzhalter."
    />
    
    <TextField
      label="Refinement-Prompt"
      multiline
      rows={8}
      value={settings.aiRefinementPrompt || DEFAULT_AI_REFINEMENT_PROMPT}
      onChange={(e) => setSettings({ ...settings, aiRefinementPrompt: e.target.value })}
      fullWidth
      margin="normal"
      helperText="Prompt für Text-Verfeinerung. Verwende {{generatedText}} und {{refinementInstructions}} als Platzhalter."
    />
  </AccordionDetails>
</Accordion>
```

## SECURITY & PERMISSIONS

### Authentication
- Leverage existing NextAuth.js admin authentication
- All AI endpoints require authenticated admin session
- Use existing session validation patterns

### API Key Security
- Store Anthropic API key in database (plain text as requested)
- Only accessible through admin settings page
- API key validation on first use with error feedback

### Input Validation
```typescript
// Validate generation inputs
const validateGenerationInput = (data: AIGenerationRequest) => {
  if (!data.topThemes?.trim()) {
    throw new Error('Top Themen sind erforderlich');
  }
  if (!data.boardProtocol?.trim()) {
    throw new Error('Vorstandsprotokoll ist erforderlich');
  }
  if (data.topThemes.length > 5000) {
    throw new Error('Top Themen zu lang (max. 5000 Zeichen)');
  }
  if (data.boardProtocol.length > 10000) {
    throw new Error('Vorstandsprotokoll zu lang (max. 10000 Zeichen)');
  }
};
```

### Rate Limiting
```typescript
// Basic rate limiting for AI API calls
const AI_RATE_LIMIT = {
  maxRequests: 10,
  windowMs: 60 * 1000, // 1 minute
};
```

## EXAMPLES

### Example User Workflow

1. **User navigates to newsletter edit page**
   - Clicks "Intro generieren" button
   - Warning appears if intro text already exists

2. **AI Generation Modal Opens**
   ```
   [Top Themen]
   Klimaschutz-Demo am Samstag, Mietenstopp-Petition erreicht 10.000 Unterschriften

   [Vorstandsprotokoll]  
   Beschluss: Unterstützung der Klimademo am 25.01. mit eigenem Stand
   Beschluss: Planung Mitgliederversammlung für Februar
   Info: Neue Sprecherin für AG Wohnen gewählt
   ```

3. **Generated Text Appears**
   ```
   Liebe Genoss*innen,

   Am kommenden Samstag gehen wir gemeinsam für Klimagerechtigkeit auf die Straße! 
   Die Klimaschutz-Demo bietet uns die perfekte Gelegenheit, unsere Forderungen 
   sichtbar zu machen - der Kreisvorstand hat beschlossen, mit einem eigenen Stand 
   präsent zu sein. Gleichzeitig freuen wir uns über den großartigen Erfolg unserer 
   Mietenstopp-Petition: Bereits 10.000 Unterschriften zeigen, dass die Menschen 
   in Frankfurt genug haben von explodierenden Mieten...
   ```

4. **User Refines** (optional)
   ```
   [Refinement Input]
   Mache den Text etwas emotionaler und erwähne die neue AG Wohnen Sprecherin
   ```

5. **User Accepts** 
   - Generated text fills intro field
   - Modal closes
   - User continues with newsletter creation

### Example API Integration

```typescript
// Example Anthropic SDK usage in API route
const anthropic = new Anthropic({
  apiKey: settings.anthropicApiKey,
});

const response = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1000,
  messages: [{
    role: 'user',
    content: processedPrompt
  }]
});

const generatedText = response.content[0].text;
```

## DOCUMENTATION

### Implementation References
- **Anthropic SDK**: https://raw.githubusercontent.com/anthropics/anthropic-sdk-typescript/refs/heads/main/README.md
- **Existing Newsletter Components**: `src/components/newsletter/`
- **Newsletter Settings API**: `src/app/api/admin/newsletter/settings/route.ts`
- **Newsletter Edit Page**: `src/app/admin/newsletter/edit/page.tsx`

### Component Patterns to Follow
- Use MUI components consistent with existing design
- Follow existing form validation patterns from newsletter settings
- Use existing loading states and error handling patterns
- Mirror existing modal/dialog implementations in the codebase

### Database Migration
```sql
-- Migration to add AI fields to newsletter settings
-- File: prisma/migrations/[timestamp]_add_ai_newsletter_settings.sql

BEGIN;

ALTER TABLE newsletter_settings 
ADD COLUMN ai_system_prompt TEXT,
ADD COLUMN ai_refinement_prompt TEXT,
ADD COLUMN anthropic_api_key TEXT;

COMMIT;
```

## OTHER CONSIDERATIONS

### Technical Constraints
- **API Response Time**: Anthropic API calls may take 5-30 seconds
- **Token Limits**: Monitor Anthropic token usage and implement reasonable limits
- **Error Handling**: Graceful fallback when API is unavailable
- **Browser Compatibility**: Ensure modal works across all supported browsers

### Performance Requirements
- **Loading States**: Show clear progress indicators during AI generation
- **Caching**: Consider caching previous intro texts to reduce database queries
- **Timeout Handling**: Implement reasonable timeouts for API calls (30-60 seconds)

### Future Extensibility
- **Multiple AI Providers**: Architecture should allow adding other AI providers
- **Template System**: Prompt templates could be extended for other newsletter sections
- **Usage Analytics**: Consider tracking AI generation usage and success rates
- **A/B Testing**: Framework for testing different prompt variations

### Dependencies
```json
{
  "@anthropic-ai/sdk": "^0.27.0"
}
```

### Environment Variables
```env
# Add to .env.local template
ANTHROPIC_API_KEY=sk-ant-... # Optional fallback if not set in settings
```

### Testing Strategy
- **Unit Tests**: Test API routes with mocked Anthropic responses
- **Integration Tests**: Test complete generation workflow
- **Error Scenarios**: Test API failures, invalid inputs, missing settings
- **UI Tests**: Test modal behavior, form validation, loading states

---

**Implementation Priority**: High
**Estimated Complexity**: Medium-High
**Dependencies**: @anthropic-ai/sdk, existing newsletter system
**Target Users**: Newsletter administrators