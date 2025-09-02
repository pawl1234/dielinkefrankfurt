name: "AI Newsletter Intro Generation - Context-Rich PRP v1"
description: |

## Goal
Integrate AI-powered intro text generation directly into the Die Linke Frankfurt newsletter creation workflow, eliminating the need to switch to external browser-based AI tools while maintaining consistent quality and avoiding repetitive language patterns.

## Why
- **Workflow Efficiency**: Newsletter admins currently must switch between the application and external AI tools, breaking their workflow and increasing time to completion
- **Quality Consistency**: AI generation ensures consistent tone and style across newsletter editions while avoiding repetitive patterns
- **Integration Value**: Seamlessly integrates with existing newsletter edit page, settings system, and database architecture
- **User Impact**: Saves 10-15 minutes per newsletter creation session and reduces cognitive load for content creators

## What
A complete AI generation system that allows newsletter administrators to generate compelling intro texts using Anthropic's Claude API directly within the newsletter edit interface, with configurable prompts and refinement capabilities.

### Success Criteria
- [ ] Newsletter edit page includes "Intro generieren" button that opens AI generation modal
- [ ] Modal allows input of "Top Themen" and "Vorstandsprotokoll" for context-aware generation
- [ ] Generated text automatically avoids repetitive patterns by using previous newsletter intro
- [ ] Settings page includes AI configuration section for API key, system prompt, and refinement prompt
- [ ] Refinement workflow allows iterative improvement of generated content
- [ ] All AI endpoints require admin authentication and include proper error handling
- [ ] Database schema extended with AI configuration fields
- [ ] Complete test coverage for AI generation workflow

## All Needed Context

### Documentation & References
```yaml
# MUST READ - Include these in your context window
- url: https://raw.githubusercontent.com/anthropics/anthropic-sdk-typescript/refs/heads/main/README.md
  why: Official Anthropic SDK documentation with TypeScript examples, authentication, error handling
  critical: Use claude-sonnet-4-20250514 model with proper error handling patterns
  
- file: src/app/api/admin/newsletter/settings/route.ts
  why: Existing settings API pattern for extending with AI fields, includes validation and cache management
  critical: Follow existing updateNewsletterSettings pattern and cache clearing
  
- file: src/app/admin/newsletter/edit/page.tsx  
  why: Newsletter edit page structure and state management patterns to integrate AI modal
  critical: Uses useState, form validation, and existing Button/Alert MUI patterns
  
- file: src/app/admin/newsletter/settings/page.tsx
  why: Settings page accordion pattern and form handling for AI configuration section
  critical: Uses Accordion, TextField, and existing settings state management

- file: src/types/newsletter-types.ts
  why: Existing NewsletterSettings interface pattern for type safety
  critical: Extend with optional AI fields using same pattern as existing optional fields

- file: prisma/schema.prisma (Newsletter model lines 63-119)
  why: Database schema extension pattern for adding new fields
  critical: Newsletter model already established, add AI fields following same pattern

- file: src/lib/newsletter-service.ts (lines 1-50)
  why: Newsletter service patterns for settings cache management and database operations
  critical: Uses settingsCache pattern and clearNewsletterSettingsCache function
```

### Current Codebase Tree (relevant sections)
```bash
src/
├── app/
│   ├── admin/newsletter/
│   │   ├── edit/page.tsx                    # Where AI button integration goes
│   │   └── settings/page.tsx                # Where AI config section goes
│   └── api/admin/newsletter/
│       ├── settings/route.ts                # Extend for AI fields
│       └── ai/                              # NEW: AI endpoints directory
│           ├── generate/route.ts            # NEW: Generate intro endpoint
│           └── refine/route.ts              # NEW: Refine intro endpoint
├── components/newsletter/
│   └── AIGenerationModal.tsx               # NEW: AI generation modal component
├── types/
│   └── newsletter-types.ts                 # Extend NewsletterSettings interface
└── lib/
    └── newsletter-service.ts               # Extend for AI settings handling
```

