#!/bin/bash

# @raycast.schemaVersion 1
# @raycast.title CSB Kill Session
# @raycast.mode silent
# @raycast.packageName csb
# @raycast.description Kill a Claude Sandbox session
# @raycast.argument1 { "type": "text", "placeholder": "Session ID or name" }

SESSION="$1"
csb kill "$SESSION" && echo "Session $SESSION killed."
