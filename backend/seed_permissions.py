"""
Seed script for the granular RBAC permission system.
Run:  python seed_permissions.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.permissions.models import Permission, Role
from apps.accounts.models import User

# ─────────────────────────────────────────────────────────────────────
# 1.  PERMISSIONS  — (codename, label, module, description)
# ─────────────────────────────────────────────────────────────────────
PERMISSIONS = [
    # ── Students ───────────────────────────────────────────────────
    ('students.view',          'View Students',           'Students',    'Can see the student list and search students'),
    ('students.add',           'Add Students',            'Students',    'Can register new students into the system'),
    ('students.edit',          'Edit Students',           'Students',    'Can update student details and profiles'),
    ('students.delete',        'Delete Students',         'Students',    'Can remove students from the system'),
    ('students.profile',       'View Student Profile',    'Students',    'Can view full student profile with personal details'),

    # ── Attendance ─────────────────────────────────────────────────
    ('attendance.view',        'View Attendance',         'Attendance',  'Can see attendance records and calendars'),
    ('attendance.mark',        'Mark Attendance',         'Attendance',  'Can mark daily attendance for students'),
    ('attendance.edit',        'Edit Attendance',         'Attendance',  'Can correct or modify past attendance entries'),
    ('attendance.reports',     'View Attendance Reports', 'Attendance',  'Can see attendance summaries and statistics'),

    # ── Marks & Exams ──────────────────────────────────────────────
    ('exams.view',             'View Exams',              'Marks & Exams', 'Can see exam schedules and details'),
    ('exams.create',           'Create Exams',            'Marks & Exams', 'Can create new exam events and schedules'),
    ('exams.edit',             'Edit Exams',              'Marks & Exams', 'Can modify exam details after creation'),
    ('exams.delete',           'Delete Exams',            'Marks & Exams', 'Can remove exams from the system'),
    ('marks.view',             'View Marks',              'Marks & Exams', 'Can see student marks and grade sheets'),
    ('marks.enter',            'Enter Marks',             'Marks & Exams', 'Can enter marks for students in assigned subjects'),
    ('marks.edit',             'Edit Marks',              'Marks & Exams', 'Can modify marks after they have been entered'),
    ('exams.publish',          'Publish Results',         'Marks & Exams', 'Can publish exam results to students and parents'),

    # ── Timetable ──────────────────────────────────────────────────
    ('timetable.view',         'View Timetable',          'Timetable',   'Can see the school timetable and schedules'),
    ('timetable.manage',       'Create & Edit Timetable', 'Timetable',   'Can build and modify the timetable'),

    # ── Fees & Finance ─────────────────────────────────────────────
    ('fees.view',              'View Fees',               'Fees',        'Can see fee structures and student fee status'),
    ('fees.collect',           'Collect Fees',            'Fees',        'Can record fee payments from students'),
    ('fees.structure',         'Create Fee Structure',    'Fees',        'Can define and modify fee categories and amounts'),
    ('fees.reports',           'View Fee Reports',        'Fees',        'Can see financial summaries and fee collection reports'),
    ('fees.defaulters',        'Manage Defaulters',       'Fees',        'Can view and manage fee defaulter lists'),

    # ── Staff & HR ─────────────────────────────────────────────────
    ('staff.view',             'View Staff',              'Staff & HR',  'Can see the staff directory and basic details'),
    ('staff.add',              'Add Staff',               'Staff & HR',  'Can register new staff members'),
    ('staff.edit',             'Edit Staff',              'Staff & HR',  'Can modify staff details and assignments'),
    ('staff.delete',           'Delete Staff',            'Staff & HR',  'Can remove staff members from the system'),
    ('salary.view',            'View Salary',             'Staff & HR',  'Can see salary structures and payslips'),
    ('salary.manage',          'Manage Salary',           'Staff & HR',  'Can create, modify salary structures and process payroll'),

    # ── Report Cards ───────────────────────────────────────────────
    ('reports.view',           'View Report Cards',       'Report Cards', 'Can see generated report cards'),
    ('reports.generate',       'Generate Report Cards',   'Report Cards', 'Can create and print report cards'),

    # ── Elections ──────────────────────────────────────────────────
    ('elections.view',         'View Elections',           'Elections',   'Can see election events and results'),
    ('elections.create',       'Create Elections',         'Elections',   'Can create and configure new elections'),
    ('elections.manage',       'Manage Candidates',        'Elections',   'Can add, edit, or remove election candidates'),

    # ── Notices ────────────────────────────────────────────────────
    ('notices.view',           'View Notices',             'Notices',     'Can see all notices and announcements'),
    ('notices.send',           'Send Class Notices',       'Notices',     'Can send notices to own class/section'),
    ('notices.school_wide',    'Send School-wide Notices', 'Notices',     'Can broadcast notices to the entire school'),

    # ── Academics ──────────────────────────────────────────────────
    ('academics.view',         'View Academics',           'Academics',   'Can see subjects, syllabus, and allocations'),
    ('academics.manage',       'Manage Academics',         'Academics',   'Can create/edit subjects, syllabus, and allocations'),
    ('lessons.view',           'View Lesson Plans',        'Academics',   'Can see lesson plans and teaching materials'),
    ('lessons.manage',         'Manage Lesson Plans',      'Academics',   'Can create and edit lesson plans'),

    # ── Library ────────────────────────────────────────────────────
    ('library.view',           'View Library',             'Library',     'Can browse the book catalogue'),
    ('library.manage',         'Manage Books',             'Library',     'Can add, edit, or remove books from the library'),
    ('library.issue',          'Issue & Return Books',     'Library',     'Can issue and return books to students/staff'),

    # ── Transport ──────────────────────────────────────────────────
    ('transport.view',         'View Transport',           'Transport',   'Can see bus routes and vehicle assignments'),
    ('transport.manage',       'Manage Routes',            'Transport',   'Can create and modify transport routes'),

    # ── Hostel ─────────────────────────────────────────────────────
    ('hostel.view',            'View Hostel',              'Hostel',      'Can see hostel rooms and student allocations'),
    ('hostel.manage',          'Manage Rooms',             'Hostel',      'Can assign rooms and manage hostel settings'),

    # ── School Settings ────────────────────────────────────────────
    ('settings.view',          'View School Settings',     'Settings',    'Can see school configuration and preferences'),
    ('settings.manage',        'Manage School Settings',   'Settings',    'Can modify school settings and academic year config'),
    ('billing.manage',         'Manage Billing',           'Settings',    'Can access payment gateway settings and billing config'),

    # ── Own Profile ────────────────────────────────────────────────
    ('self.attendance',        'View Own Attendance',      'Own Profile', 'Can see personal attendance records'),
    ('self.timetable',         'View Own Timetable',       'Own Profile', 'Can see personal timetable and tasks'),
]


# ─────────────────────────────────────────────────────────────────────
# 2.  ROLES  — (name, is_custom, scope, list of codenames)
# ─────────────────────────────────────────────────────────────────────
ROLES = {
    'Admin': {
        'is_custom': False,
        'is_system': False,
        'scope': 'school',
        'perms': '__ALL__',
    },
    'Principal': {
        'is_custom': False,
        'is_system': False,
        'scope': 'school',
        'perms': '__ALL_EXCEPT__',
        'except': ['billing.manage'],
    },
    'Class Teacher': {
        'is_custom': False,
        'is_system': True,
        'scope': 'class',
        'perms': [
            'students.view', 'students.edit', 'students.profile',
            'attendance.view', 'attendance.mark', 'attendance.edit', 'attendance.reports',
            'marks.view', 'marks.enter', 'marks.edit',
            'timetable.view',
            'fees.view',
            'reports.view', 'reports.generate',
            'elections.view',
            'notices.view', 'notices.send',
            'academics.view', 'lessons.view', 'lessons.manage',
            'library.view',
            'self.attendance', 'self.timetable',
        ],
    },
    'Subject Teacher': {
        'is_custom': False,
        'is_system': False,
        'scope': 'subject',
        'perms': [
            'marks.view', 'marks.enter',
            'timetable.view',
            'academics.view', 'lessons.view', 'lessons.manage',
            'notices.view', 'notices.send',
            'library.view',
            'self.attendance', 'self.timetable',
        ],
    },
    'Accountant': {
        'is_custom': False,
        'is_system': False,
        'scope': 'school',
        'perms': [
            'fees.view', 'fees.collect', 'fees.structure', 'fees.reports', 'fees.defaulters',
            'salary.view', 'salary.manage',
            'self.attendance', 'self.timetable',
        ],
    },
    'Support Staff': {
        'is_custom': False,
        'is_system': False,
        'scope': 'self',
        'perms': [
            'self.attendance', 'self.timetable',
        ],
    },
    'Driver': {
        'is_custom': False,
        'is_system': False,
        'scope': 'self',
        'perms': [
            'transport.view',
            'self.attendance', 'self.timetable',
        ],
    },
    'Warden': {
        'is_custom': False,
        'is_system': False,
        'scope': 'school',
        'perms': [
            'hostel.view', 'hostel.manage',
            'students.view',
            'self.attendance', 'self.timetable',
        ],
    },
}


def seed():
    print("=" * 60)
    print("  SEEDING GRANULAR PERMISSIONS")
    print("=" * 60)

    # ── 1. Create / update permissions ─────────────────────────────
    perm_objs = {}
    for code, label, module, desc in PERMISSIONS:
        obj, created = Permission.objects.update_or_create(
            codename=code,
            defaults={'label': label, 'module': module, 'description': desc}
        )
        perm_objs[code] = obj
        status_txt = "SUCCESS created" if created else "UPDATED updated"
        print(f"  {status_txt}  {code:30s}  [{module}]")

    all_perm_objs = list(perm_objs.values())

    # ── 2. Create / update roles ───────────────────────────────────
    print()
    for name, cfg in ROLES.items():
        role, created = Role.objects.update_or_create(
            name=name,
            defaults={'is_custom': cfg['is_custom'], 'scope': cfg['scope'], 'is_system': cfg.get('is_system', False)}
        )
        if cfg['perms'] == '__ALL__':
            role.permissions.set(all_perm_objs)
        elif cfg['perms'] == '__ALL_EXCEPT__':
            excl = set(cfg.get('except', []))
            role.permissions.set([p for p in all_perm_objs if p.codename not in excl])
        else:
            role.permissions.set([perm_objs[c] for c in cfg['perms'] if c in perm_objs])

        n = role.permissions.count()
        status_txt = "SUCCESS created" if created else "UPDATED updated"
        print(f"  {status_txt}  {name:20s}  [{n} permissions, scope={cfg['scope']}]")

    # ── 3. Assign Admin to superusers ──────────────────────────────
    print()
    admin_role = Role.objects.get(name='Admin')
    for user in User.objects.filter(is_superuser=True):
        user.role = admin_role
        user.portal = User.PORTAL_ADMIN
        user.save()
        print(f"  -> assigned Admin role to superuser: {user.username}")

    print()
    print(f"  Done! {len(PERMISSIONS)} permissions, {len(ROLES)} roles seeded.")
    print("=" * 60)


if __name__ == '__main__':
    seed()