### Desired Codebase Tree with New Files
```bash
src/
├── app/api/admin/newsletter/ai/
│   ├── generate/route.ts                   # POST endpoint for initial generation
│   └── refine/route.ts                     # POST endpoint for refinement
├── components/newsletter/
│   └── AIGenerationModal.tsx              # Modal component for AI workflow
├── types/
│   └── ai-types.ts                        # NEW: AI-specific TypeScript interfaces
└── tests/
    ├── api/newsletter/ai-generation.test.ts # Unit tests for AI endpoints
    └── components/AIGenerationModal.test.ts # Component tests for modal
```

### Known Gotchas of our codebase & Library Quirks
```typescript
// CRITICAL: Material UI v7 uses new Grid system
// WRONG: <Grid item xs={{12}}>
// CORRECT: <Grid size={{ xs: 12, md: 6 }}>

// CRITICAL: Next.js API routes require exported handler functions
export const POST: ApiHandler<SimpleRouteContext> = withAdminAuth(async (request: NextRequest) => {
  // Implementation
});

// CRITICAL: Prisma client requires proper connection handling in serverless
const prisma = new PrismaClient();
try {
  // operations
} finally {
  await prisma.$disconnect();
}

// CRITICAL: Newsletter settings use cache management pattern
clearNewsletterSettingsCache(); // Must call after updates

// CRITICAL: All forms use React Hook Form with validation only shown after submission
const [formSubmitted, setFormSubmitted] = useState(false);
// Show errors only when formSubmitted is true

// CRITICAL: Admin authentication pattern
export const POST: ApiHandler<SimpleRouteContext> = withAdminAuth(async (request: NextRequest) => {
  // Auto-validates admin session, returns 401 if unauthorized
});

// CRITICAL: Database operations use handleDatabaseError wrapper
try {
  const result = await prisma.newsletter.update({...});
} catch (error) {
  return handleDatabaseError(error, 'Failed to update newsletter settings');
}

// CRITICAL: Anthropic SDK conversation history for refinement
// WRONG: Single message for refinement (loses context)
const response = await anthropic.messages.create({
  messages: [{ role: 'user', content: refinementPrompt }]
});

// CORRECT: Include conversation history for refinement
const response = await anthropic.messages.create({
  messages: [
    { role: 'user', content: 'Generate newsletter intro text.' },
    { role: 'assistant', content: generatedText }, // Previous AI response  
    { role: 'user', content: refinementPrompt }    // New refinement request
  ]
});

// CRITICAL: Anthropic API error handling
// WRONG: Generic catch-all error handling
try {
  const response = await anthropic.messages.create({...});
} catch (error) {
  throw error; // Loses specific error information
}

// CORRECT: Anthropic-specific error handling with user-friendly messages
const response = await anthropic.messages.create({...}).catch(async (err) => {
  if (err instanceof Anthropic.APIError) {
    logger.error('Anthropic API Error', { status: err.status, name: err.name });
    if (err.status === 401) throw new Error('Invalid API key');
    if (err.status === 429) throw new Error('Rate limit exceeded');
    if (err.status >= 500) throw new Error('Service unavailable');
    throw new Error(`AI failed: ${err.message}`);
  } else {
    throw err; // Re-throw non-Anthropic errors
  }
});
```

## Implementation Blueprint

### Data Models and Structure

First, create the core data models to ensure type safety and consistency:

```typescript
// src/types/ai-types.ts - NEW FILE
export interface AIGenerationRequest {
  topThemes: string;
  boardProtocol: string;
  previousIntro?: string;
}

export interface AIRefinementRequest {
  generatedText: string;
  refinementInstructions: string;
}

export interface AIGenerationResponse {
  generatedText: string;
  success: boolean;
  error?: string;
}

// Anthropic message types for conversation history
export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Extend existing NewsletterSettings interface in src/types/newsletter-types.ts
export interface NewsletterSettings {
  // ... existing fields
  
  // NEW: AI configuration fields
  aiSystemPrompt?: string;
  aiRefinementPrompt?: string;
  anthropicApiKey?: string;
}
```

