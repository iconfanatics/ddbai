import re

with open('prisma/schema.prisma', 'r') as f:
    content = f.read()

if "mediaData       Json?" not in content:
    content = content.replace("score           Float?", "score           Float?\n  mediaData       Json?")

with open('prisma/schema.prisma', 'w') as f:
    f.write(content)
