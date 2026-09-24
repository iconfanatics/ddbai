import re

with open('frontend/src/pages/agent/AddClientModal.tsx', 'r') as f:
    content = f.read()

# Fix \${ to ${
content = content.replace('\\${', '${')
# Fix \` to `
content = content.replace('\\`', '`')

with open('frontend/src/pages/agent/AddClientModal.tsx', 'w') as f:
    f.write(content)
