#!/usr/bin/env python
"""
═══════════════════════════════════════════════════════════════════════════════
  COMPREHENSIVE AI-BRAIN TEST DATA SEEDER
  Populates ALL 16 modules with realistic, fully-connected data.
═══════════════════════════════════════════════════════════════════════════════
  Run:  python seed_ai_brain_data.py
═══════════════════════════════════════════════════════════════════════════════
"""

import os, sys, random
from datetime import date, time, timedelta, datetime
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

import django
django.setup()

from django.contrib.auth.hashers import make_password
from django.utils import timezone

# ── Import ALL models ────────────────────────────────────────────────────────
from apps.accounts.models import School, AcademicYear, User, UserProfile, Parent
from apps.permissions.models import Permission, Role
from apps.students.models import Class, Section, Student, AdmissionInquiry
from apps.staff.models import Staff, TeacherDetail, StaffAttendance, StaffLeaveRequest, StaffTask, ParentFeedback, TeacherLeaderboardSnapshot
from apps.academics.models import (
    Subject, SyllabusUnit, SyllabusChapter, SyllabusTopic,
    SubjectAllocation, LessonPlan, Timetable, Period,
    Homework, HomeworkSubmission, Assignment, Material, CourseSession
)
from apps.attendance.models import Attendance, LeaveRequest, AttendanceWarning
from apps.exams.models import Exam, ExamSchedule, HallTicket, ExamResult, ReportCard
from apps.fees.models import FeeCategory, FeeStructure, FeePayment
from apps.hostel.models import (
    Hostel, Floor, Room, RoomAllotment, NightAttendance,
    HostelFee, MessMenuPlan, MessDietProfile, MessFeedback,
    MessInventoryItem, MessVendor, MessVendorSupply,
    VisitorLog, EntryExitLog, RuleViolation
)
from apps.canteen.models import (
    FoodCategory, FoodItem, CanteenIngredient, CanteenDish, DailyMenu,
    CanteenComplaint, CanteenSupplier, CanteenInventoryItem,
    CanteenInventoryLog, CanteenWastageLog, CanteenConsumptionLog,
    CanteenCombo, CanteenOrder
)
from apps.transport.models import TransportRoute, RouteStop, StudentTransport
from apps.events.models import Event, EventSubTask, Club, ClubActivity
from apps.library.models import Book, BookIssue
from apps.notifications.models import Notification
from apps.elections.models import Election, Candidate, Vote
from apps.ai_brain.models import AIBrainDraft, AIBrainAuditLog

print("═" * 70)
print("  🧠 COMPREHENSIVE AI-BRAIN TEST DATA SEEDER")
print("═" * 70)

PASSWORD = make_password("Test@1234")

# ── Helpers ──────────────────────────────────────────────────────────────────
FIRST_NAMES_M = [
    "Aarav", "Vihaan", "Aditya", "Sai", "Arjun", "Reyansh", "Krishna",
    "Ishaan", "Shaurya", "Atharva", "Advait", "Vivaan", "Dhruv", "Kabir",
    "Ansh", "Ritvik", "Arnav", "Rudra", "Kartik", "Nikhil", "Rohan",
    "Dev", "Mihir", "Parth", "Yash", "Ayaan", "Kian", "Jai", "Om", "Raghav"
]
FIRST_NAMES_F = [
    "Ananya", "Diya", "Aanya", "Aadhya", "Aaradhya", "Saanvi", "Myra",
    "Pari", "Anika", "Navya", "Isha", "Sara", "Kiara", "Riya", "Prisha",
    "Avni", "Tanvi", "Meera", "Nandini", "Pooja", "Kavya", "Divya",
    "Sneha", "Aditi", "Neha", "Shreya", "Lakshmi", "Tara", "Siya", "Jiya"
]
LAST_NAMES = [
    "Sharma", "Patel", "Nair", "Kumar", "Menon", "Gupta", "Reddy",
    "Singh", "Iyer", "Pillai", "Joshi", "Verma", "Das", "Rao",
    "Mishra", "Chauhan", "Bhat", "Shetty", "Thomas", "Mathew"
]
BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

SUBJECT_MAP = {
    "English":      {"code": "ENG", "periods": 6, "color": "#3b82f6"},
    "Hindi":        {"code": "HIN", "periods": 5, "color": "#8b5cf6"},
    "Mathematics":  {"code": "MAT", "periods": 7, "color": "#ef4444"},
    "Science":      {"code": "SCI", "periods": 6, "color": "#10b981"},
    "Social Studies":{"code": "SST", "periods": 5, "color": "#f59e0b"},
    "Computer Sc.": {"code": "CSC", "periods": 3, "color": "#6366f1"},
    "Physical Ed.": {"code": "PHE", "periods": 2, "color": "#ec4899"},
    "Art & Craft":  {"code": "ART", "periods": 2, "color": "#14b8a6"},
    "Music":        {"code": "MUS", "periods": 1, "color": "#a855f7"},
    "Moral Science":{"code": "MOR", "periods": 1, "color": "#78716c"},
}

def rand_phone():
    return f"+91 {random.randint(70000,99999)}{random.randint(10000,99999)}"

def rand_date(start, end):
    delta = (end - start).days
    return start + timedelta(days=random.randint(0, delta))

counter = {"user": 0}
def make_user(first, last, portal, school, role=None, is_staff_flag=False):
    counter["user"] += 1
    uname = f"{first.lower()}.{last.lower()}{counter['user']}"
    u = User.objects.create(
        username=uname, password=PASSWORD,
        first_name=first, last_name=last,
        email=f"{uname}@cms.edu.in",
        portal=portal, school=school, role=role,
        is_staff=is_staff_flag, is_verified=True,
    )
    return u


