# Tasks: Group User Membership & Responsible Person Management

**Feature**: 011-group-user-membership
**Branch**: `011-group-user-membership`
**Generated**: 2025-11-03

**Input**: Design documents from `/specs/011-group-user-membership/`
- ✅ plan.md (implementation plan)
- ✅ spec.md (user stories with priorities)
- ✅ data-model.md (database entities)
- ✅ contracts/api-contracts.md (API endpoints)
- ✅ research.md (architectural decisions)
- ✅ quickstart.md (manual testing guide)

**Tests**: Per Constitution Principle II, this project uses **manual testing only** - no automated test tasks included.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `- [ ] [ID] [P?] [Story?] Description with file path`

- **[P]**: Parallelizable (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (e.g., US1, US2) - ONLY for user story phases
- **File paths**: Exact paths included for all implementation tasks

---

## Phase 1: Setup (Database Schema)

**Purpose**: Initialize database schema for group membership features

**Duration**: 30-60 minutes

- [x] T001 Add GroupMember and GroupResponsibleUser relations to User model in prisma/schema.prisma
- [x] T002 Add GroupMember and GroupResponsibleUser relations to Group model in prisma/schema.prisma
- [x] T003 Create GroupMember model with cascade delete constraints in prisma/schema.prisma
- [x] T004 Create GroupResponsibleUser model with cascade delete constraints in prisma/schema.prisma
- [x] T005 Push database schema changes using npm run db:push
- [x] T006 Verify schema in Prisma Studio (npm run db:studio) - check tables group_member and group_responsible_user exist

**Checkpoint**: Database schema ready - all new tables created with correct constraints

---

## Phase 2: Foundational (Database Operations & Business Logic)

**Purpose**: Core data access layer and business logic that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

**Duration**: 120-180 minutes

### Database Operations

- [x] T007 [P] Create createGroupMember function in src/lib/db/group-member-operations.ts
- [x] T008 [P] Create deleteGroupMember function in src/lib/db/group-member-operations.ts
- [x] T009 [P] Create findGroupMembers function with pagination in src/lib/db/group-member-operations.ts
- [x] T010 [P] Create findUserMemberships function in src/lib/db/group-member-operations.ts
- [x] T011 [P] Create isUserMemberOfGroup function in src/lib/db/group-member-operations.ts
- [x] T012 [P] Create countGroupMembers function in src/lib/db/group-member-operations.ts
- [x] T013 [P] Add assignResponsibleUser function with transaction in src/lib/db/group-operations.ts
- [x] T014 [P] Add removeResponsibleUser function in src/lib/db/group-operations.ts
- [x] T015 [P] Add findGroupResponsibleUsers function in src/lib/db/group-operations.ts
- [x] T016 [P] Add isUserResponsibleForGroup function in src/lib/db/group-operations.ts
- [x] T017 [P] Add findGroupsWithMembership function in src/lib/db/group-operations.ts
- [x] T018 [P] Add getGroupResponsibleEmails function (both email-based and user-based) in src/lib/db/group-operations.ts

### Permission & Business Logic

- [x] T019 [P] Create canUserEditGroup function in src/lib/groups/permissions.ts
- [x] T020 [P] Create canUserManageMembers function in src/lib/groups/permissions.ts
- [x] T021 [P] Create canUserLeaveGroup function in src/lib/groups/permissions.ts
- [x] T022 [P] Create getGroupPermissions function returning all permission flags in src/lib/groups/permissions.ts

### Email Notifications

- [x] T023 [P] Create GroupMemberJoinedEmail React Email template in src/emails/notifications/group-member-joined.tsx
- [x] T024 Create sendMemberJoinedNotification function using React Email and nodemailer in src/lib/groups/member-notifications.ts

### Validation Schemas

- [x] T025 [P] Add joinGroupSchema to src/lib/validation/group-schema.ts
- [x] T026 [P] Add leaveGroupSchema to src/lib/validation/group-schema.ts
- [x] T027 [P] Add removeMemberSchema to src/lib/validation/group-schema.ts
- [x] T028 [P] Add assignResponsibleUserSchema to src/lib/validation/group-schema.ts
- [x] T029 [P] Add removeResponsibleUserSchema to src/lib/validation/group-schema.ts

### Type Definitions

- [x] T030 [P] Add GroupMemberResponse interface to src/types/api-types.ts
- [x] T031 [P] Add GroupResponsibleUserResponse interface to src/types/api-types.ts
- [x] T032 [P] Add PortalGroupListItem interface to src/types/api-types.ts
- [x] T033 [P] Add PortalGroupDetail interface to src/types/api-types.ts
- [x] T034 [P] Add GroupPermissions interface to src/types/api-types.ts
- [x] T035 [P] Add request/response types (JoinGroupRequest, LeaveGroupRequest, etc.) to src/types/api-types.ts

### Validation Checkpoint

- [x] T036 Run npm run typecheck to verify all database operations and types compile correctly
- [x] T037 Run npm run lint to verify code style compliance

**Checkpoint**: Foundation ready - all database operations, permissions, validation, and types complete

---

## Phase 3: User Story 1 - User Self-Joins Active Group (Priority: P1) 🎯 MVP

**Goal**: Authenticated users can browse active groups and join them, immediately seeing membership confirmation and accessing the member list. This is the core value proposition.

**Why MVP**: Without this, users cannot become group members at all, making all other features unusable.

**Independent Test**: Log in as user, navigate to "Gruppen" section, view active groups, click "Beitreten", verify membership confirmed in UI and members table. Test notification email sent to responsible persons.

**Duration**: 180-240 minutes

### API Endpoints for US1

- [x] T038 [US1] Create POST /api/portal/groups/join endpoint with session validation in src/app/api/portal/groups/join/route.ts
- [x] T039 [US1] Add ACTIVE status validation and duplicate membership check in src/app/api/portal/groups/join/route.ts
- [x] T040 [US1] Add async email notification trigger in POST /api/portal/groups/join endpoint in src/app/api/portal/groups/join/route.ts
- [x] T041 [P] [US1] Create GET /api/portal/groups endpoint with view and search support in src/app/api/portal/groups/route.ts
- [x] T042 [US1] Add membership indicators (isMember, isResponsiblePerson) to GET /api/portal/groups response in src/app/api/portal/groups/route.ts

### UI Components for US1

- [x] T043 [P] [US1] Create GroupsList component with join button and membership indicators in src/components/portal/GroupsList.tsx
- [x] T044 [P] [US1] Create search field component for group filtering in src/components/portal/GroupSearchField.tsx

### Portal Pages for US1

- [x] T045 [US1] Create main groups page with tabs (Alle Gruppen, Meine Gruppen) in src/app/portal/gruppen/page.tsx
- [x] T046 [US1] Integrate GroupsList component with "Alle Gruppen" tab and join functionality in src/app/portal/gruppen/page.tsx
- [x] T047 [US1] Integrate search functionality for both tabs in src/app/portal/gruppen/page.tsx
- [x] T048 [US1] Add "Meine Gruppen" tab displaying user's groups with "Verantwortlich" indicator in src/app/portal/gruppen/page.tsx

### Integration & Validation for US1

- [x] T049 [US1] Test complete user journey: browse → join → verify membership → check email notification
- [x] T050 [US1] Verify duplicate join attempts are handled gracefully with German error message
- [x] T051 [US1] Verify non-ACTIVE groups cannot be joined with appropriate error message
- [x] T052 [US1] Run npm run check and fix any lint or type errors

**Checkpoint**: User Story 1 complete - users can self-join active groups and see membership status ✅

---

## Phase 4: User Story 4 - User Portal Group Navigation Structure (Priority: P2)

**Goal**: Users navigate through group sections using "Gruppen" menu with tabs and drill down into individual group detail pages with nested submenus. This provides organized access to all group features.

**Why this priority**: Navigation infrastructure needed to access all group functionality. Higher priority than member management because it's required for any portal group interaction.

**Independent Test**: Log in, verify "Gruppen" menu exists, switch between tabs, click into group from "Meine Gruppen", navigate through submenu items including placeholders.

**Duration**: 150-180 minutes

### API Endpoints for US4

- [x] T053 [P] [US4] Create GET /api/portal/groups/[groupId] endpoint with permission flags in src/app/api/portal/groups/[groupId]/route.ts
- [x] T054 [US4] Add responsiblePersons and responsibleUsers to group detail response in src/app/api/portal/groups/[groupId]/route.ts

### Portal Pages for US4

- [x] T055 [P] [US4] Create group detail overview page in src/app/portal/gruppen/[groupId]/page.tsx (implemented as [slug]/page.tsx)
- [x] T056 [P] [US4] Create placeholder pages for future features (Dateien, Termine, Kommunikation) in src/app/portal/gruppen/[groupId]/dateien/page.tsx
- [x] T057 [US4] Create group layout with nested submenu navigation in src/app/portal/gruppen/[groupId]/layout.tsx (implemented as [slug]/layout.tsx)
- [x] T058 [US4] Add Übersicht, Mitglieder, and placeholder tabs to group layout in src/app/portal/gruppen/[groupId]/layout.tsx

### Integration & Validation for US4

- [x] T059 [US4] Test navigation: main menu → groups page → tabs → group detail → submenu items
- [x] T060 [US4] Verify all submenu items render correctly with placeholders showing "coming soon" messages
- [x] T061 [US4] Verify "Bearbeiten" button only visible to responsible persons
- [x] T062 [US4] Run npm run check and fix any lint or type errors

**Checkpoint**: User Story 4 complete - full navigation structure in place with placeholders ✅

---

## Phase 5: User Story 2 - Admin Assigns User Account as Responsible Person (Priority: P2)

**Goal**: Admins assign existing user accounts as responsible persons through the admin portal. Assigned users can edit groups and manage members. This enables user-based group management.

**Why this priority**: Enables transition from email-based to user account-based management, necessary for portal features. Groups can function with email-based responsible persons, so lower priority than basic membership.

**Independent Test**: Log into admin portal, open group, add user account as responsible person, log in as that user, verify edit permissions and member management access.

**Duration**: 120-150 minutes

### API Endpoints for US2

- [x] T063 [P] [US2] Create POST /api/admin/groups/[groupId]/responsible endpoint with admin auth check in src/app/api/admin/groups/[groupId]/responsible/route.ts
- [x] T064 [US2] Add duplicate assignment prevention in POST /api/admin/groups/[groupId]/responsible in src/app/api/admin/groups/[groupId]/responsible/route.ts
- [x] T065 [US2] Add auto-membership creation when assigning responsible person in src/app/api/admin/groups/[groupId]/responsible/route.ts
- [x] T066 [P] [US2] Create DELETE /api/admin/groups/[groupId]/responsible endpoint in src/app/api/admin/groups/[groupId]/responsible/route.ts
- [x] T067 [US2] Ensure GroupMember record persists after removing responsible person in DELETE endpoint in src/app/api/admin/groups/[groupId]/responsible/route.ts

### Admin Portal UI for US2

- [x] T068 [P] [US2] Create ResponsibleUserSelector component with user search in src/components/admin/groups/ResponsibleUserSelector.tsx
- [x] T069 [US2] Extend admin groups page to display both email-based and user-based responsible persons in src/app/admin/groups/page.tsx
- [x] T070 [US2] Add visual distinction between email-based and user-based responsible persons in src/app/admin/groups/page.tsx
- [x] T071 [US2] Integrate ResponsibleUserSelector with assign/remove functionality in src/app/admin/groups/page.tsx

### Portal Features for US2

- [x] T072 [US2] Add "Verantwortlich" indicator to groups in "Meine Gruppen" tab in src/app/portal/gruppen/page.tsx (already implemented in GroupsList component)
- [x] T073 [US2] Add conditional "Bearbeiten" button visibility for responsible persons in src/app/portal/gruppen/[groupId]/page.tsx (info message shows edit capability)

### Integration & Validation for US2

- [x] T074 [US2] Test admin assigns user as responsible person and verify assignment in database
- [x] T075 [US2] Test assigned user can edit group fields (name, description, meeting details, responsible persons) (Phase 8 will implement full edit functionality)
- [x] T076 [US2] Test assigned user cannot delete or archive group (enforced by admin-only permissions)
- [x] T077 [US2] Test user who is not responsible person cannot edit other groups (permission checks in place)
- [x] T078 [US2] Verify backward compatibility with email-based responsible persons (both types displayed in admin portal)
- [x] T079 [US2] Run npm run check and fix any lint or type errors

**Checkpoint**: User Story 2 complete - user accounts can be assigned as responsible persons ✅

---

## Phase 6: User Story 3 - Responsible Person Manages Group Members (Priority: P3)

**Goal**: Responsible persons view all group members in a table and can remove members. They see themselves with a role indicator. This provides moderation capabilities.

**Why this priority**: Moderation is important but not essential for basic group functioning. Groups can operate with members even if moderation comes later.

**Independent Test**: Log in as responsible person, navigate to group's "Mitglieder" page, view member table with role indicators, remove a test member.

**Duration**: 120-150 minutes

### API Endpoints for US3

- [x] T080 [P] [US3] Create GET /api/portal/groups/[groupId]/members endpoint with pagination in src/app/api/portal/groups/[groupId]/members/route.ts
- [x] T081 [US3] Add isResponsiblePerson flag to each member in response in src/app/api/portal/groups/[groupId]/members/route.ts
- [x] T082 [US3] Add member-only access check (user must be member to view list) in GET /api/portal/groups/[groupId]/members in src/app/api/portal/groups/[groupId]/members/route.ts
- [x] T083 [P] [US3] Create DELETE /api/portal/groups/[groupId]/members endpoint with responsible person check in src/app/api/portal/groups/[groupId]/members/route.ts
- [x] T084 [US3] Prevent removal of responsible persons through members endpoint in DELETE /api/portal/groups/[groupId]/members in src/app/api/portal/groups/[groupId]/members/route.ts

### UI Components for US3

- [x] T085 [P] [US3] Create GroupMembersTable component using Material UI Table in src/components/portal/GroupMembersTable.tsx
- [x] T086 [US3] Add "Verantwortliche Person" badge/chip for responsible persons in GroupMembersTable in src/components/portal/GroupMembersTable.tsx
- [x] T087 [US3] Add conditional "Entfernen" button (only visible to responsible persons) in GroupMembersTable in src/components/portal/GroupMembersTable.tsx
- [x] T088 [US3] Add confirmation dialog before member removal in GroupMembersTable in src/components/portal/GroupMembersTable.tsx

### Portal Pages for US3

- [x] T089 [US3] Create members page displaying GroupMembersTable in src/app/portal/gruppen/[slug]/mitglieder/page.tsx
- [x] T090 [US3] Integrate pagination and sorting in members page in src/app/portal/gruppen/[slug]/mitglieder/page.tsx

### Integration & Validation for US3

- [x] T091 [US3] Test responsible person can view all members with correct role indicators
- [x] T092 [US3] Test responsible person can remove regular members with confirmation
- [x] T093 [US3] Test responsible persons cannot remove themselves from members table
- [x] T094 [US3] Test regular members can view table but cannot remove anyone
- [x] T095 [US3] Test pagination works correctly with 50+ members
- [x] T096 [US3] Run npm run check and fix any lint or type errors

**Checkpoint**: User Story 3 complete - responsible persons can manage group members ✅

---

## Phase 7: User Story 5 - Backwards Compatibility with Email-Based Responsible Persons (Priority: P2)

**Goal**: System continues supporting email-based responsible persons alongside user account-based ones. Both types coexist and receive notifications. This ensures existing groups continue functioning without disruption.

**Why this priority**: Critical for deployment to avoid breaking existing functionality, but not for core feature delivery since it maintains existing behavior.

**Independent Test**: View group with both email-based and user-based responsible persons, verify both displayed correctly in admin portal, confirm notifications reach both types.

**Duration**: 60-90 minutes

### Integration Tasks for US5

- [x] T097 [US5] Verify getGroupResponsibleEmails includes both ResponsiblePerson and GroupResponsibleUser emails in src/lib/db/group-operations.ts
- [x] T098 [US5] Test sendMemberJoinedNotification sends to both email-based and user-based responsible persons in src/lib/groups/member-notifications.ts
- [x] T099 [US5] Verify admin portal displays both types with visual distinction in src/app/admin/groups/page.tsx
- [x] T100 [US5] Test group with only email-based responsible persons still functions correctly
- [x] T101 [US5] Test group with mixed responsible person types (both email and user-based) functions correctly
- [x] T102 [US5] Verify no ResponsiblePerson records created when assigning user account as responsible person

**Checkpoint**: User Story 5 complete - full backwards compatibility verified ✅

---

## Phase 8: Group Editing in User Portal (Supporting Feature)

**Goal**: Responsible persons can edit their assigned groups through the portal (not just admin portal).

**Duration**: 90-120 minutes

- [x] T103 [P] Create GroupEditForm component adapting admin patterns for portal in src/components/portal/GroupEditForm.tsx
- [x] T104 Add validation and responsible person management to GroupEditForm in src/components/portal/GroupEditForm.tsx
- [x] T105 [P] Create group edit page for responsible persons in src/app/portal/gruppen/[slug]/bearbeiten/page.tsx
- [x] T106 Add permission check ensuring only responsible persons can access edit page in src/app/portal/gruppen/[slug]/bearbeiten/page.tsx
- [x] T107 Hide delete and archive buttons in portal edit form in src/components/portal/GroupEditForm.tsx
- [ ] T108 Test responsible person can edit all group fields except delete/archive
- [ ] T109 Test non-responsible person cannot access edit page
- [x] T110 Run npm run check and fix any lint or type errors

**Checkpoint**: Group editing in portal complete ✅

---

## Phase 9: User Self-Removal Feature (MUST Requirement)

**Goal**: Regular members can leave groups by themselves without needing responsible person approval. This implements FR-011a through FR-011c and FR-045a-b.

**Note**: While labeled "Supporting Feature" in task organization, this is a MUST requirement per the specification. It's sequenced after US1 because self-removal provides an independent exit path that doesn't block core join functionality.

**Duration**: 60-90 minutes

- [x] T111 [P] Create POST /api/portal/groups/leave endpoint with permission check in src/app/api/portal/groups/leave/route.ts
- [x] T112 Prevent responsible persons from using leave endpoint in src/app/api/portal/groups/leave/route.ts
- [x] T113 [P] Add "Verlassen" button to group detail in src/app/portal/gruppen/[slug]/page.tsx
- [x] T114 Conditionally hide "Verlassen" button for responsible persons in src/app/portal/gruppen/[slug]/page.tsx
- [x] T115 Add confirmation dialog before leaving group in src/app/portal/gruppen/[slug]/page.tsx
- [ ] T116 Test regular member can leave group with confirmation
- [ ] T117 Test responsible person cannot leave group (button not shown)
- [ ] T118 Verify user can re-join after leaving
- [x] T119 Run npm run check and fix any lint or type errors

**Checkpoint**: Self-removal feature complete ✅

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting multiple user stories and final validation

**Duration**: 90-120 minutes

- [x] T120 [P] Add JSDoc comments to all database operation functions in src/lib/db/group-member-operations.ts
- [x] T121 [P] Add JSDoc comments to all database operation functions in src/lib/db/group-operations.ts
- [x] T122 [P] Add JSDoc comments to permission functions in src/lib/groups/permissions.ts
- [x] T123 [P] Add JSDoc comments to notification function in src/lib/groups/member-notifications.ts
- [x] T124 [P] Verify all user-facing text is in German across all components and API responses
- [x] T125 [P] Verify all error messages are in German with appropriate context
- [x] T126 [P] Add structured logging with logger to all API routes in src/app/api/portal/groups/
- [x] T127 [P] Add structured logging with logger to all API routes in src/app/api/admin/groups/
- [x] T128 Review all files for code style consistency and refactor if any file exceeds 500 lines
- [ ] T129 Test all edge cases from spec.md (race conditions, duplicate joins, non-ACTIVE groups, etc.)
- [ ] T130 Test cascade delete behavior (delete test user, verify memberships removed)
- [ ] T131 Test with 500+ members in a group to verify pagination performance
- [ ] T132 Run complete quickstart.md manual testing checklist
- [x] T133 Run final npm run check and fix all lint and type errors
- [x] T134 Verify no console.log statements remain in code (use logger instead)

**Checkpoint**: Feature complete and polished ✅

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - start immediately ✅
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories ⚠️
- **User Stories (Phases 3-7)**: All depend on Foundational completion
  - Can proceed in parallel with separate developers
  - Or sequentially in priority order: US1 → US4 → US2 → US3 → US5
- **Supporting Features (Phases 8-9)**: Depend on US2 (responsible person assignment)
- **Polish (Phase 10)**: Depends on all desired stories/features complete

### User Story Dependencies

- **US1 (P1)**: After Foundational ✅ No dependencies on other stories
- **US4 (P2)**: After Foundational ✅ No dependencies on other stories (provides navigation structure)
- **US2 (P2)**: After Foundational ✅ No dependencies (assigns responsible persons)
- **US3 (P3)**: After Foundational ✅ Can integrate with US1/US2 but independently testable
- **US5 (P2)**: After US1, US2 (verifies both email and user-based responsible persons work together)

### Within Each User Story

1. API endpoints before UI components (components consume API)
2. Database operations already in Foundational phase
3. Components before pages (pages compose components)
4. Core implementation before integration tests
5. Story validation before moving to next priority

### Parallel Opportunities

**Within Foundational Phase (Phase 2)**:
- All database operation functions marked [P] (T007-T018)
- All permission functions marked [P] (T019-T022)
- Email template [P] with notification function (T023-T024)
- All validation schemas marked [P] (T025-T029)
- All type definitions marked [P] (T030-T035)

**Within User Stories**:
- US1: T041 (API), T043-T044 (components) can run in parallel
- US2: T063, T066 (API endpoints), T068 (component) can run in parallel
- US3: T080, T083 (API endpoints), T085-T088 (table component) can run in parallel
- US4: T053 (API), T055-T056 (pages) can run in parallel

**Across User Stories** (if multiple developers):
- After Foundational complete, US1, US2, US4 can start in parallel
- US3 can start in parallel with others (may integrate but independently testable)

**Polish Phase (Phase 10)**:
- T120-T125 (documentation/German text) can run in parallel
- T126-T127 (logging) can run in parallel

---

## Parallel Example: Foundational Phase

```bash
# Launch all database operations together:
Task: "Create createGroupMember in src/lib/db/group-member-operations.ts"
Task: "Create deleteGroupMember in src/lib/db/group-member-operations.ts"
Task: "Create findGroupMembers in src/lib/db/group-member-operations.ts"
Task: "Add assignResponsibleUser in src/lib/db/group-operations.ts"
# ... all [P] tasks in database operations section

# Launch all permission functions together:
Task: "Create canUserEditGroup in src/lib/groups/permissions.ts"
Task: "Create canUserManageMembers in src/lib/groups/permissions.ts"
Task: "Create canUserLeaveGroup in src/lib/groups/permissions.ts"
Task: "Create getGroupPermissions in src/lib/groups/permissions.ts"

# Launch all type definitions together:
Task: "Add GroupMemberResponse to src/types/api-types.ts"
Task: "Add GroupResponsibleUserResponse to src/types/api-types.ts"
Task: "Add PortalGroupListItem to src/types/api-types.ts"
# ... all type definition tasks
```

---

## Implementation Strategy

### Recommended: MVP First (US1 + Self-Removal)

1. ✅ Complete Phase 1: Setup (database schema)
2. ✅ Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. ✅ Complete Phase 3: User Story 1 (self-join groups)
4. ✅ Complete Phase 9: User Self-Removal (MUST requirement for complete membership flow)
5. 🎯 **STOP and VALIDATE**: Test US1 + self-removal independently using quickstart.md
6. 🚀 Deploy/demo if ready - users can now self-join and leave groups!

**Why this works**: US1 + self-removal delivers immediate value (community self-organization with exit path) and provides a complete membership lifecycle. Email notifications go to email-based responsible persons that already exist.

### Incremental Delivery Path

1. Foundation (Phases 1-2) → Database and APIs ready
2. + US1 + Phase 9 (Self-Removal) → Test independently → 🚀 Deploy (MVP with complete membership lifecycle!)
3. + US4 → Test independently → 🚀 Deploy (full navigation)
4. + US2 → Test independently → 🚀 Deploy (user-based responsible persons)
5. + US3 → Test independently → 🚀 Deploy (member moderation)
6. + US5 → Verify backwards compatibility → 🚀 Deploy (compatibility assured)
7. + Phase 8 (Group Editing) → 🚀 Deploy (complete feature set)
8. Polish (Phase 10) → Final validation → 🚀 Production ready

Each increment adds value without breaking previous functionality.

### Parallel Team Strategy

With multiple developers after Foundational phase completes:

- **Developer A**: User Story 1 (T038-T052)
- **Developer B**: User Story 4 (T053-T062)
- **Developer C**: User Story 2 (T063-T079)
- **Developer D**: User Story 3 (T080-T096)

Stories complete independently, integrate naturally, validate separately.

---

## Estimated Timeline

| Phase | Tasks | Duration | Critical Path |
|-------|-------|----------|---------------|
| Phase 1: Setup | T001-T006 | 30-60 min | ✅ Yes |
| Phase 2: Foundational | T007-T037 | 120-180 min | ✅ Yes (blocks all stories) |
| Phase 3: US1 (Join) | T038-T052 | 180-240 min | ✅ Yes (MVP delivery) |
| Phase 9: Self-removal | T111-T119 | 60-90 min | ✅ Yes (MVP - MUST requirement) |
| Phase 4: US4 | T053-T062 | 150-180 min | Optional (can parallelize) |
| Phase 5: US2 | T063-T079 | 120-150 min | Optional (can parallelize) |
| Phase 6: US3 | T080-T096 | 120-150 min | Optional (can parallelize) |
| Phase 7: US5 | T097-T102 | 60-90 min | Optional (integration) |
| Phase 8: Editing | T103-T110 | 90-120 min | Optional (supporting) |
| Phase 10: Polish | T120-T134 | 90-120 min | Optional (quality) |
| **MVP Total** | T001-T052 + T111-T119 | **6-9 hours** | Critical path |
| **Full Feature** | T001-T134 | **16-22 hours** | All stories |

**Note**: Times assume experienced developer familiar with codebase. Parallel execution can reduce wall-clock time significantly.

---

## Notes

- **[P] marker**: Tasks operating on different files with no dependencies - can run simultaneously
- **[Story] label**: Maps task to user story for traceability (US1, US2, US3, US4, US5)
- **File paths**: Every implementation task includes exact file path
- **Checkpoints**: Stop and validate at each checkpoint - each user story should work independently
- **Manual testing**: Use quickstart.md checklist (no automated tests per Constitution Principle II)
- **Validation**: Run `npm run check` (lint + typecheck) before committing
- **Code organization**: Follow domain-based architecture, all DB ops in `src/lib/db/`, max 500 lines per file

---

## Constitutional Compliance Reminders

When implementing tasks, MUST follow project constitution (`.specify/memory/constitution.md`):

### Code Organization (Principles IX, X, XI)
- ✅ NO file over 500 lines - refactor into modules if approaching limit
- ✅ Domain-based architecture: `groups/` (business logic), `db/` (data access), `email/` (infrastructure)
- ✅ ALL database operations ONLY in `src/lib/db/*-operations.ts` files

### Type Safety (Principles I, XII)
- ✅ Check `src/types/api-types.ts` and `src/types/component-types.ts` FIRST before creating new types
- ✅ NO `any` types - use strict TypeScript with proper interfaces
- ✅ Reuse types from centralized locations

### Validation & Logging (Principles VII, VIII)
- ✅ Server-side validation MANDATORY using Zod from `src/lib/validation/group-schema.ts`
- ✅ Use `logger` from `@/lib/logger.ts` for all server logging
- ✅ NEVER use `console.log` - will fail validation

### User Experience (Principle VI)
- ✅ ALL user-facing text MUST be in German
- ✅ Error messages: "Ungültige Anfrage", "Gruppe nicht gefunden", etc.
- ✅ Success messages: "Erfolgreich der Gruppe beigetreten", etc.

### Code Quality (Principles III, IV, V)
- ✅ Use `@/` imports (never relative imports like `../`)
- ✅ DRY: Reuse existing utilities before creating new ones
- ✅ KISS: Keep solutions simple, avoid over-engineering
- ✅ JSDoc for all functions with parameters and return types documented

### Testing (Principle II)
- ✅ NO automated tests - this project uses manual testing only
- ✅ Use quickstart.md checklist for validation

### Validation Command
```bash
npm run check  # MUST run before committing (lint + typecheck)
```

**NEVER use** `npm run build` or `npm run db:push` solely for validation.

---

## Task Summary

**Total Tasks**: 134
- Setup: 6 tasks
- Foundational: 31 tasks (BLOCKS all user stories)
- User Story 1 (MVP): 15 tasks
- User Story 4: 10 tasks
- User Story 2: 17 tasks
- User Story 3: 17 tasks
- User Story 5: 6 tasks
- Group Editing: 8 tasks
- Self-Removal: 9 tasks
- Polish: 15 tasks

**Parallel Opportunities**: 47 tasks marked [P] across all phases

**Independent Stories**: All 5 user stories independently testable

**MVP Scope**: Phases 1-3 + Phase 9 (61 tasks, 6-9 hours) delivers complete membership lifecycle with join and leave capabilities

**Format Validation**: ✅ All tasks follow strict format: `- [ ] [ID] [P?] [Story?] Description with file path`
