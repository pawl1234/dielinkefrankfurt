---
description: Quickly capture feature ideas in a structured backlog format without implementation details.
---

The user input to you can be provided directly by the agent or as a command argument - you **MUST** consider it before proceeding with the prompt (if not empty).

User input:

$ARGUMENTS

The text the user typed after `/feature` in the triggering message **is** the feature idea. Use it to create a structured backlog entry.

## Execution Flow

1. **Parse feature idea** from $ARGUMENTS
   → If empty: ERROR "No feature idea provided. Usage: /feature <your idea>"

2. **Analyze the idea**:
   - Extract core concept and purpose
   - Identify affected areas (frontend, backend, infrastructure, etc.)
   - Determine type (new feature, improvement, refactor, technical debt)
   - If unclear: Ask max 2-3 targeted questions to clarify
   
3. **Load or create features.md**:
   - Check if `specs/features/features.md` exists
   - If not: Create using `.specify/templates/features-template.md`
   - Parse existing feature numbers to determine next number

4. **Generate feature entry**:
   - Assign next feature number (F-001, F-002, etc.)
   - Estimate complexity (XS/S/M/L/XL) based on scope
   - Set priority to "Medium" (user can adjust later)
   - Categorize appropriately
   - Write brief, developer-friendly description
   - Create 1-3 simple user stories (if applicable)

5. **Update features.md**:
   - Add new line to checklist at top
   - Add detailed section at bottom
   - Maintain consistent formatting

6. **Confirm completion**:
   - Report feature number, title, and file path
   - Show estimated complexity and category

---

## Estimation Guidelines

### Complexity (T-Shirt Sizing)
- **XS**: Small UI tweak, config change, simple text update (~1-2 hours)
- **S**: Single component/function, isolated change (~2-4 hours)
- **M**: Multiple components, some integration (~1-2 days)
- **L**: Cross-cutting change, multiple systems (~3-5 days)
- **XL**: Major feature, architectural impact (~1-2 weeks)

### Categories
- **Frontend**: UI/UX changes, client-side logic
- **Backend**: API, business logic, server-side processing
- **Data**: Database, data models, migrations
- **Infrastructure**: DevOps, deployment, monitoring
- **Security**: Authentication, authorization, encryption
- **Performance**: Optimization, caching, scaling
- **Documentation**: Docs, guides, API documentation
- **Architectural**: System design, patterns, structure
- **Integration**: Third-party services, external APIs

### Types
- **New Feature**: Adds new functionality
- **Improvement**: Enhances existing functionality
- **Refactor**: Code quality, maintainability (no user-visible change)
- **Technical Debt**: Fix design issues, update dependencies
- **Bug Fix**: Corrects defective behavior
- **Research**: Investigation, spike, proof of concept

---

## Output Rules

✅ **DO**:
- Keep descriptions concise and high-level
- Focus on WHAT and WHY, not HOW
- Use plain language developers can quickly scan
- Ask questions if the idea is too vague
- Estimate conservatively (bigger is safer)

❌ **DON'T**:
- Include implementation details or tech stack
- Write lengthy specifications
- Make wild guesses about unclear ideas
- Duplicate existing features (check the list first)

---

## Example Interaction

**User**: `/feature Add dark mode toggle to settings`

**Assistant**: 
*Analyzing feature idea...*

**F-012: Dark Mode Toggle**
- **Complexity**: M (Medium)
- **Category**: Frontend
- **Type**: New Feature
- **Priority**: Medium

✅ Added to `specs/features/features.md`

The feature involves UI changes across multiple components and theme state management. Estimated at ~1-2 days of work.

Would you like to adjust the priority or add more details?

---

## Clarification Questions Template

When the idea is unclear, ask targeted questions:
I need some clarification on your feature idea:

[Specific question about scope/purpose]
[Question about affected area]
[Question about constraints/requirements]

## Last Step
Make sure you edited the `specs/features/features.md` double check your changes. 