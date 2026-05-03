import requests
r = requests.post('http://localhost:2222/api/webhooks/polar', json={
    'type': 'subscription.created',
    'data': {
        'id': 'sub_hermes_test',
        'customer_id': 'cust_test_hermes',
        'product_id': 'prod_nestclaw',
        'status': 'active',
        'customer': {'email': 'hermes-test@nestclaw.io'},
        'product': {'name': 'NestClaw Hermes'},
        'metadata': {'agent_type': 'hermes'}
    }
}, timeout=30)
print(f'Status: {r.status_code}')
print(f'Response: {r.json()}')