### List of Tasks to be Completed (in order)

```yaml
Task 1: Database Schema Extension
MODIFY prisma/schema.prisma:
  - FIND: Newsletter model (around line 63)
  - ADD after line 119 (before @@map): 
    ai_system_prompt     String?
    ai_refinement_prompt String?
    anthropic_api_key    String?
  - RUN: npx prisma db push

CREATE migration documentation:
  - FILE: docs/migrations/2025-01-23_add_ai_newsletter_settings.md
  - DOCUMENT: Schema changes and reasoning

Task 2: TypeScript Type Definitions
CREATE src/types/ai-types.ts:
  - FOLLOW: Pattern from src/types/newsletter-types.ts
  - INCLUDE: AIGenerationRequest, AIRefinementRequest, AIGenerationResponse interfaces
  
MODIFY src/types/newsletter-types.ts:
  - FIND: NewsletterSettings interface
  - ADD: aiSystemPrompt?, aiRefinementPrompt?, anthropicApiKey? fields
  - PRESERVE: All existing fields and optional patterns

Task 3: AI API Endpoints
CREATE src/app/api/admin/newsletter/ai/generate/route.ts:
  - FOLLOW: Pattern from src/app/api/admin/newsletter/settings/route.ts
  - USE: withAdminAuth wrapper for authentication
  - IMPLEMENT: Template replacement for {{topThemes}}, {{boardProtocol}}, {{previousIntro}}
  - INCLUDE: Input validation, Anthropic SDK integration, error handling
  
CREATE src/app/api/admin/newsletter/ai/refine/route.ts:
  - MIRROR: Same pattern as generate endpoint
  - IMPLEMENT: Refinement prompt processing with {{generatedText}}, {{refinementInstructions}}
  - KEEP: Same error handling and authentication patterns

Task 4: Newsletter Service Extension  
MODIFY src/lib/newsletter-service.ts:
  - FIND: getNewsletterSettings function
  - ENSURE: Returns AI fields from database with null fallbacks
  - FIND: updateNewsletterSettings function  
  - ADD: Handling for AI fields with validation
  - PRESERVE: Existing cache clearing logic

Task 5: AI Generation Modal Component
CREATE src/components/newsletter/AIGenerationModal.tsx:
  - FOLLOW: Modal patterns from existing SendConfirmationModal.tsx
  - USE: MUI Dialog, TextField (multiline), Button, CircularProgress
  - IMPLEMENT: State management for generation workflow
  - INCLUDE: Loading states, error handling, refinement workflow
  - PATTERN: Two-step process (generate -> optional refine -> accept)

Task 6: Newsletter Edit Page Integration
MODIFY src/app/admin/newsletter/edit/page.tsx:
  - FIND: Line 196 (after RichTextEditor)
  - INJECT: "Intro generieren" Button with AutoAwesome icon
  - ADD: showAIModal state and AIGenerationModal component
  - FOLLOW: Existing Button styling and disabled state patterns
  - IMPLEMENT: Overwrite warning when introductionText exists

Task 7: Newsletter Settings Page Extension
MODIFY src/app/admin/newsletter/settings/page.tsx:
  - FIND: Last Accordion section
  - ADD: New "AI-Generierung" Accordion with AutoAwesome icon
  - INCLUDE: Three TextField components (API key, system prompt, refinement prompt)
  - FOLLOW: Existing settings state management pattern
  - USE: password type for API key field

Task 8: Dependency Installation
RUN: npm install @anthropic-ai/sdk
UPDATE: package.json with dependency
VERIFY: TypeScript types are available

Task 9: Default Prompt Configuration
ADD to newsletter service:
  - DEFAULT_AI_SYSTEM_PROMPT constant (from feature spec)
  - DEFAULT_AI_REFINEMENT_PROMPT constant (from feature spec)
  - Integration with settings fallback logic

Task 10: Unit Tests
CREATE src/tests/api/newsletter/ai-generation.test.ts:
  - TEST: Generate endpoint with valid/invalid inputs
  - TEST: Refine endpoint functionality
  - TEST: Authentication requirements
  - MOCK: Anthropic SDK responses
  - FOLLOW: Existing API test patterns from src/tests/api/newsletter/

CREATE src/tests/components/AIGenerationModal.test.ts:
  - TEST: Modal open/close behavior
  - TEST: Form validation and submission
  - TEST: Loading states and error handling
  - FOLLOW: Component test patterns from src/tests/components/
```

