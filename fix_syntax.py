import re

with open('frontend/src/pages/agent/Clients.tsx', 'r') as f:
    content = f.read()

# Fix \${ to ${
content = content.replace('\\${', '${')
# Fix \` to `
content = content.replace('\\`', '`')

with open('frontend/src/pages/agent/Clients.tsx', 'w') as f:
    f.write(content)
