#!/bin/bash
# container-monitor.sh — Runs every 5 minutes via cron
# Pauses/stops containers that are truly idle (no connections AND low CPU)
# Resumes containers when users connect via Caddy

INACTIVITY_THRESHOLD_MINUTES=${1:-30}
CPU_THRESHOLD="1.0"  # Below 1% CPU = idle (no cron jobs running)
LOG_FILE="/opt/nestclaw/data/monitor.log"

log() {
  echo "{\"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\", \"level\": \"$1\", \"message\": \"$2\", \"container\": \"$3\"}" >> "$LOG_FILE"
}

# Get all running nestclaw containers
for container in $(docker ps --filter "label=nestclaw.subdomain" --format "{{.Names}}"); do
  subdomain=$(docker inspect --format '{{index .Config.Labels "nestclaw.subdomain"}}' "$container" 2>/dev/null)
  
  if [ -z "$subdomain" ]; then
    continue
  fi

  # Get container's mapped terminal port
  terminal_port=$(docker port "$container" 7681 2>/dev/null | grep -oP '\d+$')
  
  if [ -z "$terminal_port" ]; then
    continue
  fi

  # Check 1: Are there active WebSocket connections to ttyd?
  ws_connections=$(ss -tnp | grep -c ":${terminal_port} " 2>/dev/null || echo "0")

  # Check 2: What's the container's CPU usage?
  cpu_usage=$(docker stats --no-stream --format "{{.CPUPerc}}" "$container" 2>/dev/null | tr -d '%')
  cpu_usage=${cpu_usage:-0}

  # Check 3: How long since last activity? (tracked via a timestamp file)
  activity_file="/opt/nestclaw/data/${subdomain}/.last_activity"
  
  if [ "$ws_connections" -gt 0 ] || [ "$(echo "$cpu_usage > $CPU_THRESHOLD" | bc -l 2>/dev/null || echo 0)" -eq 1 ]; then
    # Container is active — update timestamp
    date +%s > "$activity_file"
    continue
  fi

  # Container appears idle — check how long
  if [ -f "$activity_file" ]; then
    last_active=$(cat "$activity_file")
  else
    # No activity file = just provisioned, give it time
    date +%s > "$activity_file"
    continue
  fi

  now=$(date +%s)
  idle_seconds=$((now - last_active))
  idle_minutes=$((idle_seconds / 60))

  if [ "$idle_minutes" -ge "$INACTIVITY_THRESHOLD_MINUTES" ]; then
    log "info" "Stopping idle container (idle ${idle_minutes}m, cpu ${cpu_usage}%, ws ${ws_connections})" "$container"
    docker stop "$container" 2>/dev/null
  fi
done
