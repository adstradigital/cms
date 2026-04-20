content = open(r'C:\cms\frontend\src\components\Admin\Canteen\CanteenModule.jsx', 'r', encoding='utf-8').read()

def count_balance(opener, closer, text):
    balance = 0
    for char in text:
        if char == opener:
            balance += 1
        elif char == closer:
            balance -= 1
    return balance

print(f"Braces {{}}: {count_balance('{', '}', content)}")
print(f"Parentheses (): {count_balance('(', ')', content)}")
print(f"Brackets []: {count_balance('[', ']', content)}")

# Check for unclosed tags
import re
tags = re.findall(r'<([a-zA-Z0-9]+)', content)
closing_tags = re.findall(r'</([a-zA-Z0-9]+)>', content)
print(f"Opening tags count: {len(tags)}")
print(f"Closing tags count: {len(closing_tags)}")

# Find unclosed Modal specifically
modal_opens = len(re.findall(r'<Modal', content))
modal_closes = len(re.findall(r'</Modal>', content))
print(f"Modal balance: {modal_opens - modal_closes}")
