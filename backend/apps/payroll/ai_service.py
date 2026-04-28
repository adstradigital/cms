"""
Deterministic rule-based AI insight engine for payroll.
Analyzes attendance, performance data, and compensation history
to produce human-readable explanations for every salary component.
No external LLM required — all reasoning is data-driven.
"""

MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
]


class PayrollAIInsightEngine:

    def analyze_payroll_run(self, payroll_run):
        """Generate and persist AI insights for every entry in a payroll run."""
        results = []
        for entry in payroll_run.entries.select_related('staff', 'staff__user').all():
            insights = self.generate_entry_insights(entry, payroll_run)
            entry.ai_deduction_reason = insights['deduction_reason']
            entry.ai_increment_reason = insights['increment_reason']
            entry.ai_incentive_reason = insights['incentive_reason']
            entry.ai_overall_summary = insights['overall_summary']
            entry.save(update_fields=[
                'ai_deduction_reason', 'ai_increment_reason',
                'ai_incentive_reason', 'ai_overall_summary',
            ])
            results.append({
                'id': entry.id,
                'name': entry.staff.user.get_full_name() if entry.staff.user else '',
            })
        return {'analyzed': len(results), 'entries': results}

    def generate_entry_insights(self, entry, payroll_run):
        month_name = MONTH_NAMES[payroll_run.month]
        year = payroll_run.year
        staff = entry.staff
        return {
            'deduction_reason': self._deduction_reason(entry, month_name),
            'increment_reason': self._increment_reason(entry, staff, month_name),
            'incentive_reason': self._incentive_reason(entry, staff, month_name, year),
            'overall_summary': self._overall_summary(entry, staff, month_name, year),
        }

    # ── Individual reason generators ─────────────────────────────────────────

    def _deduction_reason(self, entry, month_name):
        parts = []

        # Attendance / LOP
        if entry.paid_days < entry.working_days:
            absent = entry.working_days - entry.paid_days
            pct = round(float(entry.paid_days) / float(entry.working_days) * 100, 1)
            parts.append(
                f"Attendance adjustment: {entry.paid_days}/{entry.working_days} working days paid "
                f"({pct}%). {absent} unpaid absence(s) in {month_name} — salary prorated (Loss of Pay)."
            )
        else:
            parts.append(
                f"Full attendance in {month_name} — no Loss of Pay (LOP) deduction applied."
            )

        if float(entry.pf_deduction) > 0:
            parts.append(
                f"Provident Fund (PF): ₹{float(entry.pf_deduction):,.0f} deducted "
                f"(12% of Basic ₹{float(entry.basic_salary):,.0f}) — "
                f"mandatory EPFO contribution; employer contributes an equal amount."
            )

        if float(entry.esi_deduction) > 0:
            parts.append(
                f"ESI: ₹{float(entry.esi_deduction):,.0f} (0.75% of gross) — "
                f"Employee State Insurance for medical & disability coverage under the ESI Act."
            )

        if float(entry.tds_deduction) > 0:
            parts.append(
                f"TDS: ₹{float(entry.tds_deduction):,.0f} — income tax withheld at source "
                f"based on projected annual CTC and applicable slab (Sec. 192, Income Tax Act)."
            )

        if float(entry.other_deductions) > 0:
            parts.append(
                f"Other deductions: ₹{float(entry.other_deductions):,.0f} — "
                f"may include professional tax, loan EMI recovery, or voluntary deductions."
            )

        return " | ".join(parts) if parts else "Standard statutory deductions applied per active policy."

    def _increment_reason(self, entry, staff, month_name):
        if float(entry.increment_amount) <= 0:
            return ""

        from .models import IncrementHistory
        last = IncrementHistory.objects.filter(staff=staff).order_by('-effective_from').first()

        if last:
            type_label = dict(IncrementHistory.INCREMENT_TYPES).get(last.increment_type, 'increment')
            pct = (
                round(float(last.increment_amount) / float(last.old_basic) * 100, 1)
                if last.old_basic else 0
            )
            reason_text = last.reason.strip() or "As per HR salary revision policy."
            return (
                f"{type_label} of ₹{float(entry.increment_amount):,.0f}/month effective {month_name}. "
                f"Basic salary revised: ₹{float(last.old_basic):,.0f} → ₹{float(last.new_basic):,.0f} "
                f"(+{pct}% increase). Reason: {reason_text}"
            )

        return (
            f"Salary increment of ₹{float(entry.increment_amount):,.0f}/month applied in {month_name} "
            f"as part of the annual compensation review cycle."
        )

    def _incentive_reason(self, entry, staff, month_name, year):
        if float(entry.incentive_amount) <= 0:
            return ""

        amt = float(entry.incentive_amount)
        score, rank = None, None

        try:
            from apps.staff.models import TeacherLeaderboardSnapshot
            snap = TeacherLeaderboardSnapshot.objects.filter(staff=staff).order_by('-id').first()
            if snap:
                score = float(snap.composite_score) if snap.composite_score else None
                rank = snap.rank
        except Exception:
            pass

        if rank and rank <= 3:
            ordinals = {1: '1st', 2: '2nd', 3: '3rd'}
            return (
                f"Top-performer incentive of ₹{amt:,.0f} — ranked {ordinals[rank]} in the "
                f"staff performance leaderboard for {month_name} {year}. "
                f"Recognition for outstanding contribution to academic excellence and student outcomes."
            )

        if score and score >= 85:
            return (
                f"High-performance incentive of ₹{amt:,.0f} for an exceptional composite score of "
                f"{score:.1f}% in {month_name} {year} quarterly evaluation. "
                f"Management recognition for sustained impact on academic quality."
            )
        elif score and score >= 70:
            return (
                f"Performance incentive of ₹{amt:,.0f} awarded for an above-average composite "
                f"score of {score:.1f}% in the {month_name} {year} evaluation cycle."
            )

        return (
            f"Special incentive of ₹{amt:,.0f} awarded in {month_name} {year}. "
            f"Management discretionary recognition for significant contributions this period."
        )

    def _overall_summary(self, entry, staff, month_name, year):
        name = staff.user.get_full_name() if staff.user else "Staff"
        gross = float(entry.gross_salary)
        net = float(entry.net_salary)
        ded = float(entry.total_deductions)
        eff_rate = round(ded / gross * 100, 1) if gross else 0

        att_pct = float(entry.attendance_pct) if entry.attendance_pct else 100.0
        if att_pct >= 100:
            att = "Perfect attendance"
        elif att_pct >= 95:
            att = f"Excellent attendance ({att_pct:.0f}%)"
        elif att_pct >= 85:
            att = f"Good attendance ({att_pct:.0f}%)"
        elif att_pct >= 75:
            att = f"Moderate attendance ({att_pct:.0f}%) — minor LOP applied"
        else:
            att = f"Low attendance ({att_pct:.0f}%) — salary significantly impacted"

        extras = []
        if float(entry.increment_amount) > 0:
            extras.append(f"merit increment ₹{float(entry.increment_amount):,.0f}")
        if float(entry.incentive_amount) > 0:
            extras.append(f"performance incentive ₹{float(entry.incentive_amount):,.0f}")
        extra = f" Includes {' and '.join(extras)}." if extras else ""

        return (
            f"AI Analysis — {name} | {month_name} {year}: "
            f"Gross ₹{gross:,.0f} → Net ₹{net:,.0f} "
            f"(effective deduction rate: {eff_rate}%). "
            f"{att}.{extra} "
            f"Computed from active salary structure + statutory deductions via AI Brain Engine."
        )

    # ── Stand-alone increment reason generator ───────────────────────────────

    def generate_increment_ai_reason(self, staff, increment_type, old_basic, new_basic, reason=""):
        from .models import IncrementHistory
        type_label = dict(IncrementHistory.INCREMENT_TYPES).get(increment_type, 'increment')
        amt = float(new_basic) - float(old_basic)
        pct = round(amt / float(old_basic) * 100, 1) if old_basic else 0

        # Performance context
        score, rank = None, None
        try:
            from apps.staff.models import TeacherLeaderboardSnapshot
            snap = TeacherLeaderboardSnapshot.objects.filter(staff=staff).order_by('-id').first()
            if snap:
                score = float(snap.composite_score) if snap.composite_score else None
                rank = snap.rank
        except Exception:
            pass

        base = (
            f"{type_label} of ₹{amt:,.0f}/month (+{pct}%). "
            f"Basic salary revised from ₹{float(old_basic):,.0f} to ₹{float(new_basic):,.0f}. "
        )

        if reason.strip():
            base += f"HR notes: {reason.strip()}. "

        if increment_type == "merit" and score:
            if score >= 85:
                base += (
                    f"Staff achieved an exceptional composite performance score of {score:.1f}%, "
                    f"demonstrating outstanding dedication to academic quality and student success."
                )
            elif score >= 70:
                base += (
                    f"Staff maintained an above-average performance score of {score:.1f}%, "
                    f"reflecting consistent contribution to institutional goals."
                )
            else:
                base += "Performance evaluation supports this increment per HR policy."
        elif increment_type == "promotion":
            base += (
                "Promoted to a higher designation with expanded responsibilities. "
                "Compensation revised to reflect the new role requirements."
            )
        elif increment_type == "annual":
            base += (
                "Annual cost-of-living and performance-linked revision per institutional salary policy. "
                "All active staff in the designation band are eligible."
            )
        else:
            base += "Adjustment approved by HR and management as per institutional guidelines."

        return base
