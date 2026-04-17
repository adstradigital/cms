from django.utils import timezone
from django.db import transaction
from django.db.models import Count, Sum, Avg, Q, F, Value, IntegerField, Case, When
from decimal import Decimal, InvalidOperation
from datetime import date, timedelta
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    Hostel, Floor, Room, RoomAllotment, RoomTransfer,
    NightAttendance, EntryExitLog, RuleViolation, VisitorLog, HostelFee,
    MessMenuPlan, MessMealAttendance, MessDietProfile, MessFeedback,
    MessInventoryItem, MessInventoryLog, MessVendor, MessVendorSupply,
    MessWastageLog, MessConsumptionLog, MessFoodOrder, StudentHostelPreference
)
from .serializers import (
    HostelSerializer, FloorSerializer, RoomSerializer, RoomAllotmentSerializer,
    RoomTransferSerializer, NightAttendanceSerializer, EntryExitLogSerializer,
    RuleViolationSerializer, VisitorLogSerializer, HostelFeeSerializer,
    MessMenuPlanSerializer, MessMealAttendanceSerializer, MessDietProfileSerializer, MessFeedbackSerializer,
    MessInventoryItemSerializer, MessInventoryLogSerializer, MessVendorSerializer, MessVendorSupplySerializer,
    MessWastageLogSerializer, MessConsumptionLogSerializer, MessFoodOrderSerializer
)
from apps.students.models import Student