# ═════════════════════════════════════════════════════════════════════════════
#  PHASE 1: FOUNDATIONAL ARCHITECTURE
# ═════════════════════════════════════════════════════════════════════════════
print("\n🏫 Phase 1: School, Academic Years, Roles & Admin …")

school = School.objects.create(
    name="CMS Education Academy",
    tagline="Igniting Minds, Shaping Futures",
    address="123 Knowledge Lane, Kochi, Kerala, India - 682024",
    phone="+91 484 2345678", email="admin@cms.edu.in",
    website="https://cms.edu.in",
    primary_color="#0F172A", secondary_color="#4F46E5",
)

ay_prev = AcademicYear.objects.create(
    school=school, name="2024-25",
    start_date=date(2024, 6, 1), end_date=date(2025, 3, 31), is_active=False,
)
ay_curr = AcademicYear.objects.create(
    school=school, name="2025-26",
    start_date=date(2025, 6, 1), end_date=date(2026, 3, 31), is_active=True,
)

# ── Roles & Permissions ─────────────────────────────────────────────────────
PERM_DEFS = [
    ("students.view",   "View Students",        "Students"),
    ("students.write",  "Add/Edit Students",     "Students"),
    ("students.delete", "Delete Students",       "Students"),
    ("attendance.view", "View Attendance",       "Attendance"),
    ("attendance.write","Mark Attendance",       "Attendance"),
    ("exams.view",      "View Exams",            "Exams"),
    ("exams.write",     "Manage Exams",          "Exams"),
    ("exams.marks",     "Enter Marks",           "Exams"),
    ("fees.view",       "View Fees",             "Fees"),
    ("fees.write",      "Collect Fees",          "Fees"),
    ("timetable.view",  "View Timetable",        "Timetable"),
    ("timetable.write", "Manage Timetable",      "Timetable"),
    ("reports.view",    "View Reports",          "Reports"),
    ("reports.export",  "Export Reports",        "Reports"),
    ("staff.view",      "View Staff",            "Staff"),
    ("staff.write",     "Manage Staff",          "Staff"),
    ("hostel.view",     "View Hostel",           "Hostel"),
    ("hostel.write",    "Manage Hostel",         "Hostel"),
    ("transport.view",  "View Transport",        "Transport"),
    ("transport.write", "Manage Transport",      "Transport"),
    ("library.view",    "View Library",          "Library"),
    ("library.write",   "Manage Library",        "Library"),
    ("canteen.view",    "View Canteen",          "Canteen"),
    ("canteen.write",   "Manage Canteen",        "Canteen"),
    ("events.view",     "View Events",           "Events"),
    ("events.write",    "Manage Events",         "Events"),
    ("notifications.view","View Notifications",  "Notifications"),
    ("notifications.write","Send Notifications", "Notifications"),
    ("elections.view",  "View Elections",         "Elections"),
    ("elections.write", "Manage Elections",       "Elections"),
    ("settings.view",   "View Settings",         "Settings"),
    ("settings.write",  "Manage Settings",       "Settings"),
    ("ai_brain.view",   "View AI Brain",         "AI Brain"),
    ("ai_brain.write",  "Use AI Brain",          "AI Brain"),
]
perm_objs = {}
for code, label, module in PERM_DEFS:
    p, _ = Permission.objects.get_or_create(codename=code, defaults={"label": label, "module": module})
    perm_objs[code] = p

role_admin = Role.objects.create(name="Admin", scope="school")
role_admin.permissions.set(perm_objs.values())

role_teacher = Role.objects.create(name="Teacher", scope="subject")
teacher_perms = [p for c, p in perm_objs.items() if c.split(".")[0] in
    ("students", "attendance", "exams", "timetable", "reports", "library", "events", "notifications")]
role_teacher.permissions.set(teacher_perms)

role_ct = Role.objects.create(name="Class Teacher", is_system=True, scope="class")
role_ct.permissions.set(teacher_perms)

role_accountant = Role.objects.create(name="Accountant", scope="school")
acct_perms = [perm_objs[c] for c in ("fees.view", "fees.write", "reports.view", "reports.export")]
role_accountant.permissions.set(acct_perms)

role_librarian = Role.objects.create(name="Librarian", scope="school")
role_librarian.permissions.set([perm_objs["library.view"], perm_objs["library.write"]])

# ── Admin Users ──────────────────────────────────────────────────────────────
admin_user = User.objects.create_superuser(
    username="admin", password="Admin@1234",
    first_name="Super", last_name="Admin",
    email="superadmin@cms.edu.in", school=school,
)
admin_user.role = role_admin
admin_user.portal = "admin"
admin_user.save()

principal = make_user("Priya", "Menon", "admin", school, role_admin, is_staff_flag=True)
vice_principal = make_user("Rajesh", "Nair", "admin", school, role_admin, is_staff_flag=True)

print(f"  ✅ School: {school.name}")
print(f"  ✅ Academic Years: {ay_prev.name}, {ay_curr.name}")
print(f"  ✅ Roles: {Role.objects.count()} | Permissions: {Permission.objects.count()}")
print(f"  ✅ Admin Login → username: admin / password: Admin@1234")


# ═════════════════════════════════════════════════════════════════════════════
#  PHASE 2: ACADEMIC HIERARCHY
# ═════════════════════════════════════════════════════════════════════════════
print("\n📚 Phase 2: Classes, Sections, Subjects, Syllabus …")

classes = {}
sections = {}
GRADE_NAMES = [f"Grade {i}" for i in range(1, 13)]

for gname in GRADE_NAMES:
    cls = Class.objects.create(school=school, name=gname, code=gname.replace(" ", "").upper())
    classes[gname] = cls
    for sec_name in ["A", "B"]:
        sec = Section.objects.create(
            school_class=cls, name=sec_name,
            room_number=f"R{cls.id}{sec_name}", capacity=40,
        )
        sections[(gname, sec_name)] = sec

