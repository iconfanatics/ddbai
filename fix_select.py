import re

with open('frontend/src/components/SearchableSelect.tsx', 'r') as f:
    content = f.read()

content = content.replace('\\`', '`')
content = content.replace('\\$', '$')

with open('frontend/src/components/SearchableSelect.tsx', 'w') as f:
    f.write(content)
