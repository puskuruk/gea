#!/bin/bash
# Block ALL git stash commands. No exceptions.

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | grep -o '"command":"[^"]*"' | head -1 | sed 's/"command":"//;s/"$//')

if echo "$COMMAND" | grep -qE '\bgit\s+stash\b'; then
  echo '{"permission":"deny","user_message":"BLOCKED: git stash is absolutely forbidden in this project.","agent_message":"ERROR: git stash is forbidden. Do NOT attempt git stash in any form. Find another way."}'
  exit 2
fi

exit 0
