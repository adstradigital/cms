import os

def generate_tree(startpath, exclude_dirs=None):
    if exclude_dirs is None:
        exclude_dirs = {'.git', '__pycache__', 'venv', '.gemini', 'node_modules', '.next'}
    
    result = []
    for root, dirs, files in os.walk(startpath):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        level = root.replace(startpath, '').count(os.sep)
        indent = '│   ' * (level - 1) + '├── ' if level > 0 else ''
        result.append(f'{indent}{os.path.basename(root)}/')
        
        sub_indent = '│   ' * level + '├── '
        for f in files:
            if not f.endswith('.pyc'):
                result.append(f'{sub_indent}{f}')
    return "\n".join(result)

print(generate_tree('backend'))
