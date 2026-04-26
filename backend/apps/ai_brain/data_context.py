from __future__ import annotations

from typing import Dict, Optional, Tuple

from django.apps import apps
from django.db import connections
from django.db.models import Model, QuerySet
from django.db.utils import OperationalError, ProgrammingError

from apps.accounts.models import AcademicYear

from .access.classes import get_school_active_academic_year, get_section


def build_timetable_context(section_id: int, academic_year_id: Optional[int] = None) -> Dict:
    """
    Unified context builder for timetable-related AI requests.
    """
    section = get_section(section_id)
    if not section:
        return {"success": False, "error": "Section not found."}

    if academic_year_id:
        academic_year = AcademicYear.objects.filter(id=academic_year_id).first()
    else:
        academic_year = get_school_active_academic_year(section.school_class.school_id)

    if not academic_year:
        return {"success": False, "error": "Academic year not found."}

    return {
        "success": True,
        "section": section,
        "academic_year": academic_year,
    }


def _parse_bool(value: Optional[str], *, default: bool) -> bool:
    if value is None:
        return default
    return str(value).strip().lower() in {"1", "true", "yes", "y", "on"}


def _safe_count(qs: QuerySet) -> Dict:
    try:
        return {"ok": True, "count": qs.count()}
    except (OperationalError, ProgrammingError) as exc:
        return {"ok": False, "error": str(exc)}


def _get_model(app_label: str, model_name: str) -> Tuple[Optional[type[Model]], Optional[str]]:
    try:
        return apps.get_model(app_label, model_name), None
    except LookupError:
        return None, "model_not_found"


def _safe_model_count(
    app_label: str,
    model_name: str,
    *,
    school_id: Optional[int] = None,
    academic_year_id: Optional[int] = None,
    scope_hints: Optional[Dict[str, str]] = None,
) -> Dict:
    model, err = _get_model(app_label, model_name)
    if err:
        return {"ok": False, "error": err}

    qs = model.objects.all()
    applied = {}

    scope_hints = scope_hints or {}
    school_path = scope_hints.get("school")
    academic_year_path = scope_hints.get("academic_year")

    # Apply scoping only when we know a safe/valid ORM path.
    if school_id is not None and school_path:
        qs = qs.filter(**{school_path: school_id})
        applied["school"] = school_path
    if academic_year_id is not None and academic_year_path:
        qs = qs.filter(**{academic_year_path: academic_year_id})
        applied["academic_year"] = academic_year_path

    result = _safe_count(qs)
    if applied:
        result["scoped_by"] = applied
    return result


