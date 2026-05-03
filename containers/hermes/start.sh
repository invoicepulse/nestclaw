#!/bin/bash
# Reload shell to get hermes in PATH
source ~/.bashrc 2>/dev/null || source ~/.bash_profile 2>/dev/null || true
echo "Hermes is installed. Run 'hermes setup' to get started."
exec ttyd -p 7681 -W bash