# ── Subjects ─────────────────────────────────────────────────────────────────
subjects = {}
for sname, sdata in SUBJECT_MAP.items():
    for gname, cls_obj in classes.items():
        code = f"{sdata['code']}{cls_obj.id}"
        sub = Subject.objects.create(
            school=school, school_class=cls_obj, name=sname,
            code=code, weekly_periods=sdata["periods"], color_code=sdata["color"],
        )
        subjects[(sname, gname)] = sub

# ── Syllabus (for Math and Science in Grade 10) ─────────────────────────────
for sub_name in ["Mathematics", "Science"]:
    sub = subjects[(sub_name, "Grade 10")]
    for u in range(1, 6):
        unit = SyllabusUnit.objects.create(subject=sub, title=f"{sub_name} Unit {u}", order=u)
        for c in range(1, 4):
            chap = SyllabusChapter.objects.create(unit=unit, title=f"Chapter {u}.{c}", order=c)
            for t in range(1, 4):
                SyllabusTopic.objects.create(chapter=chap, title=f"Topic {u}.{c}.{t}", order=t)

print(f"  ✅ Classes: {Class.objects.count()} | Sections: {Section.objects.count()}")
print(f"  ✅ Subjects: {Subject.objects.count()} (per-class)")
print(f"  ✅ Syllabus: {SyllabusUnit.objects.count()} units, {SyllabusChapter.objects.count()} chapters, {SyllabusTopic.objects.count()} topics")


# ═════════════════════════════════════════════════════════════════════════════
#  PHASE 3: STAFF & TEACHERS
# ═════════════════════════════════════════════════════════════════════════════
print("\n👨‍🏫 Phase 3: Staff, Teachers, Subject Allocations …")

staff_list = []
teacher_users = []  # subset who are teaching staff

DESIGNATIONS = ["Senior Teacher", "Junior Teacher", "Lab Assistant", "PET", "Librarian",
                 "Counselor", "Office Clerk", "Accountant"]

for i in range(60):
    is_male = i % 2 == 0
    fname = random.choice(FIRST_NAMES_M if is_male else FIRST_NAMES_F)
    lname = random.choice(LAST_NAMES)
    is_teaching = i < 48  # first 48 are teaching staff
    role = role_teacher if is_teaching else (role_accountant if i == 48 else role_librarian if i == 49 else None)
    u = make_user(fname, lname, "admin", school, role, is_staff_flag=True)
    UserProfile.objects.create(
        user=u, gender="male" if is_male else "female",
        date_of_birth=rand_date(date(1975, 1, 1), date(1998, 12, 31)),
        blood_group=random.choice(BLOOD_GROUPS),
        address=f"{random.randint(1,200)}, Teacher Colony, Kochi",
        emergency_contact_name=random.choice(FIRST_NAMES_M) + " " + lname,
        emergency_contact_phone=rand_phone(),
    )
    emp_id = Staff.generate_next_id("STF")
    designation = "Senior Teacher" if is_teaching and i < 24 else \
                  "Junior Teacher" if is_teaching else random.choice(DESIGNATIONS[2:])
    staff_obj = Staff.objects.create(
        user=u, employee_id=emp_id, designation=designation,
        joining_date=rand_date(date(2018, 6, 1), date(2024, 6, 1)),
        qualification="M.Ed" if is_teaching else "B.A",
        experience_years=Decimal(str(random.randint(2, 20))),
        is_teaching_staff=is_teaching, status="active",
    )
    staff_list.append(staff_obj)
    if is_teaching:
        teacher_users.append(u)
        specialization = random.choice(list(SUBJECT_MAP.keys()))
        td = TeacherDetail.objects.create(staff=staff_obj, specialization=specialization, bio=f"Expert in {specialization}")
        # Link teaching subjects
        for gname in random.sample(GRADE_NAMES, min(4, len(GRADE_NAMES))):
            key = (specialization, gname)
            if key in subjects:
                td.teaching_subjects.add(subjects[key])

# ── Assign Class Teachers ────────────────────────────────────────────────────
teacher_idx = 0
for key, sec in sections.items():
    if teacher_idx < len(teacher_users):
        sec.class_teacher = teacher_users[teacher_idx]
        sec.save()
        teacher_idx += 1

# ── Subject Allocations ──────────────────────────────────────────────────────
alloc_count = 0
for gname, cls_obj in classes.items():
    for sec_name in ["A", "B"]:
        sec = sections[(gname, sec_name)]
        for sname in SUBJECT_MAP.keys():
            sub = subjects.get((sname, gname))
            if not sub:
                continue
            alloc = SubjectAllocation.objects.create(
                subject=sub, section=sec, academic_year=ay_curr,
            )
            # Assign 1-2 teachers
            assigned = random.sample(teacher_users, min(2, len(teacher_users)))
            alloc.teachers.set(assigned[:random.randint(1, 2)])
            alloc_count += 1

print(f"  ✅ Staff: {Staff.objects.count()} ({len(teacher_users)} teaching)")
print(f"  ✅ Teacher Details: {TeacherDetail.objects.count()}")
print(f"  ✅ Subject Allocations: {alloc_count}")


# ═════════════════════════════════════════════════════════════════════════════
#  PHASE 4: STUDENTS & PARENTS
# ═════════════════════════════════════════════════════════════════════════════
print("\n🎓 Phase 4: Students, Parents, User Profiles …")

all_students = []
all_parent_users = []

