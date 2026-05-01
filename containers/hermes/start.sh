#!/bin/bash
ttyd -p 7681 -W bash &
python -m hermes_webui --port 5000 --host 0.0.0.0 2>/dev/null &
wait -n
