import re

with open('/Users/daksh/Documents/SHOPP IQ OFFICIAL/src/pages/Loyalty.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('stat-card border-none', 'p-5 rounded-lg border-none')
content = content.replace('stat-card', 'p-5 rounded-lg')

with open('/Users/daksh/Documents/SHOPP IQ OFFICIAL/src/pages/Loyalty.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

