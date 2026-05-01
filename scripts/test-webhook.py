#!/usr/bin/env python3
import json, urllib.request
data = json.dumps({"type":"subscription.created","data":{"id":"test-sub-123","status":"active","customer":{"id":"cust-123","email":"justingallowayetsy@gmail.com"}}}).encode()
req = urllib.request.Request("http://localhost:2222/api/webhooks/polar", data=data, headers={"Content-Type":"application/json"})
try:
    res = urllib.request.urlopen(req)
    print("SUCCESS:", res.read().decode())
except Exception as e:
    print("ERROR:", e)
    if hasattr(e, 'read'):
        print("BODY:", e.read().decode())
