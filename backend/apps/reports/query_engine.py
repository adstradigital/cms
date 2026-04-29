"""
Dynamic Report Query Engine
Maps module names to Django querysets and handles
field selection, filtering, sorting, pagination, and chart data.
"""
from django.db.models import Q, Sum, Count, Avg, F


# ── Field Metadata ────────────────────────────────────────────────────────────

def _fees_fields():
    return [
        {'key': 'student_name',     'label': 'Student Name',    'type': 'text',   'category': 'Student'},
        {'key': 'roll_no',          'label': 'Roll No.',         'type': 'text',   'category': 'Student'},
        {'key': 'class_name',       'label': 'Class',            'type': 'text',   'category': 'Student'},
        {'key': 'section_name',     'label': 'Section',          'type': 'text',   'category': 'Student'},
        {'key': 'fee_category',     'label': 'Fee Category',     'type': 'text',   'category': 'Fee'},
        {'key': 'fee_type',         'label': 'Fee Type',         'type': 'choice', 'category': 'Fee',
         'choices': ['academic', 'transport', 'hostel', 'miscellaneous']},
        {'key': 'total_amount',     'label': 'Total Amount',     'type': 'number', 'category': 'Amount'},
        {'key': 'paid_amount',      'label': 'Paid Amount',      'type': 'number', 'category': 'Amount'},
        {'key': 'concession_amount','label': 'Concession',       'type': 'number', 'category': 'Amount'},
        {'key': 'late_fine',        'label': 'Fine',             'type': 'number', 'category': 'Amount'},
        {'key': 'due_amount',       'label': 'Due Amount',       'type': 'number', 'category': 'Amount'},
        {'key': 'payment_method',   'label': 'Payment Mode',     'type': 'choice', 'category': 'Payment',
         'choices': ['cash', 'online', 'cheque', 'dd', 'upi', 'neft']},
        {'key': 'receipt_number',   'label': 'Receipt No.',      'type': 'text',   'category': 'Payment'},
        {'key': 'transaction_id',   'label': 'Transaction ID',   'type': 'text',   'category': 'Payment'},
        {'key': 'status',           'label': 'Status',           'type': 'choice', 'category': 'Payment',
         'choices': ['pending', 'paid', 'partial', 'overdue', 'waived']},
        {'key': 'due_date',         'label': 'Due Date',         'type': 'date',   'category': 'Date'},
        {'key': 'payment_date',     'label': 'Payment Date',     'type': 'date',   'category': 'Date'},
        {'key': 'created_at',       'label': 'Invoice Date',     'type': 'date',   'category': 'Date'},
        {'key': 'collected_by',     'label': 'Collected By',     'type': 'text',   'category': 'Staff'},
    ]


def _students_fields():
    return [
        {'key': 'student_name',     'label': 'Student Name',     'type': 'text',    'category': 'Basic'},
        {'key': 'admission_number', 'label': 'Admission No.',    'type': 'text',    'category': 'Basic'},
        {'key': 'roll_number',      'label': 'Roll No.',         'type': 'text',    'category': 'Basic'},
        {'key': 'class_name',       'label': 'Class',            'type': 'text',    'category': 'Academic'},
        {'key': 'section_name',     'label': 'Section',          'type': 'text',    'category': 'Academic'},
        {'key': 'gender',           'label': 'Gender',           'type': 'choice',  'category': 'Personal',
         'choices': ['male', 'female', 'other']},
        {'key': 'date_of_birth',    'label': 'Date of Birth',    'type': 'date',    'category': 'Personal'},
        {'key': 'blood_group',      'label': 'Blood Group',      'type': 'text',    'category': 'Personal'},
        {'key': 'admission_date',   'label': 'Admission Date',   'type': 'date',    'category': 'Basic'},
        {'key': 'is_active',        'label': 'Active',           'type': 'boolean', 'category': 'Basic'},
        {'key': 'hostel_resident',  'label': 'Hostel Resident',  'type': 'boolean', 'category': 'Services'},
        {'key': 'transport_user',   'label': 'Transport User',   'type': 'boolean', 'category': 'Services'},
        {'key': 'parent_name',      'label': 'Parent Name',      'type': 'text',    'category': 'Parent'},
        {'key': 'parent_phone',     'label': 'Parent Phone',     'type': 'text',    'category': 'Parent'},
        {'key': 'email',            'label': 'Email',            'type': 'text',    'category': 'Contact'},
        {'key': 'phone',            'label': 'Phone',            'type': 'text',    'category': 'Contact'},
        {'key': 'previous_school',  'label': 'Previous School',  'type': 'text',    'category': 'Basic'},
    ]


