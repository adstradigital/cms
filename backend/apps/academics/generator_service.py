import random
from apps.academics.models import Timetable, Period, SubjectAllocation, Subject
from apps.accounts.models import AcademicYear, User
from django.db import transaction

class TimetableGenerator:
    """
    Heuristic-based Timetable Generator.
    Tries to populate a section's timetable based on subject allocations and teacher availability.
    """
    def __init__(self, section, academic_year):
        self.section = section
        self.academic_year = academic_year
        self.days = [1, 2, 3, 4, 5, 6] # Mon to Sat
        self.num_periods = 8
        self.lunch_period = 4 # 1-indexed

    def generate(self):
        """
        Runs multiple passes of the generator to find the best possible fit.
        """
        best_run = None
        best_score = -1

        for _ in range(10): # 10 retries for best fit
            run_result = self._single_pass_generate()
            if run_result['placed'] > best_score:
                best_score = run_result['placed']
                best_run = run_result
            if run_result['remaining'] == 0:
                break # Perfect fit found

        return best_run

    def _single_pass_generate(self):
        with transaction.atomic():
            # 1. Fetch data
            allocations = SubjectAllocation.objects.select_related('subject').prefetch_related('teachers').filter(
                section=self.section,
                academic_year=self.academic_year
            )
            
            if not allocations.exists():
                return {"error": "No subject allocations found for this section."}

            subject_needs = []
            for alloc in allocations:
                subject_needs.extend([{
                    'subject': alloc.subject,
                    'teacher': alloc.teachers.first(),
                    'id': f"{alloc.id}-{i}"
                } for i in range(alloc.subject.weekly_periods)])
            
            random.shuffle(subject_needs)

            # 2. Setup grid tracking
            grid = {day: [None] * self.num_periods for day in self.days}
            day_subject_counts = {day: {} for day in self.days} # Track subject frequency per day

            # 3. Place lunch
            for day in self.days:
                grid[day][self.lunch_period - 1] = {'type': 'lunch'}

            # 4. Placement Loop
            placed_needs = []
            remaining_needs = []

            for need in subject_needs:
                placed = False
                # Try to find a valid slot
                # We shuffle days and periods to avoid top-left clustering
                shuffled_days = list(self.days)
                random.shuffle(shuffled_days)
                
                for day in shuffled_days:
                    shuffled_periods = list(range(1, self.num_periods + 1))
                    random.shuffle(shuffled_periods)

                    for p_num in shuffled_periods:
                        idx = p_num - 1
                        if grid[day][idx] is not None:
                            continue
                        
                        # Constraints:
                        # 1. Teacher must be available
                        # 2. Subject shouldn't appear more than 2 times in one day for this section
                        subj_id = need['subject'].id
                        day_count = day_subject_counts[day].get(subj_id, 0)
                        
                        if day_count < 2 and self._is_teacher_available(need['teacher'], day, p_num):
                            grid[day][idx] = need
                            day_subject_counts[day][subj_id] = day_count + 1
                            placed_needs.append((day, p_num, need))
                            placed = True
                            break
                    if placed: break
                
                if not placed:
                    remaining_needs.append(need)

            # 5. Commit to Database
            for day in self.days:
                tt, _ = Timetable.objects.get_or_create(
                    section=self.section,
                    academic_year=self.academic_year,
                    day_of_week=day
                )
                if not tt.is_published:
                    tt.periods.all().delete()
                    for p_num in range(1, self.num_periods + 1):
                        slot = grid[day][p_num - 1]
                        if not slot: continue
                        
                        p_type = 'class'
                        if slot.get('type') == 'lunch':
                            p_type = 'lunch'
                            subject = None
                            teacher = None
                        else:
                            p_type = 'class'
                            subject = slot['subject']
                            teacher = slot['teacher']

                        Period.objects.create(
                            timetable=tt,
                            period_number=p_num,
                            period_type=p_type,
                            subject=subject,
                            teacher=teacher,
                            start_time=self._get_start_time(p_num),
                            end_time=self._get_end_time(p_num)
                        )

            return {
                "success": True,
                "placed": len(placed_needs),
                "remaining": len(remaining_needs),
                "note": f"Could not place {len(remaining_needs)} units." if len(remaining_needs) > 0 else "Optimal generation complete."
            }

    def _is_teacher_available(self, teacher, day, period_number):
        if not teacher: return True
        return not Period.objects.filter(
            timetable__day_of_week=day,
            timetable__academic_year=self.academic_year,
            teacher=teacher,
            period_number=period_number
        ).exists()

    def _get_start_time(self, p_num):
        times = ["08:30", "09:15", "10:00", "11:00", "11:45", "13:15", "14:00", "14:45"]
        return times[p_num - 1] if p_num - 1 < len(times) else "15:30"

    def _get_end_time(self, p_num):
        times = ["09:15", "10:00", "10:45", "11:45", "12:30", "14:00", "14:45", "15:30"]
        return times[p_num - 1] if p_num - 1 < len(times) else "16:15"

