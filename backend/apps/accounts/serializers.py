from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User, School, AcademicYear, UserProfile, Parent
from apps.permissions.models import Role as PermissionsRole


class SchoolSerializer(serializers.ModelSerializer):
    class Meta:
        model = School
        fields = "__all__"


class AcademicYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicYear
        fields = "__all__"


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = PermissionsRole
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

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "full_name", "phone", "is_verified", "is_active",
            "role", "role_name", "school", "school_name",
            "profile", "date_joined",
        ]

    def get_full_name(self, obj):
        return obj.get_full_name()


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


class SchoolOnboardingSerializer(serializers.Serializer):
    school_name = serializers.CharField(max_length=255)
    admin_username = serializers.CharField(max_length=150)
    admin_email = serializers.EmailField()
    admin_password = serializers.CharField(write_only=True, validators=[validate_password])
    admin_first_name = serializers.CharField(max_length=150, required=False, allow_blank=True, default="")
    admin_last_name = serializers.CharField(max_length=150, required=False, allow_blank=True, default="")

    def create(self, validated_data):
        from django.db import transaction
        
        with transaction.atomic():
            # 1. Create School
            school = School.objects.create(name=validated_data['school_name'])
            
            # 2. Create Admin User
            admin_user = User.objects.create(
                username=validated_data['admin_username'],
                email=validated_data['admin_email'],
                first_name=validated_data['admin_first_name'],
                last_name=validated_data['admin_last_name'],
                school=school,
                portal=User.PORTAL_ADMIN,
                is_active=True
            )
            admin_user.set_password(validated_data['admin_password'])
            
            # 3. Assign Role (Admin)
            admin_role, _ = PermissionsRole.objects.get_or_create(name='Admin')
            admin_user.role = admin_role
            admin_user.save()
            
            # 4. Create Profile
            UserProfile.objects.create(user=admin_user)
            
            return {
                "school": school,
                "admin": admin_user
            }