def _attendance_fields():
    return [
        {'key': 'student_name', 'label': 'Student Name', 'type': 'text',   'category': 'Student'},
        {'key': 'roll_no',      'label': 'Roll No.',     'type': 'text',   'category': 'Student'},
        {'key': 'class_name',   'label': 'Class',        'type': 'text',   'category': 'Student'},
        {'key': 'section_name', 'label': 'Section',      'type': 'text',   'category': 'Student'},
        {'key': 'subject_name', 'label': 'Subject',      'type': 'text',   'category': 'Academic'},
        {'key': 'date',         'label': 'Date',         'type': 'date',   'category': 'Record'},
        {'key': 'status',       'label': 'Status',       'type': 'choice', 'category': 'Record',
         'choices': ['present', 'absent', 'late', 'leave', 'holiday']},
        {'key': 'marked_by',   'label': 'Marked By',    'type': 'text',   'category': 'Record'},
        {'key': 'remarks',     'label': 'Remarks',      'type': 'text',   'category': 'Record'},
    ]


def _exams_fields():
    return [
        {'key': 'student_name',      'label': 'Student Name',   'type': 'text',    'category': 'Student'},
        {'key': 'roll_no',           'label': 'Roll No.',       'type': 'text',    'category': 'Student'},
        {'key': 'class_name',        'label': 'Class',          'type': 'text',    'category': 'Student'},
        {'key': 'exam_name',         'label': 'Exam',           'type': 'text',    'category': 'Exam'},
        {'key': 'exam_type',         'label': 'Exam Type',      'type': 'text',    'category': 'Exam'},
        {'key': 'subject_name',      'label': 'Subject',        'type': 'text',    'category': 'Exam'},
        {'key': 'exam_date',         'label': 'Exam Date',      'type': 'date',    'category': 'Exam'},
        {'key': 'theory_marks',      'label': 'Theory Marks',   'type': 'number',  'category': 'Result'},
        {'key': 'internal_marks',    'label': 'Internal Marks', 'type': 'number',  'category': 'Result'},
        {'key': 'marks_obtained',    'label': 'Total Marks',    'type': 'number',  'category': 'Result'},
        {'key': 'max_theory_marks',  'label': 'Max Theory',     'type': 'number',  'category': 'Result'},
        {'key': 'max_internal_marks','label': 'Max Internal',   'type': 'number',  'category': 'Result'},
        {'key': 'grade',             'label': 'Grade',          'type': 'text',    'category': 'Result'},
        {'key': 'is_absent',         'label': 'Absent',         'type': 'boolean', 'category': 'Result'},
        {'key': 'remarks',           'label': 'Remarks',        'type': 'text',    'category': 'Result'},
    ]


def _staff_fields():
    return [
        {'key': 'staff_name',       'label': 'Staff Name',        'type': 'text',    'category': 'Basic'},
        {'key': 'employee_id',      'label': 'Employee ID',       'type': 'text',    'category': 'Basic'},
        {'key': 'email',            'label': 'Email',             'type': 'text',    'category': 'Contact'},
        {'key': 'phone',            'label': 'Phone',             'type': 'text',    'category': 'Contact'},
        {'key': 'designation',      'label': 'Designation',       'type': 'text',    'category': 'Employment'},
        {'key': 'joining_date',     'label': 'Joining Date',      'type': 'date',    'category': 'Employment'},
        {'key': 'experience_years', 'label': 'Experience (Yrs)',  'type': 'number',  'category': 'Employment'},
        {'key': 'qualification',    'label': 'Qualification',     'type': 'text',    'category': 'Employment'},
        {'key': 'status',           'label': 'Status',            'type': 'choice',  'category': 'Employment',
         'choices': ['active', 'inactive', 'on_leave']},
        {'key': 'is_teaching_staff','label': 'Teaching Staff',   'type': 'boolean', 'category': 'Employment'},
        {'key': 'gender',           'label': 'Gender',            'type': 'choice',  'category': 'Personal',
         'choices': ['male', 'female', 'other']},
        {'key': 'date_of_birth',    'label': 'Date of Birth',     'type': 'date',    'category': 'Personal'},
        {'key': 'blood_group',      'label': 'Blood Group',       'type': 'text',    'category': 'Personal'},
    ]


