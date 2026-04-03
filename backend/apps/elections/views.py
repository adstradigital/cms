from django.db import IntegrityError, transaction
from django.db.models import Count
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.students.models import Student, Section
from .models import Election, Candidate, Vote
from .serializers import ElectionSerializer, ElectionCreateSerializer, VoteSerializer


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def election_list_view(request):
    try:
        if request.method == "GET":
            section_id = request.query_params.get("section")
            qs = Election.objects.select_related("section", "section__school_class").prefetch_related("candidates").all()
            if section_id:
                qs = qs.filter(section_id=section_id)
            return Response(ElectionSerializer(qs, many=True).data, status=status.HTTP_200_OK)

        serializer = ElectionCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        try:
            section = Section.objects.select_related("school_class").get(pk=data["section"])
        except Section.DoesNotExist:
            return Response({"error": "Section not found."}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            election = Election.objects.create(
                section=section,
                title=data["title"],
                role=data.get("role") or "Class Leader",
                status="ongoing",
                created_by=request.user,
            )
            for c in data["candidates"]:
                Candidate.objects.create(
                    election=election,
                    name=str(c.get("name", "")).strip(),
                    image_data=str(c.get("image", "") or c.get("image_data", "") or ""),
                )

        election = Election.objects.select_related("section", "section__school_class").prefetch_related("candidates").get(pk=election.id)
        return Response(ElectionSerializer(election).data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def election_end_view(request, pk):
    try:
        try:
            election = Election.objects.get(pk=pk)
        except Election.DoesNotExist:
            return Response({"error": "Election not found."}, status=status.HTTP_404_NOT_FOUND)
        election.status = "ended"
        election.ended_at = timezone.now()
        election.save(update_fields=["status", "ended_at"])
        return Response({"message": "Election ended."}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def vote_status_view(request):
    try:
        election_id = request.query_params.get("election")
        roll_number = request.query_params.get("roll_number")
        if not election_id or not roll_number:
            return Response({"error": "election and roll_number are required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            election = Election.objects.select_related("section").get(pk=election_id)
        except Election.DoesNotExist:
            return Response({"error": "Election not found."}, status=status.HTTP_404_NOT_FOUND)

        # ensure roll belongs to section (best-effort)
        has_student = Student.objects.filter(section_id=election.section_id, roll_number=roll_number).exists()
        already_voted = Vote.objects.filter(election_id=election_id, roll_number=roll_number).exists()
        return Response({
            "allowed": bool(has_student) and not already_voted and election.status == "ongoing",
            "already_voted": already_voted,
            "unknown_roll": not bool(has_student),
            "status": election.status,
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def vote_view(request):
    try:
        serializer = VoteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        data = serializer.validated_data

        try:
            election = Election.objects.select_related("section").get(pk=data["election"])
        except Election.DoesNotExist:
            return Response({"error": "Election not found."}, status=status.HTTP_404_NOT_FOUND)
        if election.status != "ongoing":
            return Response({"error": "Election is not ongoing."}, status=status.HTTP_400_BAD_REQUEST)

        # validate candidate belongs to election
        try:
            candidate = Candidate.objects.get(pk=data["candidate"], election_id=election.id)
        except Candidate.DoesNotExist:
            return Response({"error": "Candidate not found for election."}, status=status.HTTP_404_NOT_FOUND)

        # validate roll belongs to section
        if not Student.objects.filter(section_id=election.section_id, roll_number=data["roll_number"]).exists():
            return Response({"error": "Invalid roll number for this section."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                Vote.objects.create(
                    election=election,
                    candidate=candidate,
                    roll_number=data["roll_number"],
                )
        except IntegrityError:
            return Response({"error": "Already voted."}, status=status.HTTP_409_CONFLICT)

        return Response({"message": "Vote recorded."}, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def results_view(request, pk):
    try:
        try:
            election = Election.objects.select_related("section").prefetch_related("candidates").get(pk=pk)
        except Election.DoesNotExist:
            return Response({"error": "Election not found."}, status=status.HTTP_404_NOT_FOUND)
        counts = {c.id: 0 for c in election.candidates.all()}
        for v in Vote.objects.filter(election_id=election.id).values("candidate_id").annotate(c=Count("id")):
            counts[v["candidate_id"]] = v["c"]
        data = []
        for c in election.candidates.all():
            data.append({"id": c.id, "name": c.name, "votes": counts.get(c.id, 0)})
        data.sort(key=lambda x: x["votes"], reverse=True)
        return Response({"election": election.id, "status": election.status, "results": data}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
