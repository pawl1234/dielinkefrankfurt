# Ideate Feature for Die Linke Frankfurt

I'll help you define a new feature for the Die Linke Frankfurt platform through an iterative, conversational process. We'll develop a comprehensive feature specification that can be implemented following our established patterns and architecture.

<context>
This is a Next.js 15 application for Die Linke Frankfurt (The Left Party in Frankfurt, Germany) that manages:
- Appointments and events
- Proposals to the board (Anträge)
- Political groups and their status reports
- Newsletter generation and distribution
- Admin workflows and approvals

Tech Stack: Next.js 15, React 18, TypeScript, MUI v7, Prisma/PostgreSQL, NextAuth.js, Vercel Blob Storage
</context>

<process>
1. I'll ask you one short and precise question at a time to understand your feature idea. Questions should be asked to give short replies. 
2. Each question builds on your previous answers
3. I'll incorporate relevant project context and constraints
4. If existing feature is referenced ask to add the corresponding file into context. Ask about source file to be added to the context.
5. We'll iteratively refine the feature until we have a complete specification
6. The final output will be a feature document in PRPs/feature/[feature-name].md
</process>

<ideation-approach>
I'll guide you through:
- Understanding the core problem/need
- Identifying target users and their workflows
- Exploring integration with existing features
- Considering technical constraints and patterns
- Planning data models and API requirements
- Designing user interfaces and interactions
- Addressing security and permission requirements
- Defining success metrics and validation
</ideation-approach>

<thinking>
Before asking my first question, I need to understand:
- What problem this feature solves
- Who will use it
- How it fits into the existing platform
- What similar patterns we can leverage
</thinking>

## First Question

**What specific problem or need are you looking to address with this new feature?**

Please describe:
- The current pain point or gap in functionality
- Who is experiencing this problem (admins, group members, public users, etc.)
- Why this is important for Die Linke Frankfurt's operations

<note>
Take your time to think about this. The clearer we are about the problem, the better our solution will be. If you have a rough idea but aren't sure about all the details, that's fine - we'll refine it together.
</note>

---

*After you answer, I'll ask follow-up questions to help us explore:*
- Specific use cases and user journeys
- Integration points with existing features
- Technical requirements and constraints
- UI/UX considerations
- Data and permission models

## Feature Definition Template

Once we've gathered all requirements through our conversation, I'll create a feature specification using this structure:

```markdown
## FEATURE: [Feature Name]

[Comprehensive description of the feature, its purpose, and value proposition]

### USER STORIES

[Detailed user stories covering different personas and use cases]

### INTEGRATION POINTS

[How this feature connects with existing functionality:
- Appointments system
- Groups and status reports
- Newsletter system
- Admin workflows
- Authentication and permissions]

### DATA MODEL

[Required database models, relationships, and fields]

### API REQUIREMENTS

[API endpoints, request/response formats, validation rules]

### UI/UX DESIGN

[Interface requirements, component patterns, user flows]

### SECURITY & PERMISSIONS

[Access control, data privacy considerations, authorization rules]

### EXAMPLES

[Concrete examples of the feature in action, including:
- Sample data
- User workflows
- Edge cases]

### DOCUMENTATION

[Resources and references needed:
- Similar features in other systems
- Technical documentation
- Design patterns to follow]

### OTHER CONSIDERATIONS

[Technical constraints, performance requirements, future extensibility]
```

<instructions>
Initial feature idea: $ARGUMENTS

Let's begin our ideation process. Remember, I'll ask one question at a time to help us thoroughly explore and define your feature idea.
</instructions>