### Per Task Pseudocode

```typescript
// Task 3: AI Generation Endpoint Pseudocode
export const POST: ApiHandler<SimpleRouteContext> = withAdminAuth(async (request: NextRequest) => {
  try {
    // PATTERN: Parse and validate request (see existing API routes)
    const { topThemes, boardProtocol } = await request.json();
    validateGenerationInput({ topThemes, boardProtocol });
    
    // PATTERN: Get settings with cache (see newsletter-service.ts)
    const settings = await getNewsletterSettings();
    if (!settings.anthropicApiKey) {
      throw new Error('Anthropic API key not configured');
    }
    
    // PATTERN: Query previous newsletter (see newsletter-archive.ts patterns)
    const previousNewsletter = await getPreviousNewsletterIntro();
    
    // PATTERN: Template replacement (simple string replace)
    const processedPrompt = settings.aiSystemPrompt
      .replace('{{topThemes}}', topThemes)
      .replace('{{boardProtocol}}', boardProtocol)  
      .replace('{{previousIntro}}', previousNewsletter?.introductionText || '');
    
    // CRITICAL: Anthropic SDK integration - Single message for initial generation
    const anthropic = new Anthropic({ apiKey: settings.anthropicApiKey });
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: processedPrompt }]
    }).catch(async (err) => {
      // CRITICAL: Handle Anthropic-specific errors
      if (err instanceof Anthropic.APIError) {
        logger.error('Anthropic API Error', {
          module: 'ai-generation',
          context: {
            status: err.status,
            name: err.name,
            message: err.message
          }
        });
        
        // Provide user-friendly error messages based on error type
        if (err.status === 401) {
          throw new Error('Invalid Anthropic API key. Please check your settings.');
        } else if (err.status === 429) {
          throw new Error('AI service rate limit exceeded. Please try again in a few minutes.');
        } else if (err.status >= 500) {
          throw new Error('AI service is temporarily unavailable. Please try again later.');
        } else {
          throw new Error(`AI generation failed: ${err.message}`);
        }
      } else {
        throw err; // Re-throw non-Anthropic errors
      }
    });
    
    // PATTERN: Standard API response format
    return NextResponse.json({
      generatedText: response.content[0].text,
      success: true
    });
    
  } catch (error) {
    // PATTERN: Use existing error handling (see api-auth.ts)
    return apiErrorResponse(error, 'Failed to generate newsletter intro');
  }
});

// Task 3: AI Refinement Endpoint Pseudocode
export const POST: ApiHandler<SimpleRouteContext> = withAdminAuth(async (request: NextRequest) => {
  try {
    // PATTERN: Parse and validate request
    const { generatedText, refinementInstructions } = await request.json();
    validateRefinementInput({ generatedText, refinementInstructions });
    
    // PATTERN: Get settings with cache
    const settings = await getNewsletterSettings();
    if (!settings.anthropicApiKey) {
      throw new Error('Anthropic API key not configured');
    }
    
    // PATTERN: Template replacement for refinement prompt
    const refinementPrompt = settings.aiRefinementPrompt
      .replace('{{generatedText}}', generatedText)
      .replace('{{refinementInstructions}}', refinementInstructions);
    
    // CRITICAL: Anthropic SDK with conversation history for refinement
    const anthropic = new Anthropic({ apiKey: settings.anthropicApiKey });
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [
        { role: 'user', content: 'Generate newsletter intro text.' },
        { role: 'assistant', content: generatedText }, // Previous AI response
        { role: 'user', content: refinementPrompt }    // Refinement request
      ]
    }).catch(async (err) => {
      // CRITICAL: Handle Anthropic-specific errors (same pattern as generate)
      if (err instanceof Anthropic.APIError) {
        logger.error('Anthropic API Error (refinement)', {
          module: 'ai-refinement',
          context: {
            status: err.status,
            name: err.name,
            message: err.message
          }
        });
        
        // Provide user-friendly error messages based on error type
        if (err.status === 401) {
          throw new Error('Invalid Anthropic API key. Please check your settings.');
        } else if (err.status === 429) {
          throw new Error('AI service rate limit exceeded. Please try again in a few minutes.');
        } else if (err.status >= 500) {
          throw new Error('AI service is temporarily unavailable. Please try again later.');
        } else {
          throw new Error(`AI refinement failed: ${err.message}`);
        }
      } else {
        throw err; // Re-throw non-Anthropic errors
      }
    });
    
    // PATTERN: Standard API response format
    return NextResponse.json({
      generatedText: response.content[0].text,
      success: true
    });
    
  } catch (error) {
    // PATTERN: Use existing error handling
    return apiErrorResponse(error, 'Failed to refine newsletter intro');
  }
});
```