def _payroll_fields():
    return [
        {'key': 'staff_name',       'label': 'Staff Name',        'type': 'text',    'category': 'Staff'},
        {'key': 'employee_id',      'label': 'Employee ID',       'type': 'text',    'category': 'Staff'},
        {'key': 'designation',      'label': 'Designation',       'type': 'text',    'category': 'Staff'},
        {'key': 'month',            'label': 'Month',             'type': 'number',  'category': 'Period'},
        {'key': 'year',             'label': 'Year',              'type': 'number',  'category': 'Period'},
        {'key': 'run_status',       'label': 'Run Status',        'type': 'choice',  'category': 'Period',
         'choices': ['draft', 'processed', 'paid']},
        {'key': 'basic_salary',     'label': 'Basic Salary',      'type': 'number',  'category': 'Earnings'},
        {'key': 'hra',              'label': 'HRA',               'type': 'number',  'category': 'Earnings'},
        {'key': 'da',               'label': 'DA',                'type': 'number',  'category': 'Earnings'},
        {'key': 'ta',               'label': 'TA',                'type': 'number',  'category': 'Earnings'},
        {'key': 'other_allowances', 'label': 'Other Allowances',  'type': 'number',  'category': 'Earnings'},
        {'key': 'incentive_amount', 'label': 'Incentive',         'type': 'number',  'category': 'Earnings'},
        {'key': 'gross_salary',     'label': 'Gross Salary',      'type': 'number',  'category': 'Earnings'},
        {'key': 'pf_deduction',     'label': 'PF Deduction',      'type': 'number',  'category': 'Deductions'},
        {'key': 'esi_deduction',    'label': 'ESI Deduction',     'type': 'number',  'category': 'Deductions'},
        {'key': 'tds_deduction',    'label': 'TDS Deduction',     'type': 'number',  'category': 'Deductions'},
        {'key': 'other_deductions', 'label': 'Other Deductions',  'type': 'number',  'category': 'Deductions'},
        {'key': 'total_deductions', 'label': 'Total Deductions',  'type': 'number',  'category': 'Deductions'},
        {'key': 'net_salary',       'label': 'Net Salary',        'type': 'number',  'category': 'Net'},
        {'key': 'working_days',     'label': 'Working Days',      'type': 'number',  'category': 'Attendance'},
        {'key': 'paid_days',        'label': 'Paid Days',         'type': 'number',  'category': 'Attendance'},
        {'key': 'attendance_pct',   'label': 'Attendance %',      'type': 'number',  'category': 'Attendance'},
        {'key': 'is_paid',          'label': 'Paid',              'type': 'boolean', 'category': 'Payment'},
        {'key': 'payment_date',     'label': 'Payment Date',      'type': 'date',    'category': 'Payment'},
        {'key': 'payment_method',   'label': 'Payment Method',    'type': 'text',    'category': 'Payment'},
    ]


MODULE_META = {
    'fees':       {'label': 'Fees',       'color': '#0ea5e9', 'fields': _fees_fields()},
    'students':   {'label': 'Students',   'color': '#8b5cf6', 'fields': _students_fields()},
    'attendance': {'label': 'Attendance', 'color': '#00a676', 'fields': _attendance_fields()},
    'exams':      {'label': 'Exams',      'color': '#f59e0b', 'fields': _exams_fields()},
    'staff':      {'label': 'Staff',      'color': '#ef4444', 'fields': _staff_fields()},
    'payroll':    {'label': 'Payroll',    'color': '#6366f1', 'fields': _payroll_fields()},
}


# ── Filter Q-builder ──────────────────────────────────────────────────────────

def _build_q(paths, operator, value, value2=''):
    """Build a Django Q object from one or more ORM paths and an operator."""
    if isinstance(paths, (list, tuple)):
        combined = Q()
        for p in paths:
            combined |= _build_q(p, operator, value, value2)
        return combined

    path = paths
    op = operator.lower()

    if op == 'is empty':
        return Q(**{f'{path}__isnull': True}) | Q(**{f'{path}__exact': ''})
    if op == 'is not empty':
        return ~(Q(**{f'{path}__isnull': True}) | Q(**{f'{path}__exact': ''}))
    if op in ('equals', 'is'):
        return Q(**{f'{path}__iexact': value})
    if op == 'contains':
        return Q(**{f'{path}__icontains': value})
    if op == 'starts with':
        return Q(**{f'{path}__istartswith': value})
    if op == 'ends with':
        return Q(**{f'{path}__iendswith': value})
    if op in ('greater than', '>'):
        try:
            return Q(**{f'{path}__gt': float(value)})
        except (ValueError, TypeError):
            return Q(**{f'{path}__gt': value})
    if op in ('less than', '<'):
        try:
            return Q(**{f'{path}__lt': float(value)})
        except (ValueError, TypeError):
            return Q(**{f'{path}__lt': value})
    if op == 'between':
        return Q(**{f'{path}__gte': value, f'{path}__lte': value2})
    if op == 'before':
        return Q(**{f'{path}__lt': value})
    if op == 'after':
        return Q(**{f'{path}__gt': value})
    # default fallback
    return Q(**{f'{path}__icontains': value})


def _apply_filters(qs, filters, filter_logic, field_to_path):
    q_objects = []
    for f in filters:
        field = f.get('field', '')
        operator = f.get('operator', 'equals')
        value = f.get('value', '')
        value2 = f.get('value2', '')
        if not field or (not value and operator not in ('is empty', 'is not empty')):
            continue
        paths = field_to_path.get(field)
        if not paths:
            continue
        q_objects.append(_build_q(paths, operator, value, value2))

    if not q_objects:
        return qs

    combined = q_objects[0]
    for q in q_objects[1:]:
        if filter_logic == 'OR':
            combined |= q
        else:
            combined &= q
    return qs.filter(combined)


# ── Serialization helpers ─────────────────────────────────────────────────────

def _str(v):
    return str(v) if v is not None else ''


def _float(v):
    try:
        return float(v) if v is not None else 0.0
    except (TypeError, ValueError):
        return 0.0


# ── Module: Fees ──────────────────────────────────────────────────────────────