def get_database_inventory(
    *,
    school_id: Optional[int] = None,
    academic_year_id: Optional[int] = None,
    include_models: bool = True,
    include_entity_counts: bool = True,
) -> Dict:
    """
    Exposes database aliases and all registered ORM models.
    Helps AI brain stay schema-aware as apps/tables grow.
    Cached for 5 minutes to avoid repeated heavy DB introspection.
    """
    from django.core.cache import cache
    cache_key = f"ai_brain_inventory_{school_id}_{academic_year_id}_{include_models}_{include_entity_counts}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    aliases = list(connections.databases.keys())
    model_labels = sorted([model._meta.label for model in apps.get_models()])
    app_labels = sorted({label.split(".", 1)[0] for label in model_labels if "." in label})

    inventory = {
        "db_aliases": aliases,
        "filters": {
            "school_id": school_id,
            "academic_year_id": academic_year_id,
        },
        "app_labels": app_labels,
        "model_count": len(model_labels),
    }

    if include_models:
        inventory["models"] = model_labels

    if include_entity_counts:
        # Scope hints: only add scoping where the ORM path is known to be safe.
        hints = {
            # accounts
            ("accounts", "School"): {},
            ("accounts", "AcademicYear"): {"school": "school_id"},
            ("accounts", "User"): {"school": "school_id"},
            ("accounts", "Parent"): {"school": "user__school_id"},
            # students
            ("students", "Class"): {"school": "school_id"},
            ("students", "Section"): {"school": "school_class__school_id"},
            ("students", "Student"): {"school": "section__school_class__school_id", "academic_year": "academic_year_id"},
            ("students", "StudentDocument"): {"school": "student__section__school_class__school_id"},
            ("students", "AdmissionInquiry"): {"school": "school_id"},
            # academics
            ("academics", "Subject"): {"school": "school_id"} if _get_model("academics", "Subject")[0] and hasattr(_get_model("academics", "Subject")[0], "school_id") else {},
            ("academics", "SubjectAllocation"): {"school": "section__school_class__school_id", "academic_year": "academic_year_id"},
            ("academics", "LessonPlan"): {"school": "section__school_class__school_id", "academic_year": "academic_year_id"},
            ("academics", "Timetable"): {"school": "section__school_class__school_id", "academic_year": "academic_year_id"},
            ("academics", "Period"): {"school": "timetable__section__school_class__school_id"},
            ("academics", "Homework"): {"school": "section__school_class__school_id", "academic_year": "academic_year_id"},
            ("academics", "HomeworkSubmission"): {"school": "homework__section__school_class__school_id"},
            ("academics", "SubstituteLog"): {"school": "section__school_class__school_id", "academic_year": "academic_year_id"},
            ("academics", "Assignment"): {"school": "section__school_class__school_id", "academic_year": "academic_year_id"},
            ("academics", "Material"): {"school": "section__school_class__school_id", "academic_year": "academic_year_id"},
            ("academics", "CourseSession"): {"school": "section__school_class__school_id", "academic_year": "academic_year_id"},
            # attendance
            ("attendance", "Attendance"): {"school": "student__section__school_class__school_id", "academic_year": "student__academic_year_id"},
            ("attendance", "LeaveRequest"): {"school": "student__section__school_class__school_id", "academic_year": "student__academic_year_id"},
            ("attendance", "AttendanceWarning"): {"school": "student__section__school_class__school_id", "academic_year": "student__academic_year_id"},
            # exams
            ("exams", "Exam"): {"school": "school_class__school_id", "academic_year": "academic_year_id"},
            ("exams", "ExamSchedule"): {"school": "exam__school_class__school_id", "academic_year": "exam__academic_year_id"},
            ("exams", "HallTicket"): {"school": "exam__school_class__school_id", "academic_year": "exam__academic_year_id"},
            ("exams", "ExamResult"): {"school": "exam_schedule__exam__school_class__school_id", "academic_year": "exam_schedule__exam__academic_year_id"},
            ("exams", "ReportCard"): {"school": "exam__school_class__school_id", "academic_year": "exam__academic_year_id"},
            # fees
            ("fees", "FeeCategory"): {},
            ("fees", "FeeStructure"): {"school": "school_class__school_id", "academic_year": "academic_year_id"},
            ("fees", "FeePayment"): {"school": "fee_structure__school_class__school_id", "academic_year": "fee_structure__academic_year_id"},
            # transport
            ("transport", "TransportRoute"): {"school": "school_id"} if _get_model("transport", "TransportRoute")[0] and hasattr(_get_model("transport", "TransportRoute")[0], "school_id") else {},
            ("transport", "RouteStop"): {"school": "route__school_id"} if _get_model("transport", "RouteStop")[0] and hasattr(_get_model("transport", "RouteStop")[0], "route_id") else {},
            ("transport", "StudentTransport"): {"school": "student__section__school_class__school_id", "academic_year": "student__academic_year_id"},
            # hostel
            ("hostel", "Hostel"): {"school": "school_id"} if _get_model("hostel", "Hostel")[0] and hasattr(_get_model("hostel", "Hostel")[0], "school_id") else {},
            ("hostel", "Floor"): {"school": "hostel__school_id"} if _get_model("hostel", "Floor")[0] and hasattr(_get_model("hostel", "Floor")[0], "hostel_id") else {},
            ("hostel", "Room"): {"school": "floor__hostel__school_id"} if _get_model("hostel", "Room")[0] and hasattr(_get_model("hostel", "Room")[0], "floor_id") else {},
            ("hostel", "RoomAllotment"): {"school": "room__floor__hostel__school_id"},
            ("hostel", "RoomTransfer"): {"school": "allotment__room__floor__hostel__school_id"},
            ("hostel", "NightAttendance"): {"school": "allotment__room__floor__hostel__school_id"},
            ("hostel", "EntryExitLog"): {"school": "allotment__room__floor__hostel__school_id"},
            ("hostel", "RuleViolation"): {"school": "allotment__room__floor__hostel__school_id"},
            ("hostel", "VisitorLog"): {"school": "hostel__school_id"} if _get_model("hostel", "VisitorLog")[0] and hasattr(_get_model("hostel", "VisitorLog")[0], "hostel_id") else {},
            ("hostel", "HostelFee"): {"school": "hostel__school_id"} if _get_model("hostel", "HostelFee")[0] and hasattr(_get_model("hostel", "HostelFee")[0], "hostel_id") else {},
            ("hostel", "MessMenuPlan"): {"school": "hostel__school_id"} if _get_model("hostel", "MessMenuPlan")[0] and hasattr(_get_model("hostel", "MessMenuPlan")[0], "hostel_id") else {},
            ("hostel", "MessMealAttendance"): {"school": "hostel__school_id"} if _get_model("hostel", "MessMealAttendance")[0] and hasattr(_get_model("hostel", "MessMealAttendance")[0], "hostel_id") else {},
            ("hostel", "MessDietProfile"): {"school": "hostel__school_id"} if _get_model("hostel", "MessDietProfile")[0] and hasattr(_get_model("hostel", "MessDietProfile")[0], "hostel_id") else {},
            ("hostel", "MessFeedback"): {"school": "hostel__school_id"} if _get_model("hostel", "MessFeedback")[0] and hasattr(_get_model("hostel", "MessFeedback")[0], "hostel_id") else {},
            ("hostel", "MessInventoryItem"): {"school": "hostel__school_id"} if _get_model("hostel", "MessInventoryItem")[0] and hasattr(_get_model("hostel", "MessInventoryItem")[0], "hostel_id") else {},
            ("hostel", "MessInventoryLog"): {"school": "item__hostel__school_id"} if _get_model("hostel", "MessInventoryLog")[0] and hasattr(_get_model("hostel", "MessInventoryLog")[0], "item_id") else {},
            ("hostel", "MessVendor"): {"school": "hostel__school_id"} if _get_model("hostel", "MessVendor")[0] and hasattr(_get_model("hostel", "MessVendor")[0], "hostel_id") else {},
            ("hostel", "MessVendorSupply"): {"school": "vendor__hostel__school_id"} if _get_model("hostel", "MessVendorSupply")[0] and hasattr(_get_model("hostel", "MessVendorSupply")[0], "vendor_id") else {},
            ("hostel", "MessWastageLog"): {"school": "item__hostel__school_id"} if _get_model("hostel", "MessWastageLog")[0] and hasattr(_get_model("hostel", "MessWastageLog")[0], "item_id") else {},
            ("hostel", "MessConsumptionLog"): {"school": "item__hostel__school_id"} if _get_model("hostel", "MessConsumptionLog")[0] and hasattr(_get_model("hostel", "MessConsumptionLog")[0], "item_id") else {},
            ("hostel", "MessFoodOrder"): {"school": "hostel__school_id"} if _get_model("hostel", "MessFoodOrder")[0] and hasattr(_get_model("hostel", "MessFoodOrder")[0], "hostel_id") else {},
            # library
            ("library", "Book"): {"school": "school_id"} if _get_model("library", "Book")[0] and hasattr(_get_model("library", "Book")[0], "school_id") else {},
            ("library", "BookIssue"): {"school": "book__school_id"} if _get_model("library", "BookIssue")[0] and hasattr(_get_model("library", "BookIssue")[0], "book_id") else {},
            # notifications
            ("notifications", "Notification"): {"school": "school_id"} if _get_model("notifications", "Notification")[0] and hasattr(_get_model("notifications", "Notification")[0], "school_id") else {},
            # staff
            ("staff", "Staff"): {"school": "school_id"} if _get_model("staff", "Staff")[0] and hasattr(_get_model("staff", "Staff")[0], "school_id") else {},
            ("staff", "TeacherDetail"): {"school": "staff__school_id"} if _get_model("staff", "TeacherDetail")[0] and hasattr(_get_model("staff", "TeacherDetail")[0], "staff_id") else {},
            ("staff", "StaffAttendance"): {"school": "staff__school_id"} if _get_model("staff", "StaffAttendance")[0] and hasattr(_get_model("staff", "StaffAttendance")[0], "staff_id") else {},
            ("staff", "StaffLeaveRequest"): {"school": "staff__school_id"} if _get_model("staff", "StaffLeaveRequest")[0] and hasattr(_get_model("staff", "StaffLeaveRequest")[0], "staff_id") else {},
            ("staff", "StaffTask"): {"school": "staff__school_id"} if _get_model("staff", "StaffTask")[0] and hasattr(_get_model("staff", "StaffTask")[0], "staff_id") else {},
            ("staff", "ParentFeedback"): {"school": "staff__school_id"} if _get_model("staff", "ParentFeedback")[0] and hasattr(_get_model("staff", "ParentFeedback")[0], "staff_id") else {},
            ("staff", "TeacherLeaderboardSnapshot"): {"school": "teacher__school_id"} if _get_model("staff", "TeacherLeaderboardSnapshot")[0] and hasattr(_get_model("staff", "TeacherLeaderboardSnapshot")[0], "teacher_id") else {},
            # canteen
            ("canteen", "FoodCategory"): {"school": "school_id"} if _get_model("canteen", "FoodCategory")[0] and hasattr(_get_model("canteen", "FoodCategory")[0], "school_id") else {},
            ("canteen", "FoodItem"): {"school": "school_id"} if _get_model("canteen", "FoodItem")[0] and hasattr(_get_model("canteen", "FoodItem")[0], "school_id") else {},
            ("canteen", "DailyMenu"): {"school": "school_id"} if _get_model("canteen", "DailyMenu")[0] and hasattr(_get_model("canteen", "DailyMenu")[0], "school_id") else {},
            ("canteen", "CanteenOrder"): {"school": "school_id"} if _get_model("canteen", "CanteenOrder")[0] and hasattr(_get_model("canteen", "CanteenOrder")[0], "school_id") else {},
            ("canteen", "CanteenSupplier"): {"school": "school_id"} if _get_model("canteen", "CanteenSupplier")[0] and hasattr(_get_model("canteen", "CanteenSupplier")[0], "school_id") else {},
            ("canteen", "CanteenInventoryItem"): {"school": "school_id"} if _get_model("canteen", "CanteenInventoryItem")[0] and hasattr(_get_model("canteen", "CanteenInventoryItem")[0], "school_id") else {},
            ("canteen", "CanteenInventoryLog"): {"school": "school_id"} if _get_model("canteen", "CanteenInventoryLog")[0] and hasattr(_get_model("canteen", "CanteenInventoryLog")[0], "school_id") else {},
            ("canteen", "CanteenComplaint"): {"school": "school_id"} if _get_model("canteen", "CanteenComplaint")[0] and hasattr(_get_model("canteen", "CanteenComplaint")[0], "school_id") else {},
        }

        entity_counts = {}
        for app_label in app_labels:
            # Only count models that exist in this repo's local apps (skip Django contrib + third-party).
            if app_label not in {
                "accounts",
                "permissions",
                "students",
                "academics",
                "attendance",
                "exams",
                "fees",
                "transport",
                "hostel",
                "library",
                "notifications",
                "staff",
                "elections",
                "events",
                "canteen",
                "ai_brain",
            }:
                continue

            app_entity = {}
            for model in apps.get_app_config(app_label).get_models():
                key = (app_label, model.__name__)
                app_entity[model.__name__] = _safe_model_count(
                    app_label,
                    model.__name__,
                    school_id=school_id,
                    academic_year_id=academic_year_id,
                    scope_hints=hints.get(key, {}),
                )
            entity_counts[app_label] = app_entity

        # Provide a stable alias for admissions/leads so the frontend/AI layer can depend on it.
        leads = {
            "AdmissionInquiry": _safe_model_count(
                "students",
                "AdmissionInquiry",
                school_id=school_id,
                academic_year_id=academic_year_id,
                scope_hints=hints.get(("students", "AdmissionInquiry"), {"school": "school_id"}),
            )
        }
        entity_counts["leads"] = leads

        inventory["entity_counts"] = entity_counts

    cache.set(cache_key, inventory, timeout=300)  # 5-minute TTL
    return inventory
