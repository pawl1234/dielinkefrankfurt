# Create PRP

## Feature file: $ARGUMENTS

Generate a complete PRP for TypeScript/Next.js feature implementation with thorough research. Ensure context is passed to the AI agent to enable self-validation and iterative refinement. Read the feature file first to understand what needs to be created, how the examples provided help, and any other considerations.

The AI agent only gets the context you are appending to the PRP and training data. Assume the AI agent has access to the codebase and the same knowledge cutoff as you, so its important that your research findings are included or referenced in the PRP. The Agent has Websearch capabilities, so pass urls to documentation and examples.

## Research Process

1. **Codebase Analysis**
   - Search for similar features/patterns in the codebase
   - Identify TypeScript interfaces and types to reference
   - Note existing Next.js API route patterns
   - Check React component patterns and conventions
   - Review test patterns using Jest and React Testing Library
   - Examine Prisma schema and database patterns

2. **External Research**
   - Search for similar Next.js/React features online
   - Library documentation (Next.js, React, MUI, Prisma - include specific URLs)
   - TypeScript implementation examples (GitHub/StackOverflow/blogs)
   - Best practices and common pitfalls for React/Next.js

3. **User Clarification** (if needed)
   - Specific React component patterns to mirror and where to find them?
   - Next.js API route integration requirements and where to find them?
   - Database schema changes needed in Prisma?

## PRP Generation

Using @PRPs/templates/prp_base.md as template:

### Critical Context to Include and pass to the AI agent as part of the PRP
- **Documentation**: URLs with specific sections (Next.js, React, MUI, Prisma)
- **Code Examples**: Real TypeScript/React snippets from codebase
- **Gotchas**: Library quirks, MUI v7 changes, Prisma patterns, Next.js App Router specifics
- **Patterns**: Existing React component patterns, API route patterns, testing patterns

### Implementation Blueprint
- Start with TypeScript pseudocode showing approach
- Reference real files for React/Next.js patterns
- Include proper error handling strategy for async operations
- List tasks to be completed to fulfill the PRP in the order they should be completed
- Include proper TypeScript typing throughout

### Validation Gates (Must be Executable) for TypeScript/Next.js
```bash
# Syntax/Style
npm run lint                    # ESLint with auto-fix
npm run typecheck              # TypeScript type checking

# Unit Tests
npm test -- src/tests/new-feature.test.ts

# Integration Tests
npm run dev                    # Start dev server
# Test API endpoints with curl or browser

```

*** CRITICAL AFTER YOU ARE DONE RESEARCHING AND EXPLORING THE CODEBASE BEFORE YOU START WRITING THE PRP ***

*** ULTRATHINK ABOUT THE PRP AND PLAN YOUR APPROACH THEN START WRITING THE PRP ***

## Output
Save as: `PRPs/{ISO-date-format}_{feature-name}-{verison}.md` exmaple: PRPs/2025-07-09_newsletter-analytics-v2.md

## Quality Checklist
- [ ] All necessary context included (TypeScript types, React patterns, Next.js specifics)
- [ ] Validation gates are executable by AI (npm commands work)
- [ ] References existing React/Next.js patterns from codebase
- [ ] Clear implementation path with proper TypeScript typing
- [ ] Error handling documented for async operations
- [ ] Prisma database patterns included if needed
- [ ] MUI v7 component patterns referenced
- [ ] Testing patterns with Jest included

Score the PRP on a scale of 1-10 (confidence level to succeed in one-pass implementation using claude codes)

Remember: The goal is one-pass implementation success through comprehensive TypeScript/Next.js context.