set -e

PRD_FILE=${1:-"prd-phase-1.json"}

echo "🔁 Running single Ralph iteration with $PRD_FILE..."

claude -p "\
@AGENTS.md @$PRD_FILE @progress.txt \

You are building the FocusUP Clone — a virtual co-working platform \
with Cal.com scheduling, LiveKit video, Express API, and Next.js frontend.

INSTRUCTIONS:
1. Read the PRD file. Identify all items where \"passes\": false.
2. Read progress.txt to understand what has been completed.
3. Choose the SINGLE highest-priority task to work on next. Prioritize:
   a. Architectural decisions and core abstractions
   b. Integration points between modules
   c. Dependencies that other tasks need
   d. Standard features and implementation
   e. Polish, cleanup, and quick wins

4. Explore the codebase to understand current state.

5. Implement the task with SMALL, focused changes.

6. Run ALL feedback loops before committing:
   - cd apps/api && npm run typecheck
   - cd apps/api && npm run test
   - cd apps/api && npm run lint
   - cd apps/web && npm run typecheck
   - cd apps/web && npm run lint
   DO NOT commit if any feedback loop fails. Fix issues first.

7. Make a SINGLE git commit with a conventional commit message:
   feat(scope): description
   fix(scope): description
   Scope should be: auth, sessions, matching, livekit, calcom, dashboard, ui, db

8. Update progress.txt — append:
   - Task completed (reference PRD item ID)
   - Key decisions made
   - Files created/changed
   - Blockers or notes for next iteration

9. Update the PRD file: set \"passes\": true for completed item.

10. If ALL items in the PRD have \"passes\": true, output <promise>COMPLETE</promise>.

ONLY WORK ON A SINGLE TASK PER ITERATION.
Quality over speed. Small steps compound into big progress.
"

echo "✅ Iteration complete. Review the commit and progress.txt."