for gname, cls_obj in classes.items():
    grade_num = int(gname.split()[-1])
    for sec_name in ["A", "B"]:
        sec = sections[(gname, sec_name)]
        num_students = random.randint(28, 38)
        for s in range(num_students):
            is_male = s % 2 == 0
            fname = random.choice(FIRST_NAMES_M if is_male else FIRST_NAMES_F)
            lname = random.choice(LAST_NAMES)

            stu_user = make_user(fname, lname, "student", school)
            dob = rand_date(date(2026 - grade_num - 6, 1, 1), date(2026 - grade_num - 5, 12, 31))
            UserProfile.objects.create(
                user=stu_user, gender="male" if is_male else "female",
                date_of_birth=dob, blood_group=random.choice(BLOOD_GROUPS),
                address=f"{random.randint(1,500)}, Student Nagar, Kochi",
                father_name=random.choice(FIRST_NAMES_M) + " " + lname,
                father_occupation=random.choice(["Engineer", "Doctor", "Teacher", "Business", "Govt. Employee"]),
                mother_name=random.choice(FIRST_NAMES_F) + " " + lname,
                mother_occupation=random.choice(["Teacher", "Doctor", "Homemaker", "Nurse", "Lawyer"]),
                parent_phone=rand_phone(),
                parent_email=f"parent.{fname.lower()}{random.randint(1,999)}@gmail.com",
            )

            adm_num = f"CMS{ay_curr.name[:4]}{cls_obj.id:02d}{sec_name}{s+1:03d}"
            hostel_resident = grade_num >= 6 and random.random() < 0.3
            transport_user = not hostel_resident and random.random() < 0.4
            student = Student.objects.create(
                user=stu_user, admission_number=adm_num,
                roll_number=str(s + 1),
                academic_year=ay_curr, section=sec,
                admission_date=rand_date(date(2023, 4, 1), date(2025, 6, 15)),
                hostel_resident=hostel_resident, transport_user=transport_user,
                is_active=True,
            )
            all_students.append(student)

            # Create a Parent for every 2nd student
            if s % 2 == 0:
                p_user = make_user(random.choice(FIRST_NAMES_M), lname, "parent", school)
                parent = Parent.objects.create(user=p_user, occupation="Business", annual_income=Decimal(str(random.randint(300000, 2500000))))
                parent.students.add(student)
                all_parent_users.append(p_user)

print(f"  ✅ Students: {Student.objects.count()}")
print(f"  ✅ Parents: {Parent.objects.count()}")
print(f"  ✅ User Profiles: {UserProfile.objects.count()}")


# ═════════════════════════════════════════════════════════════════════════════
#  PHASE 5: TIMETABLE, EXAMS, ATTENDANCE
# ═════════════════════════════════════════════════════════════════════════════
print("\n📅 Phase 5: Timetables, Exams, Results, Attendance …")

# ── Timetable ────────────────────────────────────────────────────────────────
PERIOD_TIMES = [
    (time(8, 30), time(9, 15)),   # P1
    (time(9, 15), time(10, 0)),   # P2
    (time(10, 0), time(10, 45)),  # P3
    (time(10, 45), time(11, 0)),  # BREAK
    (time(11, 0), time(11, 45)),  # P4
    (time(11, 45), time(12, 30)), # P5
    (time(12, 30), time(13, 15)), # LUNCH
    (time(13, 15), time(14, 0)),  # P6
    (time(14, 0), time(14, 45)),  # P7
]
PERIOD_TYPES = ["class", "class", "class", "break", "class", "class", "lunch", "class", "class"]

tt_count = 0
for gname, cls_obj in classes.items():
    sub_list = [subjects[(sn, gname)] for sn in SUBJECT_MAP.keys() if (sn, gname) in subjects]
    for sec_name in ["A", "B"]:
        sec = sections[(gname, sec_name)]
        for day in range(1, 7):  # Mon-Sat
            tt = Timetable.objects.create(
                section=sec, academic_year=ay_curr, day_of_week=day, is_published=True,
            )
            for p_num, (st, et) in enumerate(PERIOD_TIMES, start=1):
                ptype = PERIOD_TYPES[p_num - 1]
                sub = None
                teacher = None
                if ptype == "class":
                    sub = random.choice(sub_list)
                    teacher = random.choice(teacher_users)
                Period.objects.create(
                    timetable=tt, period_number=p_num,
                    period_type=ptype, subject=sub, teacher=teacher,
                    start_time=st, end_time=et,
                )
            tt_count += 1

print(f"  ✅ Timetables: {tt_count} | Periods: {Period.objects.count()}")

# ── Exams ────────────────────────────────────────────────────────────────────
all_exams = []
for gname, cls_obj in classes.items():
    for exam_type, exam_name, sd, ed in [
        ("unit_test",  f"Unit Test 1 - {gname}",  date(2025, 8, 10), date(2025, 8, 15)),
        ("mid_term",   f"Mid Term - {gname}",      date(2025, 10, 1), date(2025, 10, 10)),
        ("quarterly",  f"Quarterly - {gname}",     date(2025, 12, 5), date(2025, 12, 15)),
    ]:
        exam = Exam.objects.create(
            academic_year=ay_curr, school_class=cls_obj,
            name=exam_name, exam_type=exam_type,
            start_date=sd, end_date=ed, is_published=True,
        )
        all_exams.append(exam)
        # Schedules for each subject
        exam_date = sd
        for sname in list(SUBJECT_MAP.keys())[:6]:
            sub = subjects.get((sname, gname))
            if not sub:
                continue
            max_m = 100 if exam_type != "unit_test" else 50
            ExamSchedule.objects.create(
                exam=exam, subject=sub, date=exam_date,
                start_time=time(9, 0), end_time=time(12, 0),
                max_marks=max_m, pass_marks=int(max_m * 0.35),
                venue=f"Hall {random.randint(1,5)}",
            )
            exam_date += timedelta(days=1)

print(f"  ✅ Exams: {Exam.objects.count()} | Schedules: {ExamSchedule.objects.count()}")

