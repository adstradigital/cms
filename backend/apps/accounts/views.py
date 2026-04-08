from django.contrib.auth import authenticate
from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User, School, AcademicYear, UserProfile
from apps.permissions.models import Role
from .serializers import (
    UserSerializer, UserCreateSerializer, UserProfileSerializer,
    SchoolSerializer, AcademicYearSerializer,
    ChangePasswordSerializer, ParentSerializer,
)
from apps.permissions.serializers import RoleSerializer


# ─── Auth ─────────────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    try:
        identifier = request.data.get("username") or request.data.get("email") or request.data.get("phone")
        password = request.data.get("password")

        if not identifier or not password:
            return Response(
                {"error": "Username and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        identifier = str(identifier).strip()

        # 1) Standard Django authentication by username
        user = authenticate(request, username=identifier, password=password)

        # 2) Fallback: allow login by email / phone / case-insensitive username
        if not user:
            candidate = User.objects.filter(
                Q(username__iexact=identifier) |
                Q(email__iexact=identifier) |
                Q(phone__iexact=identifier)
            ).first()
            if candidate and candidate.check_password(password):
                user = candidate

        if not user:
            return Response(
                {"error": "Invalid credentials."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_active:
            return Response(
                {"error": "Account is disabled. Contact admin."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Auto-assign Admin role for superusers without a role
        if user.is_superuser and not user.role:
            try:
                # Use 'Admin' role as defined in seed_permissions.py
                admin_role = Role.objects.get(name="Admin")
                user.role = admin_role
                user.portal = User.PORTAL_ADMIN
                user.save(update_fields=["role", "portal"])
            except Role.DoesNotExist:
                # Fallback if seed script hasn't run
                pass

        refresh = RefreshToken.for_user(user)
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserSerializer(user).data,
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    try:
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response({"error": "Refresh token is required."}, status=status.HTTP_400_BAD_REQUEST)
        token = RefreshToken(refresh_token)
        token.blacklist()
        return Response({"message": "Logged out successfully."}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([AllowAny])
def token_refresh_view(request):
    try:
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response({"error": "Refresh token is required."}, status=status.HTTP_400_BAD_REQUEST)
        token = RefreshToken(refresh_token)
        return Response({"access": str(token.access_token)}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── Current User ─────────────────────────────────────────────────────────────

@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def me_view(request):
    try:
        if request.method == "GET":
            serializer = UserSerializer(request.user)
            return Response(serializer.data, status=status.HTTP_200_OK)

        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    try:
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save()
        return Response({"message": "Password changed successfully."}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── Users (Admin) ────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def user_list_view(request):
    try:
        if request.method == "GET":
            school_id = request.query_params.get("school")
            role = request.query_params.get("role")
            qs = User.objects.select_related("role", "school", "profile").all()
            if school_id:
                qs = qs.filter(school_id=school_id)
            if role:
                qs = qs.filter(role__name=role)
            serializer = UserSerializer(qs, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        serializer = UserCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def user_detail_view(request, pk):
    try:
        try:
            user = User.objects.select_related("role", "school", "profile").get(pk=pk)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(UserSerializer(user).data, status=status.HTTP_200_OK)

        if request.method == "PATCH":
            serializer = UserSerializer(user, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        user.is_active = False
        user.save()
        return Response({"message": "User deactivated."}, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── User Profile ─────────────────────────────────────────────────────────────

@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def user_profile_view(request, user_pk):
    try:
        try:
            profile = UserProfile.objects.get(user_id=user_pk)
        except UserProfile.DoesNotExist:
            return Response({"error": "Profile not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(UserProfileSerializer(profile).data, status=status.HTTP_200_OK)

        serializer = UserProfileSerializer(profile, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)




# ─── School ───────────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def school_list_view(request):
    try:
        if request.method == "GET":
            schools = School.objects.all()
            return Response(SchoolSerializer(schools, many=True).data, status=status.HTTP_200_OK)

        serializer = SchoolSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def school_detail_view(request, pk):
    try:
        try:
            school = School.objects.get(pk=pk)
        except School.DoesNotExist:
            return Response({"error": "School not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(SchoolSerializer(school).data, status=status.HTTP_200_OK)

        if request.method == "PATCH":
            serializer = SchoolSerializer(school, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        school.delete()
        return Response({"message": "School deleted."}, status=status.HTTP_204_NO_CONTENT)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── Academic Year ────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def academic_year_list_view(request):
    try:
        if request.method == "GET":
            school_id = request.query_params.get("school")
            qs = AcademicYear.objects.all()
            if school_id:
                qs = qs.filter(school_id=school_id)
            return Response(AcademicYearSerializer(qs, many=True).data, status=status.HTTP_200_OK)

        serializer = AcademicYearSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def academic_year_detail_view(request, pk):
    try:
        try:
            year = AcademicYear.objects.get(pk=pk)
        except AcademicYear.DoesNotExist:
            return Response({"error": "Academic year not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(AcademicYearSerializer(year).data, status=status.HTTP_200_OK)

        if request.method == "PATCH":
            serializer = AcademicYearSerializer(year, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        year.delete()
        return Response({"message": "Academic year deleted."}, status=status.HTTP_204_NO_CONTENT)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def role_list_view(request):
    try:
        roles = Role.objects.all()
        return Response(RoleSerializer(roles, many=True).data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([AllowAny])
def public_school_config_view(request):
    """
    Get the global school configuration for branding.
    Currently returns the first school record found.
    """
    try:
        school = School.objects.first()
        if not school:
            return Response({
                "name": "Schoolastica",
                "tagline": "Inspiring Excellence every day.",
                "primary_color": "#00a676",
                "secondary_color": "#3b82f6"
            })
        
        from .serializers import SchoolSerializer
        serializer = SchoolSerializer(school)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
