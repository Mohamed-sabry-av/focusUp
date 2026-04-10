#!/bin/bash
# afk-ralph.sh — Run Ralph in AFK loop
# Usage: ./afk-ralph.sh <prd-file> <max-iterations>

set -e

PRD_FILE=${1:-"prd-phase-1.json"}
MAX_ITER=${2:-20}

echo "🚀 Starting AFK Ralph with $PRD_FILE — max $MAX_ITER iterations"
echo "Started at: $(date)"

for ((i=1; i<=$MAX_ITER; i++)); do
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔁 Iteration $i / $MAX_ITER"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  result=$(claude -p "\
@AGENTS.md @$PRD_FILE @progress.txt \

You are building the FocusUP Clone — a virtual co-working platform \
with Cal.com scheduling, LiveKit video, Express API, and Next.js frontend.

INSTRUCTIONS:
1. Read the PRD file. Identify all items where \"passes\": false.
2. Read progress.txt to understand what has been completed.
3. Choose the SINGLE highest-priority task. Prioritize:
   a. Architectural decisions and core abstractions
   b. Integration points between modules
   c. Dependencies that other tasks need
   d. Standard features
   e. Polish and quick wins

4. Explore the codebase to understand current state.
5. Implement the task with SMALL, focused changes.

6. Run ALL feedback loops before committing:
   - cd apps/api && npm run typecheck
   - cd apps/api && npm run test
   - cd apps/api && npm run lint
   - cd apps/web && npm run typecheck
   - cd apps/web && npm run lint
   DO NOT commit if any feedback loop fails. Fix issues first.

7. Make a SINGLE git commit with conventional commit message.

8. Update progress.txt — append task completed, decisions, files changed.

9. Update the PRD file: set \"passes\": true for completed item.

10. If ALL items have \"passes\": true, output <promise>COMPLETE</promise>.

ONLY WORK ON A SINGLE TASK PER ITERATION.
Quality over speed. Small steps compound into big progress.
")

  echo "$result"

  if [[ "$result" == *"<promise>COMPLETE</promise>"* ]]; then
    echo ""
    echo "🎉 Phase complete at iteration $i!"
    echo "Finished at: $(date)"
    # Uncomment below if you have a notification CLI:
    # notify-send "Ralph Complete" "Phase finished after $i iterations"
    exit 0
  fi
done

echo ""
echo "⚠️  Reached max iterations ($MAX_ITER) without completing all tasks."
echo "Finished at: $(date)"
echo "Review progress.txt and remaining PRD items."