# ── Exam Results ─────────────────────────────────────────────────────────────
result_count = 0
for exam in all_exams:
    cls_obj = exam.school_class
    gname = cls_obj.name
    schedules = list(exam.schedules.all())
    # Get students in this class
    stu_in_class = Student.objects.filter(section__school_class=cls_obj, is_active=True)
    for student in stu_in_class:
        for sched in schedules:
            is_absent = random.random() < 0.05
            marks = 0 if is_absent else round(random.uniform(sched.pass_marks * 0.6, sched.max_marks), 1)
            grade = ""
            if not is_absent:
                pct = (marks / sched.max_marks) * 100
                grade = "A+" if pct >= 90 else "A" if pct >= 80 else "B+" if pct >= 70 else \
                         "B" if pct >= 60 else "C" if pct >= 50 else "D" if pct >= 35 else "F"
            ExamResult.objects.create(
                student=student, exam_schedule=sched,
                marks_obtained=Decimal(str(marks)), grade=grade,
                is_absent=is_absent, entered_by=admin_user,
            )
            result_count += 1

print(f"  ✅ Exam Results: {result_count}")

# ── Student Attendance (last 30 days) ────────────────────────────────────────
att_count = 0
today = date.today()
for student in all_students:
    sec = student.section
    if not sec:
        continue
    gname = sec.school_class.name
    for day_offset in range(30):
        d = today - timedelta(days=day_offset)
        if d.weekday() >= 6:
            continue
        # Deliberately make some students low-attendance for AI risk detection
        if student.roll_number in ["1", "2"] and random.random() < 0.4:
            status = "absent"
        else:
            status = random.choices(["present", "absent", "late", "leave"], weights=[85, 8, 5, 2])[0]
        Attendance.objects.create(
            student=student, date=d, status=status,
            marked_by=admin_user,
        )
        att_count += 1

print(f"  ✅ Attendance Records: {att_count}")

# ── Staff Attendance (last 15 days) ──────────────────────────────────────────
for staff_obj in staff_list[:30]:
    for day_offset in range(15):
        d = today - timedelta(days=day_offset)
        if d.weekday() >= 6:
            continue
        StaffAttendance.objects.create(
            staff=staff_obj, date=d,
            status=random.choices(["present", "absent", "on_leave"], weights=[88, 7, 5])[0],
            in_time=time(8, random.randint(15, 45)),
            out_time=time(16, random.randint(0, 30)),
            marked_by=admin_user,
        )


# ═════════════════════════════════════════════════════════════════════════════
#  PHASE 6: FEES
# ═════════════════════════════════════════════════════════════════════════════
print("\n💰 Phase 6: Fees …")

cat_tuition = FeeCategory.objects.create(name="Tuition Fee", description="Monthly tuition")
cat_transport = FeeCategory.objects.create(name="Transport Fee", description="Monthly bus fee", is_optional=True)
cat_lab = FeeCategory.objects.create(name="Lab Fee", description="Annual lab fee")
cat_admission = FeeCategory.objects.create(name="Admission Fee", description="One-time admission", is_optional=False)

for gname, cls_obj in classes.items():
    grade_num = int(gname.split()[-1])
    base = 3000 + grade_num * 200
    FeeStructure.objects.create(
        academic_year=ay_curr, school_class=cls_obj, category=cat_tuition,
        amount=Decimal(str(base)), due_date=date(2025, 7, 10), term="monthly", late_fine_per_day=Decimal("50"),
    )
    FeeStructure.objects.create(
        academic_year=ay_curr, school_class=cls_obj, category=cat_lab,
        amount=Decimal("2500"), due_date=date(2025, 7, 15), term="annually",
    )

# Pay fees for ~70% of students
fee_structures = list(FeeStructure.objects.filter(academic_year=ay_curr))
payment_count = 0
for student in random.sample(all_students, int(len(all_students) * 0.7)):
    cls = student.section.school_class if student.section else None
    if not cls:
        continue
    for fs in fee_structures:
        if fs.school_class != cls:
            continue
        FeePayment.objects.create(
            student=student, fee_structure=fs,
            amount_paid=fs.amount, status="paid", payment_method="online",
            payment_date=rand_date(date(2025, 7, 1), date(2025, 8, 15)),
            collected_by=admin_user,
            receipt_number=f"REC{student.id}{fs.id}{random.randint(100,999)}",
        )
        payment_count += 1

print(f"  ✅ Fee Categories: {FeeCategory.objects.count()} | Structures: {FeeStructure.objects.count()}")
print(f"  ✅ Fee Payments: {payment_count}")


# ═════════════════════════════════════════════════════════════════════════════
#  PHASE 7: HOSTEL
# ═════════════════════════════════════════════════════════════════════════════
print("\n🏠 Phase 7: Hostel, Rooms, Allocations, Mess …")

hostel_boys = Hostel.objects.create(
    name="Aryabhatta Boys Hostel", code="ABH", gender="boys", category="senior",
    warden=teacher_users[0], total_floors=3, total_capacity=120,
    address="Campus Block B", phone=rand_phone(), is_active=True,
)
hostel_girls = Hostel.objects.create(
    name="Kalpana Girls Hostel", code="KGH", gender="girls", category="senior",
    warden=teacher_users[1], total_floors=3, total_capacity=100,
    address="Campus Block C", phone=rand_phone(), is_active=True,
)

for hostel in [hostel_boys, hostel_girls]:
    for fl_num in range(1, hostel.total_floors + 1):
        floor = Floor.objects.create(hostel=hostel, number=fl_num, name=f"Floor {fl_num}")
        for r in range(1, 11):
            Room.objects.create(
                hostel=hostel, floor=floor,
                room_number=f"{fl_num}{r:02d}",
                room_type=random.choice(["double", "triple"]),
                capacity=random.choice([2, 3]),
                status="available",
                monthly_rent=Decimal(str(random.choice([3000, 3500, 4000]))),
                amenities="Bed, Study Table, Cupboard, Fan",
            )

