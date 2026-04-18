filepath = r"d:\PYTHON\CampusManagementSystem\CampusManagement\frontend\src\components\Admin\StudentsAd\PerfomanceAd\ReportCardCreate\ReportCardCreate.jsx"
with open(filepath, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Remove lines 943-1120 (0-indexed: 942-1119)
new_lines = lines[:942] + lines[1120:]

with open(filepath, "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print(f"Removed {1120-942} lines. New total: {len(new_lines)}")
