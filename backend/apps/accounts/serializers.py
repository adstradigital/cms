from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User, School, AcademicYear, UserProfile, Parent
from apps.permissions.models import Role
from apps.permissions.serializers import RoleSerializer


class SchoolSerializer(serializers.ModelSerializer):
    class Meta:
        model = School
        fields = [
            "id", "name", "tagline", "logo", "address", "phone", 
            "email", "website", "primary_color", "secondary_color", 
            "is_active", "created_at"
        ]


class AcademicYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicYear
        fields = "__all__"








class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        exclude = ["user"]


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    role_name = serializers.ReadOnlyField(source="role.name", default="")
    school_name = serializers.CharField(source="school.name", read_only=True)
    full_name = serializers.SerializerMethodField()
    accessible_section_ids = serializers.SerializerMethodField()
    role_scope = serializers.ReadOnlyField(source="role.scope", default="")
    managed_sections = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "full_name", "phone", "is_verified", "is_active","portal",
            "role", "role_name", "school", "school_name",
            "profile", "date_joined", "is_superuser",
            "accessible_section_ids", "role_scope", "managed_sections"
        ]

    def get_full_name(self, obj):
        return obj.get_full_name()

    def get_accessible_section_ids(self, obj):
        result = obj.get_accessible_section_ids()
        return list(result) if result else []

    def get_managed_sections(self, obj):
        return [
            {"id": s.id, "name": f"{s.school_class.name} - {s.name}"} 
            for s in obj.managed_sections.all()
        ]


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            "username", "email", "first_name", "last_name",
            "phone", "role", "school", "password", "confirm_password",
        ]

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("confirm_password"):
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        UserProfile.objects.create(user=user)
        return user


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value


class ParentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    student_ids = serializers.PrimaryKeyRelatedField(
        many=True, source="students",
        queryset=__import__("apps.students.models", fromlist=["Student"]).Student.objects.all(),
    )

    class Meta:
        model = Parent
        fields = ["id", "user", "occupation", "annual_income", "student_ids"]


