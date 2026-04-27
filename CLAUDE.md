# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack school/campus management system (CMS) with a Django REST Framework backend and a Next.js 16 frontend. The system supports multiple portals (Admin, Student, Parent, Staff) with role-based and permission-based access control.

---

## Backend (Django)

### Running the backend

```bash
cd backend
# Activate virtual environment (Windows)
venv\Scripts\activate
# Install dependencies
pip install -r requirements.txt
# Run migrations
python manage.py migrate
# Start dev server
python manage.py runserver
```

The backend runs at `http://localhost:8000`. The database defaults to SQLite (`db.sqlite3`) when `DB_ENGINE` is not set; set it to `django.db.backends.mysql` in `.env` for MySQL.

### Running a single Django test

```bash
cd backend
python manage.py test apps.<app_name>
# e.g.
python manage.py test apps.accounts
```

### Environment variables (`backend/.env`)

| Variable | Purpose |
|---|---|
| `SECRET_KEY` | Django secret key |
| `DEBUG` | `True` / `False` |
| `DB_ENGINE` | `django.db.backends.sqlite3` (default) or `django.db.backends.mysql` |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | MySQL connection |
| `CORS_ALLOWED_ORIGINS` | Comma-separated frontend origin(s) |

### Key management commands

```bash
python manage.py seed_permissions   # Seed Permission/Role data
python manage.py create_admin_user  # Create initial admin user
```

---

## Frontend (Next.js)

### Running the frontend

```bash
cd frontend
npm install
npm run dev      # dev server at http://localhost:3000
npm run build    # production build
npm run lint     # ESLint
```

`NEXT_PUBLIC_API_URL` in `frontend/.env.local` controls the API base URL (default: `http://localhost:8000/api`).

> **Note:** This project uses **Next.js 16** with React 19 and the React Compiler (`babel-plugin-react-compiler`). APIs, conventions, and file structure differ from Next.js 13/14. Read `node_modules/next/dist/docs/` before writing Next.js-specific code.

---

## Architecture

### Backend structure

```
backend/
  core/            # Django project: settings.py, urls.py, wsgi.py
  apps/
    accounts/      # User, School, AcademicYear, Term, Parent models + auth
    permissions/   # Role, Permission, PortalGuardMiddleware
    students/      # Class, Section, Student models
    academics/     # Subjects, SubjectAllocation, Timetable, Assignments, Materials
    attendance/    # Attendance marking and reports
    exams/         # Exam types, marks, results
    fees/          # Fee structures and payments
    staff/         # Staff profiles and management
    hostel/        # Hostel rooms and allocations
    transport/     # Routes, vehicles, tracking
    library/       # Books, issuing, returns
    canteen/       # Inventory, menus, orders
    notifications/ # In-app notifications
    payroll/       # Staff salary and payroll
    expenses/      # School expense tracking
    elections/     # Student council elections
    events/        # School events
    ai_brain/      # AI-driven features and brain games
  common/          # Shared utilities
  scripts/         # One-off data migration/repair scripts
```

Each Django app follows the standard layout: `models.py`, `serializers.py`, `views.py`, `urls.py`, `admin.py`.

### Authentication & authorization (backend)

- **JWT** via `djangorestframework-simplejwt`. Tokens stored in `localStorage` on the frontend.
- **Custom user model** `apps.accounts.User` (extends `AbstractUser`). Users have a `portal` field (`admin` / `student` / `parent`) and a FK to a `Role`.
- **`PortalGuardMiddleware`** (`apps/permissions/middleware.py`) enforces portal isolation — users hitting a wrong portal path receive a `403 Wrong portal` response.
- **Permission codenames** follow the pattern `<module>.<action>` (e.g. `students.view`, `attendance.write`). `User.has_perm_code()` checks individual permissions → role permissions → Class Teacher role permissions.
- Class teachers automatically inherit "Class Teacher" role permissions via `managed_section` (a `OneToOneField` from `Section.class_teacher`).

### Frontend structure

