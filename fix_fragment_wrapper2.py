import os
import sys

filepath = os.path.join(os.path.dirname(__file__), 'frontend', 'src', 'pages', 'admin', 'master', 'StudentAdmission.jsx')

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add opening fragment tag in the ternary
old = (
    '                  ) : (\n'
    '                    <table className="hidden md:table w-full text-sm">'
)

new = (
    '                  ) : (\n'
    '                    <>\n'
    '                    <table className="hidden md:table w-full text-sm">'
)

if old in content:
    content = content.replace(old, new, 1)
    print("OK: Added opening fragment tag")
else:
    print("ERROR: Could not find opening pattern")

# Add closing fragment tag before the closing paren
old_close = (
    '                    </div>\n'
    '                  )}'
)

new_close = (
    '                    </div>\n'
    '                    </>\n'
    '                  )}'
)

# Find first occurrence only (course selection)
idx = content.find(old_close)
if idx != -1:
    content = content[:idx] + new_close + content[idx + len(old_close):]
    print("OK: Added closing fragment tag")
else:
    print("ERROR: Could not find closing pattern")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("DONE: Fragment wrapper applied!")
