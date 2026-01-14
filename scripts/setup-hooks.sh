#!/bin/bash
#
# setup-hooks.sh
# Configures Claude Code hooks for GoGoGadgetClaude notifications
#
# This script sets up a Stop hook that notifies you via iMessage
# when Claude Code finishes a task.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔧 GoGoGadgetClaude Hook Setup"
echo "=============================="
echo ""

# Check if Claude Code is installed
if ! command -v claude &> /dev/null; then
    echo -e "${RED}Error: Claude Code CLI not found${NC}"
    echo "Please install Claude Code first: https://docs.anthropic.com/claude-code"
    exit 1
fi

# Get the server URL
read -p "Enter your Tailscale hostname (e.g., your-macbook.tailnet.ts.net): " TAILSCALE_HOST

if [ -z "$TAILSCALE_HOST" ]; then
    echo -e "${YELLOW}No hostname provided. Using localhost for local-only notifications.${NC}"
    TAILSCALE_HOST="localhost"
fi

SERVER_URL="http://${TAILSCALE_HOST}:3456"

# Create the hooks directory if it doesn't exist
CLAUDE_CONFIG_DIR="$HOME/.claude"
HOOKS_DIR="$CLAUDE_CONFIG_DIR/hooks"
mkdir -p "$HOOKS_DIR"

# Create the stop hook script
STOP_HOOK="$HOOKS_DIR/on-task-complete.sh"

cat > "$STOP_HOOK" << EOF
#!/bin/bash
# GoGoGadgetClaude notification hook
# Triggered when Claude Code completes a task

# Notify the GoGoGadgetClaude server
curl -s -X POST "${SERVER_URL}/api/hooks/task-complete" \
    -H "Content-Type: application/json" \
    -d '{"event": "stop", "timestamp": "'\$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"}' \
    > /dev/null 2>&1 || true

# Exit cleanly (don't block Claude)
exit 0
EOF

chmod +x "$STOP_HOOK"

echo -e "${GREEN}✓ Created hook script: $STOP_HOOK${NC}"

# Check if Claude settings.json exists
SETTINGS_FILE="$CLAUDE_CONFIG_DIR/settings.json"

if [ -f "$SETTINGS_FILE" ]; then
    echo ""
    echo -e "${YELLOW}Found existing Claude settings at: $SETTINGS_FILE${NC}"
    echo ""
    echo "To enable notifications, add this to your settings.json hooks section:"
    echo ""
    echo '  "hooks": {'
    echo '    "Stop": ["'$STOP_HOOK'"]'
    echo '  }'
    echo ""
    echo -e "${YELLOW}Note: You may need to merge this with existing hooks.${NC}"
else
    # Create a new settings file with hooks
    cat > "$SETTINGS_FILE" << EOF
{
  "hooks": {
    "Stop": ["$STOP_HOOK"]
  }
}
EOF
    echo -e "${GREEN}✓ Created Claude settings with hooks: $SETTINGS_FILE${NC}"
fi

echo ""
echo "=============================="
echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Start the GoGoGadgetClaude server: pnpm dev"
echo "2. Configure your notification phone number in the app Settings"
echo "3. Run Claude Code on a project and wait for it to finish"
echo "4. You should receive an iMessage notification!"
echo ""