```
frontend/src/
  app/             # Next.js App Router pages
    admins/        # Admin portal pages (protected by layout.js)
    student/       # Student portal pages
    parent/        # Parent portal pages
    staff/         # Staff portal pages
    login/         # Role-specific login pages (admin/student/parent/staff/teacher)
  components/
    Admin/         # Admin-specific components
    Student/       # Student-specific components
    Parent/        # Parent-specific components
    Teacher/       # Teacher-specific components
    layout/        # DashboardLayout, Navbar, Sidebar
    common/        # Shared components
    ui/            # Primitive UI components (Button, Card, Input)
  api/
    instance.js    # Axios instance with JWT attach + 401/403 auto-redirect
    config.js      # API base URL and ENDPOINTS constants
    *Api.js        # Per-domain API modules (authApi, adminApi, studentApi, …)
  context/
    AuthContext.jsx   # Global auth state; reads /accounts/me/ on mount
    SchoolContext.jsx # School config and academic year
    ThemeContext.jsx  # Light/dark + color theme (applied via data-theme / body class)
```

### Routing and auth flow (frontend)

- Each portal section has a `layout.js` that reads `useAuth()` and redirects unauthenticated or wrong-role users to the correct login page.
- `AuthContext` bootstraps from `localStorage` `access_token` → fetches `/api/accounts/me/` → sets `user` state.
- `instance.js` intercepts 401 responses (clears token, redirects to `/login`) and 403 `Wrong portal` responses (same behavior).
- Role-to-route mapping lives in both `AuthContext.jsx` and each portal's `layout.js` — keep them in sync when adding roles.

### Theming

CSS custom properties are used for theming. `ThemeProvider` sets `data-theme` attribute (`light`/`dark`) and adds a `theme-<color>` class to `<body>`. Color themes: `slate` (default), `green`, `blue`, `red`, `purple`, `orange`.

---

## CSS rules — must follow absolutely

### File responsibilities

| File | Role |
|---|---|
| `src/styles/variables.css` | Design tokens only — colors, spacing, typography, shadows, z-index, layout dimensions as CSS custom properties |
| `src/styles/theme.css` | Maps tokens to semantic `--theme-*` variables for light/dark; defines `[data-theme='dark']` and `.theme-*` color overrides |
| `src/styles/utils.css` | Utility/helper classes |
| `src/styles/global.css` | **Entry point.** Imports `variables.css`, `theme.css`, `utils.css` in order, then applies global resets and base element styles. This is the only file imported in `app/layout.js`. |

### Rules

1. **`global.css` is the single CSS entry point.** Never import `variables.css`, `theme.css`, or `utils.css` directly anywhere else — they are already included via `global.css`.

2. **Component styles go in a co-located `.module.css` file** using plain vanilla CSS. You can write any layout, visual design, or component-specific styling you need inside it.

3. **Sizes, fonts, colors, spacing, and all design values must come from the global tokens.** Use `var(--theme-*)` for anything that must respond to light/dark (backgrounds, text, borders). Use `var(--color-*)` for brand colors, `var(--space-*)` for spacing, `var(--text-*)` for font sizes, `var(--font-*)` for weights, `var(--radius-*)`, `var(--shadow-*)`, `var(--transition-*)`. This is what keeps the UI uniform — if a value exists as a token, use the token, not a hardcoded literal.

4. **Never add new CSS custom properties inside a component's `.module.css`.** New tokens belong in `variables.css` (static) or `theme.css` (theme-aware).

5. **Color theme changes work by overriding `--color-primary` only.** The `.theme-green`, `.theme-blue`, etc. classes in `theme.css` only reassign the three `--color-primary*` variables. Component CSS must use `var(--color-primary)` / `var(--color-primary-light)` / `var(--color-primary-dark)` to participate in color theming automatically.

### `app/` vs `components/` separation

6. **`src/app/` is for routing only.** Page files (`page.js`) and layout files (`layout.js`) in `app/` must contain no business logic or significant JSX. They import and render one component from `src/components/` and nothing else.

7. **All UI logic and markup lives in `src/components/`.** Build the feature component in `src/components/<Portal>/<FeatureName>/`, then call it from the corresponding `app/` page. Never build a full page inline inside an `app/` file.

---

## Data model relationships

```
School
  └─ AcademicYear → Term
  └─ User (portal: admin | student | parent)
       └─ Role → Permission[]
       └─ Student → Section → Class
       └─ Parent → Student[]
       └─ UserProfile
```

`SubjectAllocation` links a `User` (teacher) to a `Section` + `Subject` for a given `AcademicYear`. This is the primary mechanism for determining which sections a subject teacher can access.
