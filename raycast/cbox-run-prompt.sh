#!/bin/bash

# @raycast.schemaVersion 1
# @raycast.title CSB Run Prompt
# @raycast.mode fullOutput
# @raycast.packageName cbox
# @raycast.description Run a one-shot Claude Code prompt and show output
# @raycast.argument1 { "type": "text", "placeholder": "Your prompt" }

PROMPT="$1"
RESULT=$(cbox run -j "$PROMPT" 2>&1)
echo "$RESULT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if data.get('error'):
        print('Error:', data['error'])
    else:
        print(data.get('output', ''))
except:
    print(sys.stdin.read())
"
