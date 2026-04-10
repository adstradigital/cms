import sys

def patch_class_jsx(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    new_lines = []
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # 1. Add academicYearsList state
        if 'const [leaderboard, setLeaderboard] = useState([]);' in line and 'academicYearsList' not in lines[i+1]:
            new_lines.append(line)
            new_lines.append("  const [academicYearsList, setAcademicYearsList] = useState([]);\n")
            i += 1
            continue
            
        # 2. Add loadAcademicYears function
        if 'const loadTeachers = async () => {' in line:
            # find the end of this function
            j = i
            while j < len(lines) and '};' not in lines[j]:
                j += 1
            if j < len(lines):
                # check if loadAcademicYears is already there
                content = "".join(lines[i:j+10])
                if 'loadAcademicYears' not in content:
                    new_lines.extend(lines[i:j+1])
                    new_lines.append("\n")
                    new_lines.append("  const loadAcademicYears = async () => {\n")
                    new_lines.append("    try {\n")
                    new_lines.append("      const res = await adminApi.getAcademicYears();\n")
                    new_lines.append("      const years = Array.isArray(res.data) ? res.data : (res.data?.results || []);\n")
                    new_lines.append("      setAcademicYearsList(years);\n")
                    new_lines.append("      if (academicYear === '2026-27' && years.length > 0) {\n")
                    new_lines.append("        const active = years.find(y => y.is_active);\n")
                    new_lines.append("        if (active) setAcademicYear(active.name);\n")
                    new_lines.append("      }\n")
                    new_lines.append("    } catch (err) {\n")
                    new_lines.append("      console.error('Academic years load failed:', err);\n")
                    new_lines.append("    }\n")
                    new_lines.append("  };\n")
                    i = j + 1
                    continue

        # 3. Update useEffect for dashboard
        if 'if (activeView === \'dashboard\') {' in line:
            new_lines.append(line)
            # check if loadAcademicYears call is already there
            if 'loadAcademicYears()' not in lines[i+4]:
                 new_lines.extend(lines[i+1:i+4])
                 new_lines.append("      loadAcademicYears();\n")
                 i += 4
                 continue

        # 4. Update dropdown options
        if '<option>2025-26</option>' in line:
            indent = line[:line.find('<option>')]
            new_lines.append(f"{indent}{{academicYearsList.length === 0 ? (\n")
            new_lines.append(f"{indent}  <option value=\"2026-27\">2026-27</option>\n")
            new_lines.append(f"{indent}) : (\n")
            new_lines.append(f"{indent}  academicYearsList.map(y => (\n")
            new_lines.append(f"{indent}    <option key={{y.id}} value={{y.name}}>{{y.name}}</option>\n")
            new_lines.append(f"{indent}  ))\n")
            new_lines.append(f"{indent})}}\n")
            # skip the next few options
            while i < len(lines) and '</select>' not in lines[i]:
                i += 1
            continue

        new_lines.append(line)
        i += 1

    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)

if __name__ == "__main__":
    patch_class_jsx(sys.argv[1])