### Integration Points
```yaml
DATABASE:
  - setup: Existing PostgreSQL connection via DATABASE_URL
  - migration: "npx prisma db push" (schema changes)
  - pattern: "Add fields to existing Newsletter model"
  
CONFIG:
  - add to: Database via settings UI (not .env)
  - pattern: "Store API key in newsletter_settings table"
  
ROUTES:
  - add to: src/app/api/admin/newsletter/ai/
  - pattern: "POST endpoints with withAdminAuth wrapper"
  
COMPONENTS:
  - add to: src/components/newsletter/
  - pattern: "MUI Dialog with form state management"
```

## Validation Loop

### Level 1: Syntax & Style
```bash
# Run these FIRST - fix any errors before proceeding
npm run lint                    # ESLint with auto-fix
npm run typecheck              # TypeScript type checking

# Expected: No errors. If errors, READ the error and fix.
```

### Level 2: Unit Tests for Each New Feature
```typescript
// CREATE src/tests/api/newsletter/ai-generation.test.ts
describe('AI Newsletter Generation API', () => {
  it('should generate intro text with valid input', async () => {
    // Mock Anthropic SDK response
    const mockAnthropic = {
      messages: { create: jest.fn().mockResolvedValue({
        content: [{ text: 'Generated intro text...' }]
      })}
    };
    jest.doMock('@anthropic-ai/sdk', () => ({
      default: jest.fn(() => mockAnthropic)
    }));
    
    const response = await POST(mockRequest({
      topThemes: 'Climate demo',
      boardProtocol: 'New projects approved'
    }));
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.generatedText).toContain('Generated intro text');
  });

  it('should return 401 for unauthenticated requests', async () => {
    const response = await POST(mockUnauthenticatedRequest({
      topThemes: 'Test', boardProtocol: 'Test'
    }));
    expect(response.status).toBe(401);
  });

  it('should handle Anthropic API errors gracefully', async () => {
    // Mock Anthropic.APIError with proper error properties
    const mockAnthropicError = Object.assign(new Error('Invalid API key'), {
      status: 401,
      name: 'AuthenticationError',
      headers: {}
    });
    Object.setPrototypeOf(mockAnthropicError, Anthropic.APIError.prototype);
    
    const mockAnthropic = {
      messages: { 
        create: jest.fn().mockImplementation(() => {
          return Promise.reject(mockAnthropicError);
        })
      }
    };
    jest.doMock('@anthropic-ai/sdk', () => ({
      default: jest.fn(() => mockAnthropic),
      APIError: Anthropic.APIError
    }));
    
    const response = await POST(mockRequest({
      topThemes: 'Test', boardProtocol: 'Test'  
    }));
    
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toContain('Invalid Anthropic API key');
  });

  it('should handle rate limit errors with user-friendly message', async () => {
    // Mock rate limit error (429)
    const mockRateLimitError = Object.assign(new Error('Rate limit exceeded'), {
      status: 429,
      name: 'RateLimitError',
      headers: {}
    });
    Object.setPrototypeOf(mockRateLimitError, Anthropic.APIError.prototype);
    
    const mockAnthropic = {
      messages: { 
        create: jest.fn().mockImplementation(() => {
          return Promise.reject(mockRateLimitError);
        })
      }
    };
    jest.doMock('@anthropic-ai/sdk', () => ({
      default: jest.fn(() => mockAnthropic),
      APIError: Anthropic.APIError
    }));
    
    const response = await POST(mockRequest({
      topThemes: 'Test', boardProtocol: 'Test'  
    }));
    
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toContain('rate limit exceeded');
  });
});
```

