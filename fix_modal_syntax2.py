import re

with open('frontend/src/pages/agent/AddClientModal.tsx', 'r') as f:
    content = f.read()

content = content.replace('\\`', '`')
content = content.replace('\\$', '$')

with open('frontend/src/pages/agent/AddClientModal.tsx', 'w') as f:
    f.write(content)
