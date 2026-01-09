#!/usr/bin/env bash
# Smoke test for canvas CLI
# Runs a full workflow: daemon start -> connect -> screenshot -> disconnect -> stop

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CLI="node $PROJECT_ROOT/packages/cli/dist/index.js"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${YELLOW}[INFO]${NC} $1" >&2; }
log_pass() { echo -e "${GREEN}[PASS]${NC} $1" >&2; }
log_fail() { echo -e "${RED}[FAIL]${NC} $1" >&2; }

cleanup() {
  log_info "Cleaning up..."
  $CLI daemon stop 2>/dev/null || true
  rm -rf "$PROJECT_ROOT/.canvas"
}

trap cleanup EXIT

TEST_URL="${TEST_URL:-https://example.com}"
FAILURES=0

# Ensure clean state
cleanup 2>/dev/null || true

log_info "Starting smoke test..."

# Test 1: Build check
log_info "Checking build..."
if [ ! -f "$PROJECT_ROOT/packages/cli/dist/index.js" ]; then
  log_fail "CLI not built. Run: pnpm build"
  exit 1
fi
log_pass "Build exists"

# Test 2: Daemon start
log_info "Starting daemon..."
$CLI daemon start
sleep 1

STATUS=$($CLI daemon status --format json 2>/dev/null)
if echo "$STATUS" | grep -q '"running": true'; then
  log_pass "Daemon started"
else
  log_fail "Daemon failed to start"
  ((FAILURES++))
fi

# Test 3: Daemon ping
log_info "Testing daemon ping..."
PING=$($CLI daemon ping --format json 2>/dev/null)
if echo "$PING" | grep -q '"pong": true'; then
  log_pass "Daemon ping successful"
else
  log_fail "Daemon ping failed"
  ((FAILURES++))
fi

# Test 4: Connect to URL
log_info "Connecting to $TEST_URL..."
CONNECT=$($CLI connect "$TEST_URL" --format json 2>/dev/null)
if echo "$CONNECT" | grep -q '"connected": true'; then
  log_pass "Connected to URL"
else
  log_fail "Failed to connect"
  ((FAILURES++))
fi

# Test 5: Session status
log_info "Checking session status..."
SESSION=$($CLI status --format json 2>/dev/null)
if echo "$SESSION" | grep -q '"connected": true'; then
  log_pass "Session status shows connected"
else
  log_fail "Session status incorrect"
  ((FAILURES++))
fi

# Test 6: Viewport screenshot
log_info "Taking viewport screenshot..."
SCREENSHOT=$($CLI screenshot --format json 2>/dev/null)
SCREENSHOT_PATH=$(echo "$SCREENSHOT" | grep -o '"path": "[^"]*"' | cut -d'"' -f4)
if [ -f "$SCREENSHOT_PATH" ]; then
  FILE_TYPE=$(file -b "$SCREENSHOT_PATH" | head -1)
  if echo "$FILE_TYPE" | grep -qi "PNG"; then
    log_pass "Viewport screenshot saved as PNG"
  else
    log_fail "Screenshot is not PNG: $FILE_TYPE"
    ((FAILURES++))
  fi
else
  log_fail "Screenshot file not found: $SCREENSHOT_PATH"
  ((FAILURES++))
fi

# Test 7: Element screenshot
log_info "Taking element screenshot (h1)..."
ELEMENT_SCREENSHOT=$($CLI screenshot h1 --format json 2>/dev/null)
ELEMENT_PATH=$(echo "$ELEMENT_SCREENSHOT" | grep -o '"path": "[^"]*"' | cut -d'"' -f4)
if [ -f "$ELEMENT_PATH" ]; then
  FILE_TYPE=$(file -b "$ELEMENT_PATH" | head -1)
  if echo "$FILE_TYPE" | grep -qi "PNG"; then
    log_pass "Element screenshot saved as PNG"
  else
    log_fail "Element screenshot is not PNG: $FILE_TYPE"
    ((FAILURES++))
  fi
else
  log_fail "Element screenshot file not found: $ELEMENT_PATH"
  ((FAILURES++))
fi

# Test 8: Disconnect
log_info "Disconnecting..."
DISCONNECT=$($CLI disconnect --format json 2>/dev/null)
if echo "$DISCONNECT" | grep -q '"disconnected": true'; then
  log_pass "Disconnected successfully"
else
  log_fail "Disconnect failed"
  ((FAILURES++))
fi

# Test 9: Verify disconnected state
log_info "Verifying disconnected state..."
SESSION_AFTER=$($CLI status --format json 2>/dev/null)
if echo "$SESSION_AFTER" | grep -q '"connected": false'; then
  log_pass "Session shows disconnected"
else
  log_fail "Session still shows connected after disconnect"
  ((FAILURES++))
fi

# Test 10: Daemon stop
log_info "Stopping daemon..."
$CLI daemon stop
sleep 1

STATUS_AFTER=$($CLI daemon status --format json 2>/dev/null || echo '{"running": false}')
if echo "$STATUS_AFTER" | grep -q '"running": false'; then
  log_pass "Daemon stopped"
else
  log_fail "Daemon did not stop"
  ((FAILURES++))
fi

# Summary
echo ""
if [ $FAILURES -eq 0 ]; then
  log_pass "All smoke tests passed!"
  exit 0
else
  log_fail "$FAILURES test(s) failed"
  exit 1
fi