# Allocate hostel students
hostel_students = [s for s in all_students if s.hostel_resident]
rooms_boys = list(Room.objects.filter(hostel=hostel_boys, status="available"))
rooms_girls = list(Room.objects.filter(hostel=hostel_girls, status="available"))
alloc_hostel = 0
for student in hostel_students:
    gender = student.user.profile.gender if hasattr(student.user, 'profile') else "male"
    room_pool = rooms_boys if gender == "male" else rooms_girls
    available = [r for r in room_pool if r.occupied < r.capacity]
    if not available:
        continue
    room = random.choice(available)
    RoomAllotment.objects.create(
        student=student, room=room, allotted_by=admin_user,
        join_date=date(2025, 6, 15), is_active=True,
    )
    room.occupied += 1
    room.update_status()
    room.save()
    alloc_hostel += 1

    # Create Mess Diet Profile
    MessDietProfile.objects.create(
        student=student,
        preference=random.choice(["veg", "non_veg", "eggetarian"]),
    )

# Mess Menu Plans (next 7 days)
for hostel in [hostel_boys, hostel_girls]:
    for d_offset in range(7):
        plan_d = today + timedelta(days=d_offset)
        for meal in ["breakfast", "lunch", "dinner"]:
            items_text = {
                "breakfast": "Idli, Dosa, Sambar, Chutney, Tea",
                "lunch":     "Rice, Dal, Sabzi, Roti, Curd, Pickle",
                "dinner":    "Chapati, Paneer Curry, Rice, Salad, Kheer",
            }
            MessMenuPlan.objects.create(
                hostel=hostel, plan_date=plan_d, meal_type=meal,
                items=items_text[meal], created_by=admin_user,
            )

# Mess Inventory
for hostel in [hostel_boys, hostel_girls]:
    for item_name, cat, unit, stock, cost in [
        ("Rice", "Grains", "kg", 200, 45), ("Dal", "Pulses", "kg", 80, 90),
        ("Oil", "Cooking", "litre", 40, 180), ("Milk", "Dairy", "litre", 50, 55),
        ("Sugar", "Essentials", "kg", 30, 42), ("Flour", "Grains", "kg", 100, 38),
    ]:
        MessInventoryItem.objects.create(
            hostel=hostel, name=item_name, category=cat, unit=unit,
            current_stock=Decimal(str(stock)), minimum_stock=Decimal(str(stock * 0.2)),
            cost_per_unit=Decimal(str(cost)),
        )

# Mess Vendors
for hostel in [hostel_boys, hostel_girls]:
    MessVendor.objects.create(
        hostel=hostel, name="Fresh Farms Pvt Ltd",
        contact_person="Suresh Kumar", phone=rand_phone(),
        categories=["Vegetables", "Fruits"], is_active=True,
    )
    MessVendor.objects.create(
        hostel=hostel, name="Daily Dairy Co",
        contact_person="Meena Nair", phone=rand_phone(),
        categories=["Milk", "Curd", "Butter"], is_active=True,
    )

print(f"  ✅ Hostels: {Hostel.objects.count()} | Rooms: {Room.objects.count()}")
print(f"  ✅ Hostel Allocations: {alloc_hostel}")
print(f"  ✅ Mess Menus: {MessMenuPlan.objects.count()} | Inventory: {MessInventoryItem.objects.count()}")


# ═════════════════════════════════════════════════════════════════════════════
#  PHASE 8: CANTEEN
# ═════════════════════════════════════════════════════════════════════════════
print("\n🍽️ Phase 8: Canteen …")

for cat_name in ["Main Course", "Snacks", "Beverages", "Dessert"]:
    FoodCategory.objects.create(name=cat_name)

food_items_data = [
    ("Masala Dosa", "breakfast", 40, True), ("Egg Puff", "snacks", 25, False),
    ("Samosa", "snacks", 15, True), ("Chicken Biriyani", "lunch", 120, False),
    ("Veg Meals", "lunch", 80, True), ("Fresh Juice", "juice", 30, True),
    ("Ice Cream", "other", 50, True), ("Tea", "other", 10, True),
    ("Coffee", "other", 15, True), ("Poori Masala", "breakfast", 45, True),
    ("Fish Curry Meals", "lunch", 130, False), ("Chapati Meal", "dinner", 90, True),
]
fi_objs = []
for name, cat, price, veg in food_items_data:
    fi = FoodItem.objects.create(name=name, category=cat, price=Decimal(str(price)), is_veg=veg, is_available=True)
    fi_objs.append(fi)

# Ingredients & Dishes
for ing_name in ["Rice", "Wheat Flour", "Oil", "Onion", "Tomato", "Potato", "Milk", "Sugar", "Salt", "Spices"]:
    CanteenIngredient.objects.create(name=ing_name)

ingredients_all = list(CanteenIngredient.objects.all())
for d_name, dt, price, veg in [
    ("Masala Dosa", "solid", 40, True), ("Biriyani", "full_meal", 120, False),
    ("Sambar", "liquid", 20, True), ("Chutney", "liquid", 10, True),
]:
    dish = CanteenDish.objects.create(name=d_name, dish_type=dt, price=Decimal(str(price)), is_veg=veg)
    dish.ingredients.set(random.sample(ingredients_all, min(4, len(ingredients_all))))

# Suppliers
for s_name, cat in [("Green Valley Farms", "Vegetables"), ("Metro Dairy", "Dairy"), ("Spice Hub", "Spices")]:
    CanteenSupplier.objects.create(name=s_name, phone=rand_phone(), category=cat)