_FEES_FILTER_PATHS = {
    'student_name':      ['student__user__first_name', 'student__user__last_name'],
    'roll_no':           'student__roll_number',
    'class_name':        'student__section__school_class__name',
    'section_name':      'student__section__name',
    'fee_category':      'fee_structure__category__name',
    'fee_type':          'fee_structure__category__fee_type',
    'status':            'status',
    'payment_method':    'payment_method',
    'receipt_number':    'receipt_number',
    'transaction_id':    'transaction_id',
    'total_amount':      'fee_structure__amount',
    'paid_amount':       'amount_paid',
    'late_fine':         'late_fine',
    'due_date':          'fee_structure__due_date',
    'payment_date':      'payment_date',
}

_FEES_SORT_MAP = {
    'student_name': 'student__user__first_name',
    'roll_no':      'student__roll_number',
    'class_name':   'student__section__school_class__name',
    'section_name': 'student__section__name',
    'fee_category': 'fee_structure__category__name',
    'total_amount': 'fee_structure__amount',
    'paid_amount':  'amount_paid',
    'due_amount':   'amount_paid',
    'status':       'status',
    'payment_date': 'payment_date',
    'due_date':     'fee_structure__due_date',
    'created_at':   'created_at',
}


def _run_fees(fields, filters, filter_logic, group_by, sort_field, sort_dir, page, page_size, school):
    from apps.fees.models import FeePayment
    qs = FeePayment.objects.select_related(
        'student__user__userprofile',
        'student__section__school_class',
        'fee_structure__category',
        'collected_by',
    )
    if school:
        qs = qs.filter(student__user__school=school)

    qs = _apply_filters(qs, filters, filter_logic, _FEES_FILTER_PATHS)

    sort_path = _FEES_SORT_MAP.get(sort_field, 'created_at')
    qs = qs.order_by(f'-{sort_path}' if sort_dir == 'desc' else sort_path)

    total = qs.count()
    start = (page - 1) * page_size
    records = list(qs[start:start + page_size])

    rows = []
    for r in records:
        t = _float(r.fee_structure.amount if r.fee_structure else 0)
        p = _float(r.amount_paid)
        c = _float(r.concession_amount)
        f_ = _float(r.late_fine)
        row = {
            'id': r.id,
            'student_name':      f"{r.student.user.first_name} {r.student.user.last_name}".strip() if r.student and r.student.user else '',
            'roll_no':           _str(r.student.roll_number if r.student else ''),
            'class_name':        r.student.section.school_class.name if r.student and r.student.section and r.student.section.school_class else '',
            'section_name':      r.student.section.name if r.student and r.student.section else '',
            'fee_category':      r.fee_structure.category.name if r.fee_structure and r.fee_structure.category else '',
            'fee_type':          r.fee_structure.category.fee_type if r.fee_structure and r.fee_structure.category else '',
            'total_amount':      t,
            'paid_amount':       p,
            'concession_amount': c,
            'late_fine':         f_,
            'due_amount':        round(t - p - c + f_, 2),
            'payment_method':    r.payment_method,
            'receipt_number':    r.receipt_number,
            'transaction_id':    r.transaction_id,
            'status':            r.status,
            'due_date':          _str(r.fee_structure.due_date if r.fee_structure else ''),
            'payment_date':      _str(r.payment_date),
            'created_at':        str(r.created_at.date()) if r.created_at else '',
            'collected_by':      r.collected_by.get_full_name() if r.collected_by else '',
        }
        if fields:
            row = {k: v for k, v in row.items() if k in fields or k == 'id'}
        rows.append(row)

    chart_data = _fees_chart(qs, group_by)
    summary = {
        'total_amount':  _float(qs.aggregate(v=Sum('fee_structure__amount'))['v']),
        'paid_amount':   _float(qs.aggregate(v=Sum('amount_paid'))['v']),
        'total_records': total,
    }
    return {'total': total, 'page': page, 'page_size': page_size,
            'total_pages': max(1, (total + page_size - 1) // page_size),
            'rows': rows, 'chart_data': chart_data, 'summary': summary}


def _fees_chart(qs, group_by):
    if group_by in ('fee_type', 'fee_category'):
        path = 'fee_structure__category__fee_type' if group_by == 'fee_type' else 'fee_structure__category__name'
        data = qs.values(path).annotate(value=Sum('fee_structure__amount')).order_by()
        return [{'label': d[path] or 'N/A', 'value': _float(d['value'])} for d in data]
    if group_by == 'status':
        data = qs.values('status').annotate(value=Count('id')).order_by()
        return [{'label': d['status'], 'value': d['value']} for d in data]
    if group_by == 'payment_method':
        data = qs.values('payment_method').annotate(value=Sum('amount_paid')).order_by()
        return [{'label': d['payment_method'] or 'N/A', 'value': _float(d['value'])} for d in data]
    # default: by class
    data = (qs.values('student__section__school_class__name')
              .annotate(value=Sum('fee_structure__amount'), paid=Sum('amount_paid'))
              .order_by('student__section__school_class__name'))
    return [{'label': d['student__section__school_class__name'] or 'N/A',
             'value': _float(d['paid']), 'total': _float(d['value'])} for d in data]


# ── Module: Students ──────────────────────────────────────────────────────────

_STUDENTS_FILTER_PATHS = {
    'student_name':     ['user__first_name', 'user__last_name'],
    'admission_number': 'admission_number',
    'roll_number':      'roll_number',
    'class_name':       'section__school_class__name',
    'section_name':     'section__name',
    'gender':           'user__userprofile__gender',
    'date_of_birth':    'user__userprofile__date_of_birth',
    'blood_group':      'user__userprofile__blood_group',
    'admission_date':   'admission_date',
    'is_active':        'is_active',
    'hostel_resident':  'hostel_resident',
    'transport_user':   'transport_user',
    'email':            'user__email',
    'phone':            'user__phone',
}

_STUDENTS_SORT_MAP = {
    'student_name':     'user__first_name',
    'admission_number': 'admission_number',
    'roll_number':      'roll_number',
    'class_name':       'section__school_class__name',
    'section_name':     'section__name',
    'admission_date':   'admission_date',
    'is_active':        'is_active',
}


def _run_students(fields, filters, filter_logic, group_by, sort_field, sort_dir, page, page_size, school):
    from apps.students.models import Student
    qs = Student.objects.select_related(
        'user__userprofile',
        'section__school_class',
    )
    if school:
        qs = qs.filter(user__school=school)

    qs = _apply_filters(qs, filters, filter_logic, _STUDENTS_FILTER_PATHS)

    sort_path = _STUDENTS_SORT_MAP.get(sort_field, 'user__first_name')
    qs = qs.order_by(f'-{sort_path}' if sort_dir == 'desc' else sort_path)

    total = qs.count()
    start = (page - 1) * page_size
    records = list(qs[start:start + page_size])

    rows = []
    for r in records:
        up = getattr(r.user, 'userprofile', None) if r.user else None
        row = {
            'id':               r.id,
            'student_name':     f"{r.user.first_name} {r.user.last_name}".strip() if r.user else '',
            'admission_number': r.admission_number,
            'roll_number':      r.roll_number,
            'class_name':       r.section.school_class.name if r.section and r.section.school_class else '',
            'section_name':     r.section.name if r.section else '',
            'gender':           up.gender if up else '',
            'date_of_birth':    _str(up.date_of_birth if up else ''),
            'blood_group':      up.blood_group if up else '',
            'admission_date':   _str(r.admission_date),
            'is_active':        r.is_active,
            'hostel_resident':  r.hostel_resident,
            'transport_user':   r.transport_user,
            'parent_name':      up.father_name if up else '',
            'parent_phone':     up.parent_phone if up else '',
            'email':            r.user.email if r.user else '',
            'phone':            r.user.phone if r.user else '',
            'previous_school':  r.previous_school,
        }
        if fields:
            row = {k: v for k, v in row.items() if k in fields or k == 'id'}
        rows.append(row)

    chart_data = _students_chart(qs, group_by)
    summary = {'total_records': total, 'active': qs.filter(is_active=True).count()}
    return {'total': total, 'page': page, 'page_size': page_size,
            'total_pages': max(1, (total + page_size - 1) // page_size),
            'rows': rows, 'chart_data': chart_data, 'summary': summary}


def _students_chart(qs, group_by):
    if group_by == 'gender':
        data = qs.values('user__userprofile__gender').annotate(value=Count('id')).order_by()
        return [{'label': d['user__userprofile__gender'] or 'N/A', 'value': d['value']} for d in data]
    if group_by == 'is_active':
        data = qs.values('is_active').annotate(value=Count('id')).order_by()
        return [{'label': 'Active' if d['is_active'] else 'Inactive', 'value': d['value']} for d in data]
    # default: by class
    data = qs.values('section__school_class__name').annotate(value=Count('id')).order_by('section__school_class__name')
    return [{'label': d['section__school_class__name'] or 'N/A', 'value': d['value']} for d in data]


# ── Module: Attendance ────────────────────────────────────────────────────────

_ATTENDANCE_FILTER_PATHS = {
    'student_name': ['student__user__first_name', 'student__user__last_name'],
    'roll_no':      'student__roll_number',
    'class_name':   'student__section__school_class__name',
    'section_name': 'student__section__name',
    'subject_name': 'subject__name',
    'date':         'date',
    'status':       'status',
    'marked_by':    ['marked_by__first_name', 'marked_by__last_name'],
    'remarks':      'remarks',
}

_ATTENDANCE_SORT_MAP = {
    'student_name': 'student__user__first_name',
    'class_name':   'student__section__school_class__name',
    'date':         'date',
    'status':       'status',
}


def _run_attendance(fields, filters, filter_logic, group_by, sort_field, sort_dir, page, page_size, school):
    from apps.attendance.models import Attendance
    qs = Attendance.objects.select_related(
        'student__user',
        'student__section__school_class',
        'subject',
        'marked_by',
    )
    if school:
        qs = qs.filter(student__user__school=school)

    qs = _apply_filters(qs, filters, filter_logic, _ATTENDANCE_FILTER_PATHS)

    sort_path = _ATTENDANCE_SORT_MAP.get(sort_field, '-date')
    qs = qs.order_by(f'-{sort_path}' if sort_dir == 'desc' else sort_path)

    total = qs.count()
    start = (page - 1) * page_size
    records = list(qs[start:start + page_size])

    rows = []
    for r in records:
        row = {
            'id':           r.id,
            'student_name': f"{r.student.user.first_name} {r.student.user.last_name}".strip() if r.student and r.student.user else '',
            'roll_no':      r.student.roll_number if r.student else '',
            'class_name':   r.student.section.school_class.name if r.student and r.student.section and r.student.section.school_class else '',
            'section_name': r.student.section.name if r.student and r.student.section else '',
            'subject_name': r.subject.name if r.subject else '',
            'date':         _str(r.date),
            'status':       r.status,
            'marked_by':    r.marked_by.get_full_name() if r.marked_by else '',
            'remarks':      r.remarks,
        }
        if fields:
            row = {k: v for k, v in row.items() if k in fields or k == 'id'}
        rows.append(row)

    chart_data = _attendance_chart(qs, group_by)
    summary = {
        'total_records': total,
        'present': qs.filter(status='present').count(),
        'absent':  qs.filter(status='absent').count(),
    }
    return {'total': total, 'page': page, 'page_size': page_size,
            'total_pages': max(1, (total + page_size - 1) // page_size),
            'rows': rows, 'chart_data': chart_data, 'summary': summary}


def _attendance_chart(qs, group_by):
    if group_by == 'status':
        data = qs.values('status').annotate(value=Count('id')).order_by()
        return [{'label': d['status'], 'value': d['value']} for d in data]
    if group_by == 'subject_name':
        data = qs.values('subject__name').annotate(value=Count('id')).order_by()
        return [{'label': d['subject__name'] or 'N/A', 'value': d['value']} for d in data]
    # default: by class
    data = (qs.values('student__section__school_class__name')
              .annotate(value=Count('id'))
              .order_by('student__section__school_class__name'))
    return [{'label': d['student__section__school_class__name'] or 'N/A', 'value': d['value']} for d in data]


# ── Module: Exams ─────────────────────────────────────────────────────────────

_EXAMS_FILTER_PATHS = {
    'student_name':   ['student__user__first_name', 'student__user__last_name'],
    'roll_no':        'student__roll_number',
    'class_name':     'student__section__school_class__name',
    'exam_name':      'exam_schedule__exam__name',
    'exam_type':      'exam_schedule__exam__exam_type__name',
    'subject_name':   'exam_schedule__subject__name',
    'exam_date':      'exam_schedule__date',
    'grade':          'grade',
    'is_absent':      'is_absent',
    'marks_obtained': 'marks_obtained',
}

_EXAMS_SORT_MAP = {
    'student_name':   'student__user__first_name',
    'class_name':     'student__section__school_class__name',
    'exam_date':      'exam_schedule__date',
    'marks_obtained': 'marks_obtained',
    'grade':          'grade',
}


def _run_exams(fields, filters, filter_logic, group_by, sort_field, sort_dir, page, page_size, school):
    from apps.exams.models import ExamResult
    qs = ExamResult.objects.select_related(
        'student__user',
        'student__section__school_class',
        'exam_schedule__exam__exam_type',
        'exam_schedule__subject',
    )
    if school:
        qs = qs.filter(student__user__school=school)

    qs = _apply_filters(qs, filters, filter_logic, _EXAMS_FILTER_PATHS)

    sort_path = _EXAMS_SORT_MAP.get(sort_field, '-exam_schedule__date')
    qs = qs.order_by(f'-{sort_path}' if sort_dir == 'desc' else sort_path)

    total = qs.count()
    start = (page - 1) * page_size
    records = list(qs[start:start + page_size])

    rows = []
    for r in records:
        sched = r.exam_schedule
        row = {
            'id':               r.id,
            'student_name':     f"{r.student.user.first_name} {r.student.user.last_name}".strip() if r.student and r.student.user else '',
            'roll_no':          r.student.roll_number if r.student else '',
            'class_name':       r.student.section.school_class.name if r.student and r.student.section and r.student.section.school_class else '',
            'exam_name':        sched.exam.name if sched and sched.exam else '',
            'exam_type':        sched.exam.exam_type.name if sched and sched.exam and sched.exam.exam_type else '',
            'subject_name':     sched.subject.name if sched and sched.subject else '',
            'exam_date':        _str(sched.date if sched else ''),
            'theory_marks':     _float(r.theory_marks),
            'internal_marks':   _float(r.internal_marks),
            'marks_obtained':   _float(r.marks_obtained),
            'max_theory_marks': sched.max_theory_marks if sched else 0,
            'max_internal_marks': sched.max_internal_marks if sched else 0,
            'grade':            r.grade,
            'is_absent':        r.is_absent,
            'remarks':          r.remarks,
        }
        if fields:
            row = {k: v for k, v in row.items() if k in fields or k == 'id'}
        rows.append(row)

    chart_data = _exams_chart(qs, group_by)
    summary = {
        'total_records': total,
        'avg_marks': _float(qs.aggregate(v=Avg('marks_obtained'))['v']),
    }
    return {'total': total, 'page': page, 'page_size': page_size,
            'total_pages': max(1, (total + page_size - 1) // page_size),
            'rows': rows, 'chart_data': chart_data, 'summary': summary}


def _exams_chart(qs, group_by):
    if group_by == 'subject_name':
        data = qs.values('exam_schedule__subject__name').annotate(value=Avg('marks_obtained')).order_by()
        return [{'label': d['exam_schedule__subject__name'] or 'N/A', 'value': _float(d['value'])} for d in data]
    if group_by == 'grade':
        data = qs.values('grade').annotate(value=Count('id')).order_by()
        return [{'label': d['grade'] or 'N/A', 'value': d['value']} for d in data]
    # default: avg marks by class
    data = (qs.values('student__section__school_class__name')
              .annotate(value=Avg('marks_obtained'))
              .order_by('student__section__school_class__name'))
    return [{'label': d['student__section__school_class__name'] or 'N/A', 'value': _float(d['value'])} for d in data]


# ── Module: Staff ─────────────────────────────────────────────────────────────

_STAFF_FILTER_PATHS = {
    'staff_name':       ['user__first_name', 'user__last_name'],
    'employee_id':      'employee_id',
    'email':            'user__email',
    'phone':            'user__phone',
    'designation':      'designation',
    'joining_date':     'joining_date',
    'experience_years': 'experience_years',
    'qualification':    'qualification',
    'status':           'status',
    'is_teaching_staff':'is_teaching_staff',
    'gender':           'user__userprofile__gender',
    'blood_group':      'user__userprofile__blood_group',
}

_STAFF_SORT_MAP = {
    'staff_name':       'user__first_name',
    'employee_id':      'employee_id',
    'designation':      'designation',
    'joining_date':     'joining_date',
    'experience_years': 'experience_years',
    'status':           'status',
}


def _run_staff(fields, filters, filter_logic, group_by, sort_field, sort_dir, page, page_size, school):
    from apps.staff.models import Staff
    qs = Staff.objects.select_related('user__userprofile')
    if school:
        qs = qs.filter(user__school=school)

    qs = _apply_filters(qs, filters, filter_logic, _STAFF_FILTER_PATHS)

    sort_path = _STAFF_SORT_MAP.get(sort_field, 'user__first_name')
    qs = qs.order_by(f'-{sort_path}' if sort_dir == 'desc' else sort_path)

    total = qs.count()
    start = (page - 1) * page_size
    records = list(qs[start:start + page_size])

    rows = []
    for r in records:
        up = getattr(r.user, 'userprofile', None) if r.user else None
        row = {
            'id':               r.id,
            'staff_name':       f"{r.user.first_name} {r.user.last_name}".strip() if r.user else '',
            'employee_id':      r.employee_id,
            'email':            r.user.email if r.user else '',
            'phone':            r.user.phone if r.user else '',
            'designation':      r.designation,
            'joining_date':     _str(r.joining_date),
            'experience_years': _float(r.experience_years),
            'qualification':    r.qualification,
            'status':           r.status,
            'is_teaching_staff': r.is_teaching_staff,
            'gender':           up.gender if up else '',
            'date_of_birth':    _str(up.date_of_birth if up else ''),
            'blood_group':      up.blood_group if up else '',
        }
        if fields:
            row = {k: v for k, v in row.items() if k in fields or k == 'id'}
        rows.append(row)

    chart_data = _staff_chart(qs, group_by)
    summary = {
        'total_records': total,
        'active': qs.filter(status='active').count(),
        'teaching': qs.filter(is_teaching_staff=True).count(),
    }
    return {'total': total, 'page': page, 'page_size': page_size,
            'total_pages': max(1, (total + page_size - 1) // page_size),
            'rows': rows, 'chart_data': chart_data, 'summary': summary}


def _staff_chart(qs, group_by):
    if group_by == 'status':
        data = qs.values('status').annotate(value=Count('id')).order_by()
        return [{'label': d['status'], 'value': d['value']} for d in data]
    if group_by == 'is_teaching_staff':
        data = qs.values('is_teaching_staff').annotate(value=Count('id')).order_by()
        return [{'label': 'Teaching' if d['is_teaching_staff'] else 'Non-Teaching', 'value': d['value']} for d in data]
    # default: by designation
    data = qs.values('designation').annotate(value=Count('id')).order_by('-value')[:8]
    return [{'label': d['designation'] or 'N/A', 'value': d['value']} for d in data]


# ── Module: Payroll ───────────────────────────────────────────────────────────

_PAYROLL_FILTER_PATHS = {
    'staff_name':       ['staff__user__first_name', 'staff__user__last_name'],
    'employee_id':      'staff__employee_id',
    'designation':      'staff__designation',
    'month':            'payroll_run__month',
    'year':             'payroll_run__year',
    'run_status':       'payroll_run__status',
    'basic_salary':     'basic_salary',
    'gross_salary':     'gross_salary',
    'net_salary':       'net_salary',
    'is_paid':          'is_paid',
    'payment_date':     'payment_date',
    'payment_method':   'payment_method',
}

_PAYROLL_SORT_MAP = {
    'staff_name':       'staff__user__first_name',
    'employee_id':      'staff__employee_id',
    'designation':      'staff__designation',
    'month':            'payroll_run__month',
    'year':             'payroll_run__year',
    'basic_salary':     'basic_salary',
    'gross_salary':     'gross_salary',
    'net_salary':       'net_salary',
    'payment_date':     'payment_date',
}


def _run_payroll(fields, filters, filter_logic, group_by, sort_field, sort_dir, page, page_size, school):
    from apps.payroll.models import PayrollEntry
    qs = PayrollEntry.objects.select_related(
        'staff__user',
        'payroll_run',
    )
    if school:
        qs = qs.filter(staff__user__school=school)

    qs = _apply_filters(qs, filters, filter_logic, _PAYROLL_FILTER_PATHS)

    sort_path = _PAYROLL_SORT_MAP.get(sort_field, '-payroll_run__year')
    qs = qs.order_by(f'-{sort_path}' if sort_dir == 'desc' else sort_path)

    total = qs.count()
    start = (page - 1) * page_size
    records = list(qs[start:start + page_size])

    rows = []
    for r in records:
        row = {
            'id':               r.id,
            'staff_name':       f"{r.staff.user.first_name} {r.staff.user.last_name}".strip() if r.staff and r.staff.user else '',
            'employee_id':      r.staff.employee_id if r.staff else '',
            'designation':      r.staff.designation if r.staff else '',
            'month':            r.payroll_run.month if r.payroll_run else '',
            'year':             r.payroll_run.year if r.payroll_run else '',
            'run_status':       r.payroll_run.status if r.payroll_run else '',
            'basic_salary':     _float(r.basic_salary),
            'hra':              _float(r.hra),
            'da':               _float(r.da),
            'ta':               _float(r.ta),
            'other_allowances': _float(r.other_allowances),
            'incentive_amount': _float(r.incentive_amount),
            'gross_salary':     _float(r.gross_salary),
            'pf_deduction':     _float(r.pf_deduction),
            'esi_deduction':    _float(r.esi_deduction),
            'tds_deduction':    _float(r.tds_deduction),
            'other_deductions': _float(r.other_deductions),
            'total_deductions': _float(r.total_deductions),
            'net_salary':       _float(r.net_salary),
            'working_days':     r.working_days,
            'paid_days':        r.paid_days,
            'attendance_pct':   _float(r.attendance_pct),
            'is_paid':          r.is_paid,
            'payment_date':     _str(r.payment_date),
            'payment_method':   r.payment_method,
        }
        if fields:
            row = {k: v for k, v in row.items() if k in fields or k == 'id'}
        rows.append(row)

    chart_data = _payroll_chart(qs, group_by)
    summary = {
        'total_records': total,
        'total_gross':   _float(qs.aggregate(v=Sum('gross_salary'))['v']),
        'total_net':     _float(qs.aggregate(v=Sum('net_salary'))['v']),
    }
    return {'total': total, 'page': page, 'page_size': page_size,
            'total_pages': max(1, (total + page_size - 1) // page_size),
            'rows': rows, 'chart_data': chart_data, 'summary': summary}


def _payroll_chart(qs, group_by):
    if group_by == 'designation':
        data = qs.values('staff__designation').annotate(value=Sum('net_salary')).order_by('-value')[:8]
        return [{'label': d['staff__designation'] or 'N/A', 'value': _float(d['value'])} for d in data]
    if group_by == 'run_status':
        data = qs.values('payroll_run__status').annotate(value=Count('id')).order_by()
        return [{'label': d['payroll_run__status'], 'value': d['value']} for d in data]
    # default: net salary by month
    data = (qs.values('payroll_run__month', 'payroll_run__year')
              .annotate(value=Sum('net_salary'))
              .order_by('payroll_run__year', 'payroll_run__month'))
    months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return [{'label': f"{months[(d['payroll_run__month'] or 1) - 1]} {d['payroll_run__year']}",
             'value': _float(d['value'])} for d in data]


# ── Public API ────────────────────────────────────────────────────────────────

_RUNNERS = {
    'fees':       _run_fees,
    'students':   _run_students,
    'attendance': _run_attendance,
    'exams':      _run_exams,
    'staff':      _run_staff,
    'payroll':    _run_payroll,
}


def run_report(module, fields, filters, filter_logic, group_by, sort_field,
               sort_dir, page, page_size, school=None):
    runner = _RUNNERS.get(module)
    if not runner:
        raise ValueError(f"Unknown module: {module}")
    return runner(fields, filters, filter_logic, group_by, sort_field,
                  sort_dir, page, page_size, school)


def run_report_full(module, fields, filters, filter_logic, group_by, sort_field,
                    sort_dir, school=None):
    """Run without pagination — used for exports."""
    return run_report(module, fields, filters, filter_logic, group_by,
                      sort_field, sort_dir, page=1, page_size=100000, school=school)
