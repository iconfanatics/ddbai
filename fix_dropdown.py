import re

files = [
    'frontend/src/pages/agent/Clients.tsx',
    'frontend/src/pages/admin/RoutesConfig.tsx'
]

for file in files:
    with open(file, 'r') as f:
        content = f.read()
    
    # Replace keys
    content = content.replace("c => <option key={c} value={c}>{c}</option>", "(c, i) => <option key={i} value={c}>{c}</option>")
    
    with open(file, 'w') as f:
        f.write(content)