# Canteen Inventory
for item_name, unit, stock in [
    ("Rice", "kg", 100), ("Oil", "litre", 25), ("Flour", "kg", 50),
    ("Sugar", "kg", 20), ("Milk", "litre", 30),
]:
    CanteenInventoryItem.objects.create(name=item_name, unit=unit, current_stock=Decimal(str(stock)))

print(f"  ✅ Food Items: {FoodItem.objects.count()} | Dishes: {CanteenDish.objects.count()}")
print(f"  ✅ Suppliers: {CanteenSupplier.objects.count()} | Inventory: {CanteenInventoryItem.objects.count()}")


# ═════════════════════════════════════════════════════════════════════════════
#  PHASE 9: TRANSPORT
# ═════════════════════════════════════════════════════════════════════════════
print("\n🚌 Phase 9: Transport Routes …")

routes_data = [
    ("Route A - Edappally", "KL-07-AB-1234", 40),
    ("Route B - Kakkanad", "KL-07-CD-5678", 40),
    ("Route C - Fort Kochi", "KL-07-EF-9012", 35),
    ("Route D - Aluva", "KL-07-GH-3456", 45),
]
driver_user = make_user("Ramu", "Driver", "admin", school)
transport_routes = []
for rname, veh, cap in routes_data:
    route = TransportRoute.objects.create(
        name=rname, driver=driver_user, vehicle_number=veh, vehicle_capacity=cap,
    )
    transport_routes.append(route)
    stops = ["Main Gate", "Bus Stand", "Junction", "Colony", "School"]
    for i, sn in enumerate(stops, 1):
        RouteStop.objects.create(
            route=route, stop_name=f"{rname.split('-')[1].strip()} {sn}",
            stop_order=i,
            pickup_time=time(7, 30 + i * 5),
            drop_time=time(16, 0 + i * 5),
        )

# Assign transport students
transport_students = [s for s in all_students if s.transport_user]
all_stops = list(RouteStop.objects.all())
for student in transport_students[:len(all_stops) * 3]:  # limit to available capacity
    stop = random.choice(all_stops)
    try:
        StudentTransport.objects.create(student=student, stop=stop, join_date=date(2025, 6, 15))
    except Exception:
        pass

print(f"  ✅ Routes: {TransportRoute.objects.count()} | Stops: {RouteStop.objects.count()}")
print(f"  ✅ Transport Assignments: {StudentTransport.objects.count()}")


# ═════════════════════════════════════════════════════════════════════════════
#  PHASE 10: EVENTS, CLUBS, LIBRARY, NOTIFICATIONS, ELECTIONS
# ═════════════════════════════════════════════════════════════════════════════
print("\n🎉 Phase 10: Events, Library, Notifications, Elections …")

# Events
events_data = [
    ("Annual Sports Day", date(2025, 11, 15), "active"),
    ("Science Exhibition", date(2025, 12, 20), "planning"),
    ("Republic Day Celebration", date(2026, 1, 26), "planning"),
    ("Annual Day", date(2026, 2, 28), "planning"),
    ("Inter-House Quiz", date(2025, 9, 10), "completed"),
]
for title, d, status in events_data:
    ev = Event.objects.create(title=title, date=d, status=status, description=f"School-wide {title} event")
    ev.coordinators.set(random.sample(staff_list[:10], 2))
    for t in range(1, 4):
        sub_task = EventSubTask.objects.create(event=ev, title=f"Task {t} for {title}", status="pending")
        sub_task.assigned_sections.set(random.sample(list(sections.values()), 3))

# Clubs
clubs_data = [
    ("Science Club", "Exploring wonders of science"),
    ("Literary Club", "Reading, debate and creative writing"),
    ("Sports Club", "Inter-school competitions"),
    ("Art Club", "Painting, sculpture and design"),
    ("Music Club", "Vocal and instrumental music"),
]
for cname, desc in clubs_data:
    club = Club.objects.create(name=cname, description=desc, advisor=random.choice(staff_list[:10]), meeting_schedule="Every Friday 3:00 PM")
    for a in range(3):
        ClubActivity.objects.create(
            club=club, title=f"{cname} Workshop {a+1}",
            date=rand_date(date(2025, 7, 1), date(2026, 1, 31)),
            participation_count=random.randint(15, 60),
        )

# Library
books_data = [
    ("To Kill a Mockingbird", "Harper Lee", "978-0061120084", "Fiction"),
    ("A Brief History of Time", "Stephen Hawking", "978-0553380163", "Science"),
    ("The Alchemist", "Paulo Coelho", "978-0062315007", "Fiction"),
    ("Sapiens", "Yuval Noah Harari", "978-0062316097", "History"),
    ("Wings of Fire", "APJ Abdul Kalam", "978-8173711466", "Autobiography"),
    ("NCERT Mathematics Class X", "NCERT", "978-8174504975", "Textbook"),
    ("NCERT Science Class X", "NCERT", "978-8174505064", "Textbook"),
    ("Oxford English Dictionary", "Oxford Press", "978-0199571123", "Reference"),
    ("RD Sharma Mathematics", "RD Sharma", "978-9383182015", "Textbook"),
    ("HC Verma Physics Vol. 1", "HC Verma", "978-8177091878", "Textbook"),
]
book_objs = []
for title, author, isbn, cat in books_data:
    b = Book.objects.create(title=title, author=author, isbn=isbn, category=cat,
                            total_copies=random.randint(3, 10), available_copies=random.randint(1, 5),
                            rack_number=f"R{random.randint(1,20)}")
    book_objs.append(b)

