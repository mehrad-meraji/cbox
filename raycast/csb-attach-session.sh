#!/bin/bash

# @raycast.schemaVersion 1
# @raycast.title CSB Attach Session
# @raycast.mode silent
# @raycast.packageName csb
# @raycast.description Attach to a Claude Sandbox session in a new terminal window
# @raycast.argument1 { "type": "text", "placeholder": "Session ID or name" }

SESSION="$1"
TERM_APP=$(python3 -c "
import json, os
cfg = os.path.expanduser('~/.config/csb/config.json')
try:
    with open(cfg) as f:
        data = json.load(f)
    print(data.get('terminalApp', 'Terminal'))
except:
    print('Terminal')
" 2>/dev/null || echo "Terminal")

if [ "$TERM_APP" = "iTerm" ]; then
  osascript -e "tell application \"iTerm\"
    create window with default profile
    tell current session of current window
      write text \"csb attach $SESSION\"
    end tell
  end tell"
else
  osascript -e "tell application \"Terminal\"
    do script \"csb attach $SESSION\"
    activate
  end tell"
fi
