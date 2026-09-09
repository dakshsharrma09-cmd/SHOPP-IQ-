import re

for file_path in ['/Users/daksh/Documents/SHOPP IQ OFFICIAL/src/pages/Customers.tsx',
          '/Users/daksh/Documents/SHOPP IQ OFFICIAL/src/pages/Payments.tsx',
          '/Users/daksh/Documents/SHOPP IQ OFFICIAL/src/pages/Expenses.tsx',
          '/Users/daksh/Documents/SHOPP IQ OFFICIAL/src/pages/Loyalty.tsx']:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    content = content.replace('btn-pulse', '')
    content = content.replace('font-stat text-stat-number', 'font-bold')
    content = content.replace('font-stat', 'font-bold')

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

