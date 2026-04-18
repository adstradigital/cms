filepath = r"d:\PYTHON\CampusManagementSystem\CampusManagement\backend\apps\exams\views.py"
with open(filepath, "r") as f:
    content = f.read()

content = content.replace('\\\\"error\\\\"', '"error"')

with open(filepath, "w") as f:
    f.write(content)

print("Fixed escaped quotes in views.py")
