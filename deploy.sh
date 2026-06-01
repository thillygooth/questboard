#!/usr/bin/env bash
set -e

PI="mattrh@192.168.1.34"
IMAGE="ghcr.io/thillygooth/questboard:latest"

echo "==> Waiting for GitHub Actions to build the image..."
echo "    (Ctrl+C to skip the wait and deploy immediately)"

# Record time before polling so we skip any already-completed run
CUTOFF=$(date -u +%s)

for i in $(seq 1 40); do
  STATUS=$(curl -s "https://api.github.com/repos/thillygooth/questboard/actions/runs?per_page=1" \
    | python3 -c "
import sys, json, datetime
runs = json.load(sys.stdin).get('workflow_runs', [])
r = runs[0] if runs else {}
# Skip runs that completed before we started waiting
created = r.get('created_at', '')
ts = int(datetime.datetime.strptime(created, '%Y-%m-%dT%H:%M:%SZ').timestamp()) if created else 0
import os
cutoff = int(os.environ.get('CUTOFF', '0'))
if ts < cutoff - 30:
    print('pending|')
else:
    print(r.get('status','') + '|' + r.get('conclusion',''))
" 2>/dev/null || echo "unknown|")
  WSTATUS="${STATUS%|*}"
  WCONCLUSION="${STATUS#*|}"

  if [ "$WSTATUS" = "completed" ] && [ "$WCONCLUSION" = "success" ]; then
    echo "    Build complete!"
    break
  elif [ "$WSTATUS" = "completed" ] && [ "$WCONCLUSION" != "success" ]; then
    echo "    WARNING: Last build status: $WCONCLUSION — deploying anyway"
    break
  else
    echo "    Build status: $WSTATUS — waiting... ($((i*15))s)"
    sleep 15
  fi
done

echo ""
echo "==> Deploying to Pi ($PI)..."
ssh "$PI" '
  sudo docker pull '"$IMAGE"' &&
  sudo docker stop questboard 2>/dev/null || true
  sudo docker rm questboard 2>/dev/null || true
  sudo docker run -d --restart unless-stopped --name questboard -p 8099:8099 \
    -v /mnt/data/supervisor/questboard/data:/data \
    '"$IMAGE"'
'

echo ""
echo "Done! Questboard is live."
