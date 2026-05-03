#!/bin/bash
echo "Hermes is installed. Run 'hermes --help' to get started."
exec ttyd -p 7681 -W bash
