from django.http import HttpResponse
from django.views import View
from django.utils import timezone
from django.db.models import Prefetch

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT

from .models import Timetable, Period, AcademicYear
from apps.students.models import Section

# ── Brand colors (Professional Academy Palette) ─────────────────────────────
CLR_PRIMARY     = colors.HexColor('#0F172A')   # Slate 900
CLR_ACCENT      = colors.HexColor('#4F46E5')   # Indigo 600
CLR_BREAK_BG    = colors.HexColor('#F8FAFC')   # Slate 50
CLR_HEADER_TEXT = colors.white
CLR_BORDER      = colors.HexColor('#CBD5E1')   # Slate 300
CLR_TEXT_DARK   = colors.HexColor('#1E293B')   # Slate 800
CLR_TEXT_MUTED  = colors.HexColor('#64748B')   # Slate 500
CLR_SUBJECT     = colors.HexColor('#0F172A')
CLR_TEACHER     = colors.HexColor('#4F46E5')
CLR_ROOM        = colors.HexColor('#94A3B8')
CLR_EVEN_ROW    = colors.HexColor('#F1F5F9')   # Slate 100
CLR_ODD_ROW     = colors.white

def build_pdf_response(class_name, schedule, periods, days, school_name, section_info):
    """
    Export a beautiful, high-contrast timetable.
    """
    response = HttpResponse(content_type='application/pdf')
    safe_name = class_name.replace(' ', '_').replace('/', '-')
    response['Content-Disposition'] = f'attachment; filename="timetable_{safe_name}.pdf"'

    page_size = landscape(A4)
    doc = SimpleDocTemplate(
        response,
        pagesize=page_size,
        leftMargin=12*mm,
        rightMargin=12*mm,
        topMargin=12*mm,
        bottomMargin=12*mm,
    )

    styles = getSampleStyleSheet()

    # ── Custom paragraph styles ───────────────────────────────────────────────
    school_style = ParagraphStyle(
        'SchoolName',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        textColor=CLR_PRIMARY,
        alignment=TA_LEFT,
        spaceAfter=0,
    )
    meta_style = ParagraphStyle(
        'MetaInfo',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        textColor=CLR_TEXT_MUTED,
        alignment=TA_LEFT,
    )
    badge_style = ParagraphStyle(
        'Badge',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        textColor=CLR_ACCENT,
        alignment=TA_LEFT,
    )
    col_header_style = ParagraphStyle(
        'ColHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        textColor=CLR_HEADER_TEXT,
        alignment=TA_CENTER,
    )
    period_time_style = ParagraphStyle(
        'PeriodTime',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7,
        textColor=colors.whitesmoke,
        alignment=TA_CENTER,
        leading=8,
    )
    subject_style = ParagraphStyle(
        'Subject',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        textColor=CLR_SUBJECT,
        leading=10,
    )
    event_style = ParagraphStyle(
        'Event',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        textColor=CLR_ACCENT,
        leading=10,
    )
    teacher_style = ParagraphStyle(
        'Teacher',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7,
        textColor=CLR_TEACHER,
        leading=9,
    )
    room_style = ParagraphStyle(
        'Room',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=6.5,
        textColor=CLR_ROOM,
        leading=8,
    )
    break_style = ParagraphStyle(
        'Break',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        textColor=CLR_TEXT_MUTED,
        alignment=TA_CENTER,
    )

    story = []

    # ── Header Section ────────────────────────────────────────────────────────
    generated_at = timezone.now().strftime('%d %b %Y, %I:%M %p')
    class_teacher = section_info.get('class_teacher_name', 'Not assigned')

    header_left = [
        Paragraph(school_name.upper(), school_style),
        Spacer(1, 1*mm),
        Paragraph(f"ACADEMIC TIMETABLE • {class_name}", badge_style)
    ]
    header_right = [
        Paragraph(f"Class Teacher: <b>{class_teacher}</b>", meta_style),
        Paragraph(f"Academic Year: {section_info.get('ay_label', 'Current')}", meta_style),
        Paragraph(f"Exported: {generated_at}", meta_style),
    ]

    header_table = Table([[header_left, header_right]], colWidths=['65%', '35%'])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 2*mm))

    # ── Table Layout Calculation ──────────────────────────────────────────────
    page_width = page_size[0] - 24*mm
    day_col_w  = 22*mm
    usable     = page_width - day_col_w

    break_count = sum(1 for p in periods if p.get('isBreak'))
    non_break_count = len(periods) - break_count
    
    break_col_w = 10*mm
    class_col_w = (usable - break_count * break_col_w) / max(non_break_count, 1)

    col_widths = [day_col_w]
    for p in periods:
        col_widths.append(break_col_w if p.get('isBreak') else class_col_w)

    # ── Table Data Assembly ───────────────────────────────────────────────────
    header_row = [Paragraph('<b>DAY</b>', col_header_style)]
    for p in periods:
        label = p['label'].upper()
        time_str = p.get('time', '')
        if time_str == "00:00 - 00:00": time_str = ""
        header_row.append([
            Paragraph(f"<b>{label}</b>", col_header_style),
            Paragraph(f"{time_str}", period_time_style)
        ])

    table_data = [header_row]
    for day in days:
        day_slots = schedule.get(day, [])
        row = [Paragraph(f"<b>{day.upper()}</b>", col_header_style)]
        for col_idx, period in enumerate(periods):
            slot = day_slots[col_idx] if col_idx < len(day_slots) else None
            
            if period.get('isBreak'):
                # Vertical text for break
                row.append(Paragraph("<br/>".join(list(period['label'])), break_style))
                continue
                
            if not slot:
                row.append(Paragraph('', styles['Normal']))
                continue

            parts = []
            if slot.get('subject'):
                style = event_style if slot.get('type') == 'event' else subject_style
                parts.append(Paragraph(slot['subject'], style))
            if slot.get('teacher'):
                parts.append(Paragraph(slot['teacher'], teacher_style))
            if slot.get('room') and slot['room'] != 'TBD':
                parts.append(Paragraph(f"Room: {slot['room']}", room_style))
            
            row.append(parts if parts else Paragraph('', styles['Normal']))
        table_data.append(row)

    # ── Table Styling ─────────────────────────────────────────────────────────
    ts = TableStyle([
        # Row 0 (Header)
        ('BACKGROUND', (0, 0), (-1, 0), CLR_PRIMARY),
        ('VALIGN', (0, 0), (-1, 0), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        
        # Day Column (Column 0)
        ('BACKGROUND', (0, 1), (0, -1), CLR_PRIMARY),
        ('TEXTCOLOR', (0, 1), (0, -1), CLR_HEADER_TEXT),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        
        # Grid and Alignment
        ('GRID', (0, 0), (-1, -1), 0.5, CLR_BORDER),
        ('VALIGN', (0, 1), (-1, -1), 'MIDDLE'),
        ('ALIGN', (1, 1), (-1, -1), 'LEFT'),
        
        # Row Banding
        ('ROWBACKGROUNDS', (1, 1), (-1, -1), [CLR_ODD_ROW, CLR_EVEN_ROW]),
        
        # Padding
        ('LEFTPADDING', (1, 1), (-1, -1), 6),
        ('RIGHTPADDING', (1, 1), (-1, -1), 6),
        ('BOTTOMPADDING', (1, 1), (-1, -1), 8),
        ('TOPPADDING', (1, 1), (-1, -1), 8),
    ])

    # Apply specific backgrounds for gaps/breaks
    for i, p in enumerate(periods):
        if p.get('isBreak'):
            ts.add('BACKGROUND', (i+1, 1), (i+1, -1), CLR_BREAK_BG)
            ts.add('ALIGN', (i+1, 1), (i+1, -1), 'CENTER')

    timetable_table = Table(table_data, colWidths=col_widths, repeatRows=1)
    timetable_table.setStyle(ts)
    story.append(timetable_table)

    # ── Footer ────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 8*mm))
    story.append(Paragraph(
        f"<font color='#94A3B8'>This document is an official publication of <b>{school_name}</b>. Generated via CampusMS on {generated_at}.</font>",
        ParagraphStyle('Footer', fontName='Helvetica-Oblique', fontSize=7.5, alignment=TA_CENTER)
    ))

    doc.build(story)
    return response

class TimetablePDFExportView(View):
    def get(self, request):
        class_name_input = request.GET.get('class_name', '')
        if not class_name_input:
            return HttpResponse('class_name query param is required', status=400)

        # 1. Find Section
        parts = class_name_input.split(" - ")
        if len(parts) == 2:
            c_name, s_name = parts
            section = Section.objects.filter(school_class__name=c_name, name=s_name).first()
        else:
            section = Section.objects.filter(name=class_name_input).first()

        if not section:
            return HttpResponse(f'Section "{class_name_input}" not found', status=404)

        # 2. Get Academic Year
        academic_year = AcademicYear.objects.filter(school=section.school_class.school, is_active=True).first()
        if not academic_year:
            academic_year = AcademicYear.objects.filter(school=section.school_class.school).order_by('-start_date').first()

        # 3. Fetch Timetables & Periods
        timetables = Timetable.objects.filter(
            section=section, academic_year=academic_year
        ).prefetch_related(
            Prefetch('periods', queryset=Period.objects.select_related('subject', 'teacher'))
        ).order_by('day_of_week')

        # 4. Construct unique period definitions
        all_periods_flat = Period.objects.filter(timetable__section=section, timetable__academic_year=academic_year).order_by('period_number')
        
        period_defs = {}
        for p in all_periods_flat:
            if p.period_number not in period_defs:
                label = 'Period ' + str(p.period_number)
                if p.period_type == 'break': label = 'BREAK'
                if p.period_type == 'lunch': label = 'LUNCH'
                
                start_str = p.start_time.strftime('%H:%M') if p.start_time else "00:00"
                end_str = p.end_time.strftime('%H:%M') if p.end_time else "00:00"
                
                period_defs[p.period_number] = {
                    'label': label,
                    'time': f"{start_str} - {end_str}",
                    'isBreak': p.period_type in ['break', 'lunch']
                }
        
        sorted_period_nums = sorted(period_defs.keys())
        periods_list = [period_defs[num] for num in sorted_period_nums]

        # 5. Populate Schedule Grid
        working_days = [d[1] for d in Timetable.DAY_CHOICES]
        schedule = {day: [None] * len(periods_list) for day in working_days}
        
        for tt in timetables:
            day_name = tt.get_day_of_week_display()
            if day_name not in schedule: continue
            
            day_periods = {p.period_number: p for p in tt.periods.all()}
            for i, p_num in enumerate(sorted_period_nums):
                p = day_periods.get(p_num)
                if p:
                    # Logic for title: custom_title if event, otherwise subject name
                    title = p.custom_title if (p.period_type == 'event' and p.custom_title) else (p.subject.name if p.subject else '')
                    
                    schedule[day_name][i] = {
                        'subject': title,
                        'teacher': p.teacher.get_full_name() if p.teacher else '',
                        'room': getattr(p, 'room', 'TBD'),
                        'type': p.period_type,
                        'isBreak': p.period_type in ['break', 'lunch']
                    }

        section_info = {
            'class_teacher_name': section.class_teacher.get_full_name() if section.class_teacher else 'N/A',
            'ay_label': str(academic_year) if academic_year else 'N/A'
        }
        school_name = section.school_class.school.name

        return build_pdf_response(
            class_name=class_name_input,
            schedule=schedule,
            periods=periods_list,
            days=working_days,
            school_name=school_name,
            section_info=section_info
        )
