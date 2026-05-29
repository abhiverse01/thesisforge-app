#!/bin/bash
cd /home/z/my-project
nohup bun run dev > dev.log 2>&1 &
echo $! > /home/z/my-project/.dev-server.pid
echo "Server PID written to .dev-server.pid"