```bash
# Run and iterate until passing:
npm test -- src/tests/api/newsletter/ai-generation.test.ts
# If failing: Read error, understand root cause, fix code, re-run
```

### Level 3: Integration Test
```bash
# Start development server
npm run dev

# Test the AI generation endpoint manually
curl -X POST http://localhost:3000/api/admin/newsletter/ai/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=admin_session" \
  -d '{
    "topThemes": "Klimaschutz-Demo am Samstag, Mietenstopp-Petition",
    "boardProtocol": "Beschluss: Unterstützung der Klimademo mit eigenem Stand"
  }'

# Expected: {"generatedText": "...", "success": true}
# If error: Check browser network tab or server logs for detailed error info
```

### Level 4: UI Integration Test
```bash
# Manual testing workflow:
# 1. Login as admin user
# 2. Navigate to /admin/newsletter/edit
# 3. Click "Intro generieren" button  
# 4. Fill in Top Themen and Vorstandsprotokoll
# 5. Click "Generieren" and verify loading state
# 6. Verify generated text appears
# 7. Test refinement workflow
# 8. Accept generated text and verify it fills intro field
```

## Final Validation Checklist
- [ ] All tests pass: `npm test`
- [ ] No linting errors: `npm run lint`  
- [ ] No type errors: `npm run typecheck`
- [ ] Manual test successful: `npm run dev`
- [ ] AI generation works end-to-end in browser
- [ ] Settings page allows API key configuration
- [ ] Database schema updated successfully
- [ ] Previous newsletter intro correctly avoids repetition
- [ ] Error cases handled gracefully (missing API key, network errors)
- [ ] Loading states show appropriate feedback
- [ ] Modal UX follows existing patterns
- [ ] Authentication properly blocks unauthorized access

---

## Anti-Patterns to Avoid
- ❌ Don't create new authentication patterns - use existing withAdminAuth
- ❌ Don't skip input validation - validate all AI inputs for length and content
- ❌ Don't ignore Anthropic API errors - use .catch() with instanceof Anthropic.APIError checks
- ❌ Don't use generic error handling for Anthropic - provide specific user-friendly messages for 401, 429, 5xx
- ❌ Don't use any type - create proper TypeScript interfaces for all AI data
- ❌ Don't store API keys in environment variables - use database storage as specified
- ❌ Don't forget to disconnect Prisma client in API routes
- ❌ Don't use old MUI Grid syntax - use new size prop
- ❌ Don't show form validation errors before submission attempt
- ❌ Don't mock src/lib modules - use real implementations in tests
- ❌ Don't hardcode prompts - make them configurable through settings
- ❌ Don't forget cache clearing after settings updates

## Confidence Score: 9/10

**High confidence for one-pass implementation success due to:**
- ✅ Complete context provided from existing codebase patterns
- ✅ Detailed task breakdown with specific file locations and patterns
- ✅ Executable validation gates with specific commands
- ✅ Known gotchas and library quirks documented
- ✅ Real pseudocode with critical implementation details
- ✅ External documentation URLs for Anthropic SDK
- ✅ Error handling patterns from existing codebase
- ✅ TypeScript type safety patterns established
- ✅ Test patterns for both unit and integration testing
- ✅ Database migration approach clearly defined

**Minor risk areas:**
- Anthropic API rate limits or authentication issues (mitigated by proper error handling)
- Complex modal state management (mitigated by following existing modal patterns)