# Issue some books
for student in random.sample(all_students, min(30, len(all_students))):
    book = random.choice(book_objs)
    try:
        BookIssue.objects.create(
            book=book, student=student, issued_by=admin_user,
            due_date=today + timedelta(days=14),
            status=random.choice(["issued", "returned"]),
        )
    except Exception:
        pass

# Notifications
for title, ntype, target in [
    ("Fee Payment Reminder", "fee", "all"),
    ("Mid Term Exam Schedule Published", "exam", "students"),
    ("Annual Sports Day Registration Open", "event", "all"),
    ("Library Book Return Reminder", "general", "students"),
    ("PTA Meeting Notice", "circular", "parents"),
    ("Staff Meeting Tomorrow", "general", "staff"),
]:
    Notification.objects.create(
        title=title, body=f"Dear all, this is regarding {title.lower()}. Please take the necessary action.",
        notification_type=ntype, target_audience=target,
        created_by=admin_user, is_published=True,
    )

# Elections
for sec_key in list(sections.keys())[:6]:
    sec = sections[sec_key]
    election = Election.objects.create(
        section=sec, title=f"Class Leader Election - {sec.school_class.name} {sec.name}",
        role="Class Leader", status="ended", created_by=admin_user,
        ended_at=timezone.now() - timedelta(days=10),
    )
    students_in_sec = Student.objects.filter(section=sec)[:5]
    candidates = []
    for stu in students_in_sec:
        c = Candidate.objects.create(election=election, name=stu.user.get_full_name())
        candidates.append(c)
    if candidates:
        for v_stu in Student.objects.filter(section=sec):
            try:
                Vote.objects.create(
                    election=election, candidate=random.choice(candidates),
                    roll_number=v_stu.roll_number,
                )
            except Exception:
                pass

# Admission Inquiries
for i in range(10):
    AdmissionInquiry.objects.create(
        school=school,
        guardian_name=f"{random.choice(FIRST_NAMES_M)} {random.choice(LAST_NAMES)}",
        contact_phone=rand_phone(),
        student_name=f"{random.choice(FIRST_NAMES_M + FIRST_NAMES_F)} {random.choice(LAST_NAMES)}",
        class_requested=random.choice(list(classes.values())),
        status=random.choice(["New", "Contacted", "Under Review"]),
        notes="Inquiry for admission.",
    )

print(f"  ✅ Events: {Event.objects.count()} | Clubs: {Club.objects.count()}")
print(f"  ✅ Books: {Book.objects.count()} | Issues: {BookIssue.objects.count()}")
print(f"  ✅ Notifications: {Notification.objects.count()}")
print(f"  ✅ Elections: {Election.objects.count()} | Votes: {Vote.objects.count()}")
print(f"  ✅ Admission Inquiries: {AdmissionInquiry.objects.count()}")


# ═════════════════════════════════════════════════════════════════════════════
#  PHASE 11: AI BRAIN DRAFTS
# ═════════════════════════════════════════════════════════════════════════════
print("\n🧠 Phase 11: AI Brain Seed Drafts …")

for sec_key in list(sections.keys())[:4]:
    sec = sections[sec_key]
    AIBrainDraft.objects.create(
        draft_type="timetable", status="preview", school=school,
        section=sec, requested_by=admin_user,
        input_payload={"section_id": sec.id, "academic_year_id": ay_curr.id},
        output_payload={"message": "Timetable draft pending AI generation"},
    )

for exam in all_exams[:3]:
    AIBrainDraft.objects.create(
        draft_type="report_card", status="preview", school=school,
        exam=exam, requested_by=admin_user,
        input_payload={"exam_id": exam.id},
        output_payload={"message": "Report card draft pending generation"},
    )

print(f"  ✅ AI Brain Drafts: {AIBrainDraft.objects.count()}")


# ═════════════════════════════════════════════════════════════════════════════
#  FINAL SUMMARY
# ═════════════════════════════════════════════════════════════════════════════
print("\n" + "═" * 70)
print("  ✅ SEEDING COMPLETE! DATABASE SUMMARY:")
print("═" * 70)

MODELS = [
    ("Schools", School), ("Academic Years", AcademicYear), ("Users", User),
    ("User Profiles", UserProfile), ("Roles", Role), ("Permissions", Permission),
    ("Classes", Class), ("Sections", Section), ("Students", Student), ("Parents", Parent),
    ("Staff", Staff), ("Teacher Details", TeacherDetail),
    ("Subjects", Subject), ("Subject Allocations", SubjectAllocation),
    ("Syllabus Units", SyllabusUnit), ("Syllabus Chapters", SyllabusChapter),
    ("Timetables", Timetable), ("Periods", Period),
    ("Exams", Exam), ("Exam Schedules", ExamSchedule), ("Exam Results", ExamResult),
    ("Attendance", Attendance), ("Staff Attendance", StaffAttendance),
    ("Fee Categories", FeeCategory), ("Fee Structures", FeeStructure), ("Fee Payments", FeePayment),
    ("Hostels", Hostel), ("Rooms", Room), ("Room Allotments", RoomAllotment),
    ("Mess Menu Plans", MessMenuPlan), ("Mess Inventory", MessInventoryItem),
    ("Food Items", FoodItem), ("Canteen Dishes", CanteenDish),
    ("Transport Routes", TransportRoute), ("Route Stops", RouteStop),
    ("Events", Event), ("Clubs", Club), ("Books", Book), ("Book Issues", BookIssue),
    ("Notifications", Notification), ("Elections", Election), ("Votes", Vote),
    ("Admission Inquiries", AdmissionInquiry),
    ("AI Brain Drafts", AIBrainDraft),
]
for label, model in MODELS:
    print(f"  {label:.<35} {model.objects.count():>6}")

print("═" * 70)
print("  🔑 Admin Login: username=admin / password=Admin@1234")
print("  🔑 Test Student/Staff password: Test@1234")
print("═" * 70)