# ─── Hostel CRUD ──────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def hostel_list_view(request):
    try:
        if request.method == "GET":
            qs = Hostel.objects.select_related("warden").prefetch_related("rooms").all()
            return Response(HostelSerializer(qs, many=True).data)

        serializer = HostelSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        with transaction.atomic():
            hostel = serializer.save()
            # Auto-create floors
            total_floors = hostel.total_floors
            for i in range(total_floors):
                Floor.objects.get_or_create(hostel=hostel, number=i)
                
        return Response(HostelSerializer(hostel).data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def hostel_detail_view(request, pk):
    try:
        try:
            hostel = Hostel.objects.select_related("warden").get(pk=pk)
        except Hostel.DoesNotExist:
            return Response({"error": "Hostel not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(HostelSerializer(hostel).data)
        if request.method == "PATCH":
            serializer = HostelSerializer(hostel, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()
            return Response(serializer.data)
        hostel.delete()
        return Response({"message": "Hostel deleted."}, status=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── Floor CRUD ───────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def floor_list_view(request):
    try:
        if request.method == "GET":
            hostel_id = request.query_params.get("hostel")
            qs = Floor.objects.select_related("hostel").all()
            if hostel_id:
                qs = qs.filter(hostel_id=hostel_id)
            return Response(FloorSerializer(qs, many=True).data)

        serializer = FloorSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def floor_detail_view(request, pk):
    try:
        try:
            floor = Floor.objects.select_related("hostel").get(pk=pk)
        except Floor.DoesNotExist:
            return Response({"error": "Floor not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(FloorSerializer(floor).data)
        if request.method == "PATCH":
            serializer = FloorSerializer(floor, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()
            return Response(serializer.data)
        floor.delete()
        return Response({"message": "Floor deleted."}, status=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── Room CRUD ────────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def room_list_view(request):
    try:
        if request.method == "GET":
            qs = Room.objects.select_related("hostel", "floor").all()
            hostel_id = request.query_params.get("hostel")
            floor_id = request.query_params.get("floor")
            room_type = request.query_params.get("type")
            room_status = request.query_params.get("status")
            if hostel_id:
                qs = qs.filter(hostel_id=hostel_id)
            if floor_id:
                qs = qs.filter(floor_id=floor_id)
            if room_type:
                qs = qs.filter(room_type=room_type)
            if room_status:
                qs = qs.filter(status=room_status)
            return Response(RoomSerializer(qs, many=True).data)

        serializer = RoomSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def room_detail_view(request, pk):
    try:
        try:
            room = Room.objects.select_related("hostel", "floor").get(pk=pk)
        except Room.DoesNotExist:
            return Response({"error": "Room not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(RoomSerializer(room).data)
        if request.method == "PATCH":
            serializer = RoomSerializer(room, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()
            return Response(serializer.data)
        room.delete()
        return Response({"message": "Room deleted."}, status=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── Allotment ────────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def allotment_list_view(request):
    try:
        if request.method == "GET":
            qs = RoomAllotment.objects.select_related(
                "student", "student__user", "room", "room__hostel", "room__floor", "allotted_by"
            ).all()
            hostel_id = request.query_params.get("hostel")
            active_only = request.query_params.get("active", "true").lower() == "true"
            if active_only:
                qs = qs.filter(is_active=True)
            if hostel_id:
                qs = qs.filter(room__hostel_id=hostel_id)
            return Response(RoomAllotmentSerializer(qs, many=True).data)

        # Validate room availability
        room_id = request.data.get("room")
        try:
            room = Room.objects.get(pk=room_id)
        except Room.DoesNotExist:
            return Response({"error": "Room not found."}, status=status.HTTP_404_NOT_FOUND)
        if room.occupied >= room.capacity:
            return Response({"error": "Room is at full capacity."}, status=status.HTTP_400_BAD_REQUEST)

        # Check if student already has an active allotment
        student_id = request.data.get("student")
        if RoomAllotment.objects.filter(student_id=student_id, is_active=True).exists():
            return Response({"error": "Student already has an active allotment."}, status=status.HTTP_400_BAD_REQUEST)

        existing_allotment = RoomAllotment.objects.filter(student_id=student_id).first()

        with transaction.atomic():
            if existing_allotment:
                # OneToOne relation allows one historical record per student, so reactivate it.
                existing_allotment.room = room
                existing_allotment.allotted_by = request.user
                existing_allotment.join_date = timezone.now().date()
                existing_allotment.leave_date = None
                existing_allotment.is_active = True
                existing_allotment.remarks = request.data.get("remarks", "") or ""
                existing_allotment.save()
                allotment = existing_allotment
            else:
                serializer = RoomAllotmentSerializer(data=request.data)
                if not serializer.is_valid():
                    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                allotment = serializer.save(allotted_by=request.user)

            room.occupied += 1
            room.update_status()
            room.save()
            # Mark student as hostel resident
            Student.objects.filter(pk=student_id).update(hostel_resident=True)

        return Response(RoomAllotmentSerializer(allotment).data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def allotment_detail_view(request, pk):
    try:
        try:
            allotment = RoomAllotment.objects.select_related(
                "student", "student__user", "room", "room__hostel"
            ).get(pk=pk)
        except RoomAllotment.DoesNotExist:
            return Response({"error": "Allotment not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(RoomAllotmentSerializer(allotment).data)

        serializer = RoomAllotmentSerializer(allotment, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def vacate_view(request, pk):
    """Vacate a student's hostel allotment."""
    try:
        try:
            allotment = RoomAllotment.objects.select_related("room", "student").get(pk=pk, is_active=True)
        except RoomAllotment.DoesNotExist:
            return Response({"error": "Active allotment not found."}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            allotment.is_active = False
            allotment.leave_date = timezone.now().date()
            allotment.save()
            room = allotment.room
            room.occupied = max(0, room.occupied - 1)
            room.update_status()
            room.save()
            Student.objects.filter(pk=allotment.student_id).update(hostel_resident=False)

        return Response({"message": "Student vacated successfully."})
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def transfer_list_view(request):
    try:
        if request.method == "GET":
            qs = RoomTransfer.objects.select_related(
                "student", "student__user", "from_room", "from_room__hostel", "to_room", "to_room__hostel", "transferred_by"
            ).all()
            return Response(RoomTransferSerializer(qs, many=True).data)

        # POST: Create Transfer
        student_id = request.data.get("student")
        to_room_id = request.data.get("to_room")
        reason = request.data.get("reason", "")

        try:
            student = Student.objects.get(pk=student_id)
        except Student.DoesNotExist:
            return Response({"error": "Student not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            to_room = Room.objects.get(pk=to_room_id)
        except Room.DoesNotExist:
            return Response({"error": "Destination room not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            active_allotment = RoomAllotment.objects.get(student=student, is_active=True)
            from_room = active_allotment.room
        except RoomAllotment.DoesNotExist:
            return Response({"error": "Student must have an active room allotment to be transferred."}, status=status.HTTP_400_BAD_REQUEST)

        if str(from_room.id) == str(to_room.id):
            return Response({"error": "Destination room cannot be the same as the current room."}, status=status.HTTP_400_BAD_REQUEST)

        if to_room.occupied >= to_room.capacity:
            return Response({"error": "Destination room is at full capacity."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # 1. Update from_room occupancy
            from_room.occupied = max(0, from_room.occupied - 1)
            from_room.update_status()
            from_room.save()

            # 2. Update to_room occupancy
            to_room.occupied += 1
            to_room.update_status()
            to_room.save()

            # 3. Create Transfer Record
            transfer = RoomTransfer.objects.create(
                student=student,
                from_room=from_room,
                to_room=to_room,
                transferred_by=request.user,
                reason=reason,
                transfer_date=timezone.now().date()
            )

            # 4. Update the active Allotment instead of ending it
            active_allotment.room = to_room
            active_allotment.allotted_by = request.user
            active_allotment.save()

        return Response(RoomTransferSerializer(transfer).data, status=status.HTTP_201_CREATED)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def submit_preference_view(request):
    """Allow students to submit friend group and hostel type preferences."""
    try:
        student_id = request.data.get("student")
        preferred_type = request.data.get("preferred_hostel_type", "mixed")
        friend_ids = request.data.get("friend_ids", [])
        
        if not student_id:
            return Response({"error": "Student ID is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        student = Student.objects.get(pk=student_id)
        
        pref, created = StudentHostelPreference.objects.update_or_create(
            student=student,
            defaults={
                "preferred_hostel_type": preferred_type,
                "friend_ids": friend_ids,
                "remarks": request.data.get("remarks", "")
            }
        )
        return Response({"message": "Preferences saved successfully."}, status=status.HTTP_200_OK)
    except Student.DoesNotExist:
        return Response({"error": "Student not found."}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def auto_assign_view(request):
    """
    Intelligent Auto-assign using Hard Rules (Class, Room Gender) and 
    Soft rules (Friend groups, preferred hostel type).
    """
    try:
        student_id = request.data.get("student")

        if not student_id:
            return Response({"error": "Student is required for auto allocation."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            student = Student.objects.select_related(
                "user", "user__profile", "section", "section__school_class", "academic_year"
            ).get(pk=student_id)
        except Student.DoesNotExist:
            return Response({"error": "Student not found."}, status=status.HTTP_404_NOT_FOUND)

        if RoomAllotment.objects.filter(student_id=student_id, is_active=True).exists():
            return Response({"error": "Student already has an active allotment."}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Determine Student Demographics
        student_gender = ""
        if hasattr(student.user, "profile"):
            student_gender = (student.user.profile.gender or "").lower()
            
        if not student_gender:
             return Response({"error": "Student gender is not set in profile."}, status=status.HTTP_400_BAD_REQUEST)
             
        class_name = ""
        if student.section and student.section.school_class:
            class_name = student.section.school_class.name.lower()
            
        if not class_name:
             return Response({"error": "Student class is not set. Required for allocation."}, status=status.HTTP_400_BAD_REQUEST)

        # Grade Junior/Senior Split (Junior: 1-7, LKG, UKG)
        is_junior = "grade 8" not in class_name and "grade 9" not in class_name and "grade 10" not in class_name and "grade 11" not in class_name and "grade 12" not in class_name
        student_category = "junior" if is_junior else "senior"

        # 2. Get Student Preferences (if any)
        preferred_type = "mixed"
        friend_ids = []
        try:
            pref = StudentHostelPreference.objects.get(student=student)
            preferred_type = pref.preferred_hostel_type
            friend_ids = pref.friend_ids
        except StudentHostelPreference.DoesNotExist:
            pass

        # 3. Filter Valid Hostels (Hard Rules)
        hostel_qs = Hostel.objects.filter(is_active=True, category=student_category)
        if student_gender == "male":
            hostel_qs = hostel_qs.filter(gender__in=["boys", "mixed"])
        else:
            hostel_qs = hostel_qs.filter(gender__in=["girls", "mixed"])

        if not hostel_qs.exists():
            return Response({"error": f"No active hostels found for {student_category} {student_gender}s."}, status=status.HTTP_404_NOT_FOUND)

        # Build base room queryset
        available_rooms = Room.objects.filter(
            hostel__in=hostel_qs,
            status__in=["available"],
            occupied__lt=F("capacity")
        ).select_related("hostel")

        # 4. Strict Room Filtering (Hard Rules: Same Class, Same Gender)
        valid_room_ids = []
        best_friend_room = None
        best_class_room = None
        best_empty_room = None
        
        # We process rooms in Python to handle the complex counts reliably
        # (Doing this purely in SQL with annotations can be messy across many relationships)
        available_rooms = list(available_rooms)
        
        # Pre-fetch allotments for these rooms to analyze occupants
        room_ids = [r.id for r in available_rooms]
        active_allotments = list(RoomAllotment.objects.filter(
            is_active=True, 
            room_id__in=room_ids
        ).select_related("student", "student__section__school_class", "student__user__profile"))

        allotments_by_room = {}
        for a in active_allotments:
            allotments_by_room.setdefault(a.room_id, []).append(a)

        scored_rooms = []

        for room in available_rooms:
            occupants = allotments_by_room.get(room.id, [])
            
            # Rule: Empty rooms are always valid
            if not occupants:
                score = 0
                if room.hostel.gender == preferred_type:
                    score += 10 # Preferred hostel type bonus
                scored_rooms.append((score, room))
                continue
                
            # Rule: If occupied, MUST match Gender and Class strictly
            is_valid = True
            friend_count = 0
            
            for occ in occupants:
                # Check Gender
                occ_gender = (occ.student.user.profile.gender or "").lower() if hasattr(occ.student.user, "profile") else ""
                if occ_gender != student_gender:
                    is_valid = False
                    break
                    
                # Check Class
                occ_class = occ.student.section.school_class.name.lower() if (occ.student.section and occ.student.section.school_class) else ""
                if occ_class != class_name:
                    is_valid = False
                    break
                    
                # Count Friends
                if str(occ.student.admission_number) in friend_ids or str(occ.student.id) in friend_ids:
                    friend_count += 1
                    
            if is_valid:
                # Scoring:
                # Priority 1: Friends (+100 per friend)
                # Priority 2: Classmates (Already guaranteed if valid, +50 to prioritize filling partially full class rooms)
                # Priority 3: Preferred Hostel Type (+10)
                score = 50 + (friend_count * 100)
                if room.hostel.gender == preferred_type:
                    score += 10
                    
                scored_rooms.append((score, room))

        if not scored_rooms:
             return Response({"error": "No available rooms match the strict class/gender rules."}, status=status.HTTP_404_NOT_FOUND)

        # Sort by score descending
        scored_rooms.sort(key=lambda x: x[0], reverse=True)
        chosen_room = scored_rooms[0][1]

        # Process Allocation
        existing_allotment = RoomAllotment.objects.filter(student_id=student_id).first()

        with transaction.atomic():
            if existing_allotment:
                existing_allotment.room = chosen_room
                existing_allotment.allotted_by = request.user
                existing_allotment.join_date = timezone.now().date()
                existing_allotment.leave_date = None
                existing_allotment.is_active = True
                existing_allotment.remarks = request.data.get("remarks", "") or ""
                existing_allotment.save()
                allotment = existing_allotment
            else:
                allotment = RoomAllotment.objects.create(
                    student_id=student_id,
                    room=chosen_room,
                    allotted_by=request.user,
                    join_date=timezone.now().date(),
                )

            chosen_room.occupied += 1
            chosen_room.update_status()
            chosen_room.save()
            Student.objects.filter(pk=student_id).update(hostel_resident=True)

        return Response(RoomAllotmentSerializer(allotment).data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── Room Transfer ────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def transfer_list_view(request):
    try:
        if request.method == "GET":
            qs = RoomTransfer.objects.select_related(
                "student", "student__user", "from_room", "to_room", "transferred_by"
            ).all()
            student_id = request.query_params.get("student")
            if student_id:
                qs = qs.filter(student_id=student_id)
            return Response(RoomTransferSerializer(qs, many=True).data)

        student_id = request.data.get("student")
        to_room_id = request.data.get("to_room")

        try:
            to_room = Room.objects.get(pk=to_room_id)
        except Room.DoesNotExist:
            return Response({"error": "Target room not found."}, status=status.HTTP_404_NOT_FOUND)
        if to_room.occupied >= to_room.capacity:
            return Response({"error": "Target room is full."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            allotment = RoomAllotment.objects.select_related("room").get(
                student_id=student_id, is_active=True
            )
        except RoomAllotment.DoesNotExist:
            return Response({"error": "Student has no active allotment."}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            old_room = allotment.room
            transfer = RoomTransfer.objects.create(
                student_id=student_id,
                from_room=old_room,
                to_room=to_room,
                reason=request.data.get("reason", ""),
                transfer_date=timezone.now().date(),
                transferred_by=request.user,
            )
            old_room.occupied = max(0, old_room.occupied - 1)
            old_room.update_status()
            old_room.save()
            allotment.room = to_room
            allotment.save()
            to_room.occupied += 1
            to_room.update_status()
            to_room.save()

        return Response(RoomTransferSerializer(transfer).data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── Night Attendance ─────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def night_attendance_list_view(request):
    try:
        if request.method == "GET":
            date_str = request.query_params.get("date")
            hostel_id = request.query_params.get("hostel")
            qs = NightAttendance.objects.select_related(
                "student", "student__user", "room", "room__hostel", "marked_by"
            ).all()
            if date_str:
                qs = qs.filter(date=date_str)
            if hostel_id:
                qs = qs.filter(room__hostel_id=hostel_id)
            return Response(NightAttendanceSerializer(qs, many=True).data)

        # Bulk mark attendance
        records = request.data if isinstance(request.data, list) else [request.data]
        created = []
        for rec in records:
            rec["marked_by"] = request.user.pk
            obj, _ = NightAttendance.objects.update_or_create(
                student_id=rec.get("student"),
                date=rec.get("date", timezone.now().date()),
                defaults={
                    "room_id": rec.get("room"),
                    "status": rec.get("status", "present"),
                    "marked_by": request.user,
                    "remarks": rec.get("remarks", ""),
                }
            )
            created.append(obj)
        return Response(NightAttendanceSerializer(created, many=True).data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── Entry / Exit Log ─────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def entry_exit_list_view(request):
    try:
        if request.method == "GET":
            qs = EntryExitLog.objects.select_related(
                "student", "student__user", "logged_by"
            ).all()
            student_id = request.query_params.get("student")
            direction = request.query_params.get("direction")
            date_str = request.query_params.get("date")
            if student_id:
                qs = qs.filter(student_id=student_id)
            if direction:
                qs = qs.filter(direction=direction)
            if date_str:
                qs = qs.filter(timestamp__date=date_str)
            return Response(EntryExitLogSerializer(qs, many=True).data)

        serializer = EntryExitLogSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(logged_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── Rule Violation ───────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def violation_list_view(request):
    try:
        if request.method == "GET":
            qs = RuleViolation.objects.select_related(
                "student", "student__user", "reported_by", "resolved_by"
            ).all()
            hostel_id = request.query_params.get("hostel")
            viol_status = request.query_params.get("status")
            severity = request.query_params.get("severity")
            if hostel_id:
                qs = qs.filter(student__hostel_allotment__room__hostel_id=hostel_id)
            if viol_status:
                qs = qs.filter(status=viol_status)
            if severity:
                qs = qs.filter(severity=severity)
            return Response(RuleViolationSerializer(qs, many=True).data)

        serializer = RuleViolationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(reported_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def violation_detail_view(request, pk):
    try:
        try:
            violation = RuleViolation.objects.get(pk=pk)
        except RuleViolation.DoesNotExist:
            return Response({"error": "Violation not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(RuleViolationSerializer(violation).data)

        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        if data.get("status") == "resolved" and not violation.resolved_by_id:
            violation.resolved_by = request.user
            violation.save(update_fields=["resolved_by"])
        serializer = RuleViolationSerializer(violation, data=data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── Visitor Log ──────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def visitor_list_view(request):
    try:
        if request.method == "GET":
            qs = VisitorLog.objects.select_related(
                "student", "student__user", "approved_by"
            ).all()
            student_id = request.query_params.get("student")
            appr_status = request.query_params.get("status")
            date_str = request.query_params.get("date")
            if student_id:
                qs = qs.filter(student_id=student_id)
            if appr_status:
                qs = qs.filter(approval_status=appr_status)
            if date_str:
                qs = qs.filter(check_in__date=date_str)
            return Response(VisitorLogSerializer(qs, many=True).data)

        serializer = VisitorLogSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def visitor_detail_view(request, pk):
    try:
        try:
            visitor = VisitorLog.objects.select_related("student", "student__user", "approved_by").get(pk=pk)
        except VisitorLog.DoesNotExist:
            return Response({"error": "Visitor log not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(VisitorLogSerializer(visitor).data)

        serializer = VisitorLogSerializer(visitor, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def visitor_approve_view(request, pk):
    """Approve or deny a visitor."""
    try:
        try:
            visitor = VisitorLog.objects.get(pk=pk)
        except VisitorLog.DoesNotExist:
            return Response({"error": "Visitor log not found."}, status=status.HTTP_404_NOT_FOUND)

        decision = request.data.get("decision")
        if decision not in ("approved", "denied"):
            return Response({"error": "decision must be 'approved' or 'denied'."}, status=status.HTTP_400_BAD_REQUEST)

        visitor.approval_status = decision
        visitor.approved_by = request.user
        visitor.save(update_fields=["approval_status", "approved_by"])
        return Response(VisitorLogSerializer(visitor).data)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def visitor_checkout_view(request, pk):
    """Record visitor check-out time."""
    try:
        try:
            visitor = VisitorLog.objects.get(pk=pk)
        except VisitorLog.DoesNotExist:
            return Response({"error": "Visitor log not found."}, status=status.HTTP_404_NOT_FOUND)
        visitor.check_out = timezone.now()
        visitor.save(update_fields=["check_out"])
        return Response(VisitorLogSerializer(visitor).data)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── Hostel Fee ───────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def hostel_fee_list_view(request):
    try:
        def parse_amount(raw_value, default="0"):
            if raw_value is None or raw_value == "":
                raw_value = default
            try:
                return Decimal(str(raw_value))
            except (InvalidOperation, TypeError, ValueError):
                raise ValueError(f"Invalid amount value: {raw_value}")

        if request.method == "GET":
            qs = HostelFee.objects.select_related(
                "student", "student__user", "room", "room__hostel", "collected_by"
            ).all()
            hostel_id = request.query_params.get("hostel")
            fee_status = request.query_params.get("status")
            student_id = request.query_params.get("student")
            room_id = request.query_params.get("room")
            if hostel_id:
                qs = qs.filter(room__hostel_id=hostel_id)
            if fee_status:
                qs = qs.filter(status=fee_status)
            if student_id:
                qs = qs.filter(student_id=student_id)
            if room_id:
                qs = qs.filter(room_id=room_id)
            return Response(HostelFeeSerializer(qs, many=True).data)

        payload = request.data.copy() if hasattr(request.data, "copy") else dict(request.data)
        student_id = payload.get("student")
        period_label = payload.get("period_label")
        due_date = payload.get("due_date")
        room_id = payload.get("room")

        if not student_id:
            return Response({"error": "student is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not period_label:
            return Response({"error": "period_label is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not due_date:
            return Response({"error": "due_date is required."}, status=status.HTTP_400_BAD_REQUEST)

        if HostelFee.objects.filter(student_id=student_id, period_label=period_label).exists():
            return Response(
                {"error": "A hostel fee bill for this student and period already exists."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if room_id:
            try:
                room = Room.objects.get(pk=room_id)
            except Room.DoesNotExist:
                return Response({"error": "Room not found."}, status=status.HTTP_404_NOT_FOUND)
        else:
            try:
                allotment = RoomAllotment.objects.select_related("room").get(student_id=student_id, is_active=True)
            except RoomAllotment.DoesNotExist:
                return Response(
                    {"error": "Student has no active room allotment. Room is required."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            room = allotment.room
            payload["room"] = room.pk

        try:
            room_rent = parse_amount(payload.get("room_rent"), default=str(room.monthly_rent))
            electricity = parse_amount(payload.get("electricity_charges"), default="0")
            mess_fee = parse_amount(payload.get("mess_fee"), default="0")
            amount_due = parse_amount(
                payload.get("amount_due"),
                default=str(room_rent + electricity + mess_fee)
            )
            amount_paid = parse_amount(payload.get("amount_paid"), default="0")
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        if any(value < 0 for value in [room_rent, electricity, mess_fee, amount_due, amount_paid]):
            return Response({"error": "Amounts cannot be negative."}, status=status.HTTP_400_BAD_REQUEST)

        payload["room_rent"] = str(room_rent)
        payload["electricity_charges"] = str(electricity)
        payload["mess_fee"] = str(mess_fee)
        payload["amount_due"] = str(amount_due)
        payload["amount_paid"] = str(amount_paid)

        if amount_paid >= amount_due and amount_due > 0:
            payload["status"] = "paid"
        elif amount_paid > 0:
            payload["status"] = "partial"

        serializer = HostelFeeSerializer(data=payload)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def hostel_fee_pay_view(request, pk):
    """Record a payment against a hostel fee record."""
    try:
        try:
            fee = HostelFee.objects.get(pk=pk)
        except HostelFee.DoesNotExist:
            return Response({"error": "Fee record not found."}, status=status.HTTP_404_NOT_FOUND)

        amount = float(request.data.get("amount_paid", 0))
        payment_method = request.data.get("payment_method", "cash")
        transaction_id = request.data.get("transaction_id", "")

        fee.amount_paid = float(fee.amount_paid) + amount
        fee.payment_method = payment_method
        fee.transaction_id = transaction_id
        fee.payment_date = timezone.now().date()
        fee.collected_by = request.user

        if fee.amount_paid >= float(fee.amount_due):
            fee.status = "paid"
        elif fee.amount_paid > 0:
            fee.status = "partial"

        fee.save()
        return Response(HostelFeeSerializer(fee).data)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── Analytics Dashboard ──────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def hostel_analytics_view(request):
    """Aggregate stats for the hostel dashboard."""
    try:
        hostel_id = request.query_params.get("hostel")

        rooms_qs = Room.objects.all()
        allotments_qs = RoomAllotment.objects.filter(is_active=True)
        violations_qs = RuleViolation.objects.all()
        visitors_qs = VisitorLog.objects.all()
        fees_qs = HostelFee.objects.all()

        if hostel_id:
            rooms_qs = rooms_qs.filter(hostel_id=hostel_id)
            allotments_qs = allotments_qs.filter(room__hostel_id=hostel_id)
            violations_qs = violations_qs.filter(
                student__hostel_allotment__room__hostel_id=hostel_id
            )
            visitors_qs = visitors_qs.filter(
                student__hostel_allotment__room__hostel_id=hostel_id
            )
            fees_qs = fees_qs.filter(room__hostel_id=hostel_id)

        total_rooms = rooms_qs.count()
        total_capacity = rooms_qs.aggregate(t=Sum("capacity"))["t"] or 0
        total_occupied = rooms_qs.aggregate(t=Sum("occupied"))["t"] or 0
        available_rooms = rooms_qs.filter(status="available").count()
        full_rooms = rooms_qs.filter(status="full").count()
        maintenance_rooms = rooms_qs.filter(status="maintenance").count()

        today = timezone.now().date()
        present_today = NightAttendance.objects.filter(date=today, status="present").count()
        absent_today = NightAttendance.objects.filter(date=today, status="absent").count()

        total_fees_due = fees_qs.aggregate(t=Sum("amount_due"))["t"] or 0
        total_fees_collected = fees_qs.aggregate(t=Sum("amount_paid"))["t"] or 0
        pending_fees = fees_qs.filter(status="pending").count()
        overdue_fees = fees_qs.filter(status="overdue").count()

        open_violations = violations_qs.filter(status="open").count()
        pending_visitors = visitors_qs.filter(approval_status="pending").count()

        # Room type breakdown
        room_type_breakdown = list(
            rooms_qs.values("room_type").annotate(count=Count("id"), occupied=Sum("occupied"))
        )

        # Occupancy by hostel
        hostel_stats = list(
            Hostel.objects.filter(is_active=True).values("id", "name").annotate(
                total_rooms=Count("rooms"),
                total_cap=Sum("rooms__capacity"),
                total_occ=Sum("rooms__occupied"),
            )
        )

        return Response({
            "summary": {
                "total_rooms": total_rooms,
                "total_capacity": total_capacity,
                "total_occupied": total_occupied,
                "available_rooms": available_rooms,
                "full_rooms": full_rooms,
                "maintenance_rooms": maintenance_rooms,
                "occupancy_rate": round((total_occupied / total_capacity * 100) if total_capacity else 0, 1),
            },
            "attendance_today": {
                "present": present_today,
                "absent": absent_today,
            },
            "fees": {
                "total_due": float(total_fees_due),
                "total_collected": float(total_fees_collected),
                "pending_count": pending_fees,
                "overdue_count": overdue_fees,
                "collection_rate": round((float(total_fees_collected) / float(total_fees_due) * 100) if total_fees_due else 0, 1),
            },
            "alerts": {
                "open_violations": open_violations,
                "pending_visitors": pending_visitors,
            },
            "room_type_breakdown": room_type_breakdown,
            "hostel_stats": hostel_stats,
        })
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Mess Module APIs

def _resolve_month_range(month_str):
    try:
        year, month = month_str.split("-")
        year = int(year)
        month = int(month)
        start_date = date(year, month, 1)
    except Exception:
        return None, None

    if month == 12:
        end_date = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        end_date = date(year, month + 1, 1) - timedelta(days=1)
    return start_date, end_date


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def mess_menu_list_view(request):
    try:
        if request.method == "GET":
            qs = MessMenuPlan.objects.select_related("hostel", "created_by").all()
            hostel_id = request.query_params.get("hostel")
            start_date = request.query_params.get("start_date")
            end_date = request.query_params.get("end_date")
            meal_type = request.query_params.get("meal_type")

            if hostel_id:
                qs = qs.filter(hostel_id=hostel_id)
            if start_date:
                qs = qs.filter(plan_date__gte=start_date)
            if end_date:
                qs = qs.filter(plan_date__lte=end_date)
            if meal_type:
                qs = qs.filter(meal_type=meal_type)
            return Response(MessMenuPlanSerializer(qs, many=True).data)

        serializer = MessMenuPlanSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        obj = serializer.save(created_by=request.user)
        return Response(MessMenuPlanSerializer(obj).data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "PUT", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def mess_menu_detail_view(request, pk):
    try:
        obj = MessMenuPlan.objects.get(pk=pk)
        if request.method == "GET":
            return Response(MessMenuPlanSerializer(obj).data)
        elif request.method in ["PUT", "PATCH"]:
            serializer = MessMenuPlanSerializer(obj, data=request.data, partial=(request.method == "PATCH"))
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        elif request.method == "DELETE":
            obj.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
    except MessMenuPlan.DoesNotExist:
        return Response({"error": "Menu plan not found"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mess_menu_bulk_upsert_view(request):
    try:
        data_list = request.data
        if not isinstance(data_list, list):
            return Response({"error": "Expected a list of menu plans."}, status=status.HTTP_400_BAD_REQUEST)

        results = []
        for item in data_list:
            hostel_id = item.get("hostel")
            plan_date = item.get("plan_date")
            meal_type = item.get("meal_type")

            if not all([hostel_id, plan_date, meal_type]):
                continue

            obj, created = MessMenuPlan.objects.update_or_create(
                hostel_id=hostel_id,
                plan_date=plan_date,
                meal_type=meal_type,
                defaults={
                    "items": item.get("items", ""),
                    "notes": item.get("notes", ""),
                    "created_by": request.user,
                },
            )
            results.append(MessMenuPlanSerializer(obj).data)

        return Response(results, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def mess_attendance_list_view(request):
    try:
        if request.method == "GET":
            qs = MessMealAttendance.objects.select_related(
                "hostel", "student", "student__user", "marked_by"
            ).all()
            hostel_id = request.query_params.get("hostel")
            student_id = request.query_params.get("student")
            start_date = request.query_params.get("start_date")
            end_date = request.query_params.get("end_date")
            meal_type = request.query_params.get("meal_type")

            if hostel_id:
                qs = qs.filter(hostel_id=hostel_id)
            if student_id:
                qs = qs.filter(student_id=student_id)
            if start_date:
                qs = qs.filter(date__gte=start_date)
            if end_date:
                qs = qs.filter(date__lte=end_date)
            if meal_type:
                qs = qs.filter(meal_type=meal_type)

            return Response(MessMealAttendanceSerializer(qs, many=True).data)

        records = request.data if isinstance(request.data, list) else [request.data]
        saved_rows = []

        with transaction.atomic():
            for rec in records:
                student_id = rec.get("student")
                meal_type = rec.get("meal_type")
                if not student_id or not meal_type:
                    return Response(
                        {"error": "student and meal_type are required."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                hostel_id = rec.get("hostel")
                if not hostel_id:
                    active_allotment = RoomAllotment.objects.filter(
                        student_id=student_id, is_active=True
                    ).select_related("room", "room__hostel").first()
                    if active_allotment:
                        hostel_id = active_allotment.room.hostel_id

                if not hostel_id:
                    return Response(
                        {"error": "hostel is required or student must have active allotment."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                defaults = {
                    "hostel_id": hostel_id,
                    "status": rec.get("status", "ate"),
                    "remarks": rec.get("remarks", ""),
                    "marked_by": request.user,
                }

                obj, _ = MessMealAttendance.objects.update_or_create(
                    student_id=student_id,
                    date=rec.get("date", timezone.now().date()),
                    meal_type=meal_type,
                    defaults=defaults,
                )
                saved_rows.append(obj)

        return Response(MessMealAttendanceSerializer(saved_rows, many=True).data)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def mess_diet_profile_list_view(request):
    try:
        if request.method == "GET":
            qs = MessDietProfile.objects.select_related(
                "student",
                "student__user",
                "student__hostel_allotment__room__hostel",
            ).all()
            hostel_id = request.query_params.get("hostel")
            student_id = request.query_params.get("student")
            if hostel_id:
                qs = qs.filter(
                    student__hostel_allotment__room__hostel_id=hostel_id,
                    student__hostel_allotment__is_active=True,
                )
            if student_id:
                qs = qs.filter(student_id=student_id)
            return Response(MessDietProfileSerializer(qs, many=True).data)

        student_id = request.data.get("student")
        if not student_id:
            return Response({"error": "student is required."}, status=status.HTTP_400_BAD_REQUEST)

        existing = MessDietProfile.objects.filter(student_id=student_id).first()
        serializer = MessDietProfileSerializer(existing, data=request.data, partial=bool(existing))
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        obj = serializer.save()
        status_code = status.HTTP_200_OK if existing else status.HTTP_201_CREATED
        return Response(MessDietProfileSerializer(obj).data, status=status_code)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def mess_diet_profile_detail_view(request, pk):
    try:
        try:
            profile = MessDietProfile.objects.select_related("student", "student__user").get(pk=pk)
        except MessDietProfile.DoesNotExist:
            return Response({"error": "Diet profile not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(MessDietProfileSerializer(profile).data)

        if request.method == "PATCH":
            serializer = MessDietProfileSerializer(profile, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()
            return Response(serializer.data)

        profile.delete()
        return Response({"message": "Diet profile deleted."}, status=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "POST", "DELETE"])
@permission_classes([IsAuthenticated])
def mess_feedback_list_view(request):
    try:
        if request.method in ("GET", "DELETE"):
            qs = MessFeedback.objects.all()
            hostel_id = request.query_params.get("hostel")
            feedback_status = request.query_params.get("status")
            meal_type = request.query_params.get("meal_type")
            start_date = request.query_params.get("start_date")
            end_date = request.query_params.get("end_date")

            if hostel_id:
                qs = qs.filter(hostel_id=hostel_id)
            if feedback_status:
                qs = qs.filter(status=feedback_status)
            if meal_type:
                qs = qs.filter(meal_type=meal_type)
            if start_date:
                qs = qs.filter(date__gte=start_date)
            if end_date:
                qs = qs.filter(date__lte=end_date)
            if request.method == "GET":
                qs = qs.select_related("hostel", "student", "student__user")
                return Response(MessFeedbackSerializer(qs, many=True).data)

            if not any([hostel_id, feedback_status, meal_type, start_date, end_date]):
                return Response(
                    {"error": "At least one filter is required to delete feedback."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            deleted_count = qs.count()
            qs.delete()
            return Response({"deleted": deleted_count}, status=status.HTTP_200_OK)

        payload = request.data.copy() if hasattr(request.data, "copy") else dict(request.data)
        if not payload.get("hostel") and payload.get("student"):
            active_allotment = RoomAllotment.objects.filter(
                student_id=payload.get("student"), is_active=True
            ).select_related("room").first()
            if active_allotment:
                payload["hostel"] = active_allotment.room.hostel_id

        serializer = MessFeedbackSerializer(data=payload)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        obj = serializer.save()
        return Response(MessFeedbackSerializer(obj).data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def mess_feedback_detail_view(request, pk):
    try:
        try:
            feedback = MessFeedback.objects.get(pk=pk)
        except MessFeedback.DoesNotExist:
            return Response({"error": "Feedback not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(MessFeedbackSerializer(feedback).data)

        if request.method == "DELETE":
            feedback.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        serializer = MessFeedbackSerializer(feedback, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def mess_inventory_item_list_view(request):
    try:
        if request.method == "GET":
            qs = MessInventoryItem.objects.select_related("hostel").all()
            hostel_id = request.query_params.get("hostel")
            low_stock = request.query_params.get("low_stock")
            if hostel_id:
                qs = qs.filter(hostel_id=hostel_id)
            if str(low_stock).lower() == "true":
                qs = qs.filter(current_stock__lte=F("minimum_stock"))
            return Response(MessInventoryItemSerializer(qs, many=True).data)

        serializer = MessInventoryItemSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        obj = serializer.save()
        return Response(MessInventoryItemSerializer(obj).data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def mess_inventory_log_list_view(request):
    try:
        if request.method == "GET":
            qs = MessInventoryLog.objects.select_related("item", "item__hostel", "logged_by").all()
            hostel_id = request.query_params.get("hostel")
            item_id = request.query_params.get("item")
            if hostel_id:
                qs = qs.filter(item__hostel_id=hostel_id)
            if item_id:
                qs = qs.filter(item_id=item_id)
            return Response(MessInventoryLogSerializer(qs, many=True).data)

        serializer = MessInventoryLogSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            obj = serializer.save(logged_by=request.user)
            item = obj.item
            quantity = Decimal(str(obj.quantity or 0))
            stock = Decimal(str(item.current_stock or 0))

            if obj.log_type == "in":
                stock += quantity
            elif obj.log_type == "out":
                stock -= quantity
            else:
                stock = quantity

            if stock < 0:
                stock = Decimal("0")

            item.current_stock = stock
            item.save(update_fields=["current_stock", "updated_at"])

        return Response(MessInventoryLogSerializer(obj).data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def mess_vendor_list_view(request):
    try:
        if request.method == "GET":
            qs = MessVendor.objects.select_related("hostel").all()
            hostel_id = request.query_params.get("hostel")
            if hostel_id:
                qs = qs.filter(hostel_id=hostel_id)
            return Response(MessVendorSerializer(qs, many=True).data)

        serializer = MessVendorSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        obj = serializer.save()
        return Response(MessVendorSerializer(obj).data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def mess_vendor_supply_list_view(request):
    try:
        if request.method == "GET":
            qs = MessVendorSupply.objects.select_related("hostel", "vendor").all()
            hostel_id = request.query_params.get("hostel")
            vendor_id = request.query_params.get("vendor")
            payment_status = request.query_params.get("payment_status")
            if hostel_id:
                qs = qs.filter(hostel_id=hostel_id)
            if vendor_id:
                qs = qs.filter(vendor_id=vendor_id)
            if payment_status:
                qs = qs.filter(payment_status=payment_status)
            return Response(MessVendorSupplySerializer(qs, many=True).data)

        serializer = MessVendorSupplySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        obj = serializer.save()
        return Response(MessVendorSupplySerializer(obj).data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def mess_vendor_supply_detail_view(request, pk):
    try:
        try:
            supply = MessVendorSupply.objects.get(pk=pk)
        except MessVendorSupply.DoesNotExist:
            return Response({"error": "Supply record not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(MessVendorSupplySerializer(supply).data)
        if request.method == "PATCH":
            serializer = MessVendorSupplySerializer(supply, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()
            return Response(serializer.data)
        supply.delete()
        return Response({"message": "Supply record deleted."}, status=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def mess_wastage_list_view(request):
    try:
        if request.method == "GET":
            qs = MessWastageLog.objects.select_related("hostel", "recorded_by").all()
            hostel_id = request.query_params.get("hostel")
            date_filter = request.query_params.get("date")
            meal_type = request.query_params.get("meal_type")
            if hostel_id:
                qs = qs.filter(hostel_id=hostel_id)
            if date_filter:
                qs = qs.filter(date=date_filter)
            if meal_type:
                qs = qs.filter(meal_type=meal_type)
            return Response(MessWastageLogSerializer(qs, many=True).data)

        serializer = MessWastageLogSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        obj = serializer.save(recorded_by=request.user)
        return Response(MessWastageLogSerializer(obj).data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def mess_wastage_detail_view(request, pk):
    try:
        try:
            log = MessWastageLog.objects.get(pk=pk)
        except MessWastageLog.DoesNotExist:
            return Response({"error": "Wastage log not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(MessWastageLogSerializer(log).data)
        if request.method == "PATCH":
            serializer = MessWastageLogSerializer(log, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()
            return Response(serializer.data)
        log.delete()
        return Response({"message": "Wastage log deleted."}, status=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def mess_consumption_list_view(request):
    try:
        if request.method == "GET":
            qs = MessConsumptionLog.objects.select_related("hostel", "recorded_by").all()
            hostel_id = request.query_params.get("hostel")
            date_filter = request.query_params.get("date")
            meal_type = request.query_params.get("meal_type")
            if hostel_id:
                qs = qs.filter(hostel_id=hostel_id)
            if date_filter:
                qs = qs.filter(date=date_filter)
            if meal_type:
                qs = qs.filter(meal_type=meal_type)
            return Response(MessConsumptionLogSerializer(qs, many=True).data)

        serializer = MessConsumptionLogSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        obj = serializer.save(recorded_by=request.user)
        return Response(MessConsumptionLogSerializer(obj).data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def mess_consumption_detail_view(request, pk):
    try:
        try:
            log = MessConsumptionLog.objects.get(pk=pk)
        except MessConsumptionLog.DoesNotExist:
            return Response({"error": "Consumption log not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(MessConsumptionLogSerializer(log).data)
        if request.method == "PATCH":
            serializer = MessConsumptionLogSerializer(log, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()
            return Response(serializer.data)
        log.delete()
        return Response({"message": "Consumption log deleted."}, status=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def mess_student_cost_view(request):
    try:
        hostel_id = request.query_params.get("hostel")
        month_label = request.query_params.get("month") or timezone.now().strftime("%Y-%m")
        month_start, month_end = _resolve_month_range(month_label)
        if not month_start:
            return Response({"error": "Invalid month format. Use YYYY-MM."}, status=status.HTTP_400_BAD_REQUEST)

        supply_qs = MessVendorSupply.objects.filter(supply_date__range=(month_start, month_end))
        attendance_qs = MessMealAttendance.objects.filter(date__range=(month_start, month_end), status="ate")

        if hostel_id:
            supply_qs = supply_qs.filter(hostel_id=hostel_id)
            attendance_qs = attendance_qs.filter(hostel_id=hostel_id)

        total_cost = supply_qs.aggregate(total=Sum("amount"))["total"] or Decimal("0")
        meal_rows = list(
            attendance_qs.values(
                "student_id",
                "student__admission_number",
                "student__user__first_name",
                "student__user__last_name",
            ).annotate(meal_count=Count("id")).order_by("-meal_count")
        )

        total_meals = sum(int(row["meal_count"]) for row in meal_rows)
        per_meal_cost = (Decimal(total_cost) / Decimal(total_meals)) if total_meals else Decimal("0")

        student_costs = []
        if total_meals:
            for row in meal_rows:
                full_name = f"{row.get('student__user__first_name', '')} {row.get('student__user__last_name', '')}".strip()
                cost_value = per_meal_cost * Decimal(int(row["meal_count"]))
                student_costs.append({
                    "student": row["student_id"],
                    "student_name": full_name,
                    "student_admission": row.get("student__admission_number", ""),
                    "meals_taken": int(row["meal_count"]),
                    "estimated_cost": round(float(cost_value), 2),
                })
        else:
            student_qs = Student.objects.filter(hostel_allotment__is_active=True).select_related("user")
            if hostel_id:
                student_qs = student_qs.filter(hostel_allotment__room__hostel_id=hostel_id)
            count = student_qs.count()
            per_student_cost = (Decimal(total_cost) / Decimal(count)) if count else Decimal("0")
            for st in student_qs:
                student_costs.append({
                    "student": st.pk,
                    "student_name": st.user.get_full_name(),
                    "student_admission": st.admission_number,
                    "meals_taken": 0,
                    "estimated_cost": round(float(per_student_cost), 2),
                })

        return Response({
            "month": month_label,
            "total_food_cost": round(float(total_cost), 2),
            "total_meals_counted": total_meals,
            "per_meal_cost": round(float(per_meal_cost), 2),
            "student_costs": student_costs,
        })
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def mess_analytics_view(request):
    try:
        hostel_id = request.query_params.get("hostel")
        month_label = request.query_params.get("month") or timezone.now().strftime("%Y-%m")
        month_start, month_end = _resolve_month_range(month_label)
        if not month_start:
            return Response({"error": "Invalid month format. Use YYYY-MM."}, status=status.HTTP_400_BAD_REQUEST)

        menu_qs = MessMenuPlan.objects.filter(plan_date__range=(month_start, month_end))
        attendance_qs = MessMealAttendance.objects.filter(date__range=(month_start, month_end))
        profile_qs = MessDietProfile.objects.select_related("student", "student__hostel_allotment__room")
        feedback_qs = MessFeedback.objects.filter(date__range=(month_start, month_end))
        inventory_qs = MessInventoryItem.objects.all()
        supply_qs = MessVendorSupply.objects.filter(supply_date__range=(month_start, month_end))
        wastage_qs = MessWastageLog.objects.filter(date__range=(month_start, month_end))
        consumption_qs = MessConsumptionLog.objects.filter(date__range=(month_start, month_end))

        if hostel_id:
            menu_qs = menu_qs.filter(hostel_id=hostel_id)
            attendance_qs = attendance_qs.filter(hostel_id=hostel_id)
            profile_qs = profile_qs.filter(student__hostel_allotment__room__hostel_id=hostel_id)
            feedback_qs = feedback_qs.filter(hostel_id=hostel_id)
            inventory_qs = inventory_qs.filter(hostel_id=hostel_id)
            supply_qs = supply_qs.filter(hostel_id=hostel_id)
            wastage_qs = wastage_qs.filter(hostel_id=hostel_id)
            consumption_qs = consumption_qs.filter(hostel_id=hostel_id)

        total_ate = attendance_qs.filter(status="ate").count()
        total_skipped = attendance_qs.filter(status="skipped").count()
        total_records = total_ate + total_skipped

        low_stock_items = list(
            inventory_qs.filter(current_stock__lte=F("minimum_stock")).values(
                "id", "name", "current_stock", "minimum_stock", "unit"
            )
        )

        vendor_spend = list(
            supply_qs.values("vendor__name").annotate(total=Sum("amount")).order_by("-total")
        )
        meal_consumption = list(
            consumption_qs.values("meal_type").annotate(total_qty=Sum("quantity")).order_by("meal_type")
        )
        meal_wastage = list(
            wastage_qs.values("meal_type").annotate(total_qty=Sum("quantity")).order_by("meal_type")
        )
        diet_distribution = list(
            profile_qs.values("preference").annotate(count=Count("id")).order_by("-count")
        )

        total_food_cost = supply_qs.aggregate(total=Sum("amount"))["total"] or Decimal("0")

        return Response({
            "month": month_label,
            "menu": {
                "total_plans": menu_qs.count(),
            },
            "attendance": {
                "ate": total_ate,
                "skipped": total_skipped,
                "attendance_rate": round((total_ate / total_records * 100) if total_records else 0, 2),
            },
            "dietary": {
                "preferences": diet_distribution,
                "allergy_profiles_count": profile_qs.exclude(allergies="").count(),
            },
            "feedback": {
                "average_rating": round(float(feedback_qs.aggregate(avg=Avg("rating"))["avg"] or 0), 2),
                "open_complaints": feedback_qs.filter(status="open").count(),
                "total_feedback": feedback_qs.count(),
            },
            "inventory": {
                "total_items": inventory_qs.count(),
                "low_stock_count": len(low_stock_items),
                "low_stock_items": low_stock_items,
            },
            "vendor": {
                "total_spend": round(float(total_food_cost), 2),
                "pending_payments": supply_qs.filter(payment_status="pending").count(),
                "vendor_spend": vendor_spend,
            },
            "wastage": {
                "total_wastage_qty": round(float(wastage_qs.aggregate(total=Sum("quantity"))["total"] or 0), 2),
                "meal_wastage": meal_wastage,
            },
            "consumption": {
                "total_consumption_qty": round(float(consumption_qs.aggregate(total=Sum("quantity"))["total"] or 0), 2),
                "meal_consumption": meal_consumption,
            },
        })
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def mess_food_order_list_view(request):
    try:
        if request.method == "GET":
            qs = MessFoodOrder.objects.select_related("hostel", "student", "student__user").all()
            hostel_id = request.query_params.get("hostel")
            student_id = request.query_params.get("student")
            order_status = request.query_params.get("status")
            if hostel_id:
                qs = qs.filter(hostel_id=hostel_id)
            if student_id:
                qs = qs.filter(student_id=student_id)
            if order_status:
                qs = qs.filter(status=order_status)
            return Response(MessFoodOrderSerializer(qs, many=True).data)

        serializer = MessFoodOrderSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        obj = serializer.save()
        return Response(MessFoodOrderSerializer(obj).data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def mess_food_order_detail_view(request, pk):
    try:
        try:
            order = MessFoodOrder.objects.get(pk=pk)
        except MessFoodOrder.DoesNotExist:
            return Response({"error": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(MessFoodOrderSerializer(order).data)
        if request.method == "PATCH":
            serializer = MessFoodOrderSerializer(order, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()
            return Response(serializer.data)
        order.delete()
        return Response({"message": "Order deleted."}, status=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
