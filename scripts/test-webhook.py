#!/usr/bin/env python3
import json, urllib.request, subprocess
data = json.dumps({"type":"subscription.created","data":{"id":"test-sub-999","status":"active","customer":{"id":"cust-999","email":"justingallowayetsy@gmail.com"}}}).encode()
req = urllib.request.Request("http://localhost:2222/api/webhooks/polar", data=data, headers={"Content-Type":"application/json"})
try:
    res = urllib.request.urlopen(req)
    print("SUCCESS:", res.read().decode())
except Exception as e:
    print("WEBHOOK ERROR:", e)
    if hasattr(e, 'read'):
        print("BODY:", e.read().decode())

# Show last 15 lines of BOTH logs
print("\n=== OUT LOGS ===")
subprocess.run(["tail", "-15", "/home/azure/.pm2/logs/nestclaw-api-out.log"])
print("\n=== ERR LOGS ===")
subprocess.run(["tail", "-15", "/home/azure/.pm2/logs/nestclaw-api-error.log"])
