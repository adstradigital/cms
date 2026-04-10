from rest_framework import serializers
from django.db import transaction
from .models import Class, Section, Student, StudentDocument
from apps.accounts.models import User, UserProfile
from apps.permissions.models import Role
from apps.accounts.serializers import UserSerializer, UserProfileSerializer


class ClassSerializer(serializers.ModelSerializer):
    class Meta:
        model = Class
        fields = ["id", "school", "name", "code", "created_at"]
        read_only_fields = ["school"]


class SectionSerializer(serializers.ModelSerializer):
    class_teacher_name = serializers.CharField(source="class_teacher.get_full_name", read_only=True)
    class_name = serializers.CharField(source="school_class.name", read_only=True)
    student_count = serializers.IntegerField(source="students.count", read_only=True)

    class Meta:
        model = Section
        fields = ["id", "school_class", "class_name", "name", "class_teacher", "class_teacher_name", "room_number", "capacity", "student_count"]


class StudentDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentDocument
        fields = ["id", "document_type", "file", "title", "uploaded_at"]


class StudentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    section_name = serializers.SerializerMethodField()
    class_name = serializers.SerializerMethodField()
    parent_name = serializers.SerializerMethodField()
    parent_phone = serializers.SerializerMethodField()
    parent_email = serializers.SerializerMethodField()
    documents = StudentDocumentSerializer(many=True, read_only=True)

    class Meta:
        model = Student
        fields = [
            "id", "user", "admission_number", "roll_number", "academic_year", 
            "section", "section_name", "class_name", "admission_date", 
            "hostel_resident", "transport_user", "previous_school", "is_active",
            "parent_name", "parent_phone", "parent_email", "documents",
        ]

    def get_section_name(self, obj):
        if obj.section:
            return f"{obj.section.school_class.name} — {obj.section.name}"
        return None

    def get_class_name(self, obj):
        if obj.section:
            return obj.section.school_class.name
        return None

    def get_parent_name(self, obj):
        profile = getattr(obj.user, "profile", None)
        if not profile:
            return None
        return profile.father_name or profile.mother_name or profile.guardian_name or None

    def get_parent_phone(self, obj):
        profile = getattr(obj.user, "profile", None)
        return getattr(profile, "parent_phone", None) if profile else None

    def get_parent_email(self, obj):
        profile = getattr(obj.user, "profile", None)
        return getattr(profile, "parent_email", None) if profile else None


class StudentRegistrationSerializer(serializers.Serializer):
    # User Data
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    username = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    
    # Profile Data
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    gender = serializers.CharField(required=False, allow_blank=True)
    blood_group = serializers.CharField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    photo = serializers.ImageField(required=False, allow_null=True)
    signature = serializers.ImageField(required=False, allow_null=True)
    health_notes = serializers.CharField(required=False, allow_blank=True)
    allergies = serializers.CharField(required=False, allow_blank=True)
    emergency_contact_name = serializers.CharField(required=False, allow_blank=True)
    emergency_contact_phone = serializers.CharField(required=False, allow_blank=True)
    
    # Parent/Guardian Details (Captured in Profile)
    father_name = serializers.CharField(required=False, allow_blank=True)
    father_occupation = serializers.CharField(required=False, allow_blank=True)
    mother_name = serializers.CharField(required=False, allow_blank=True)
    mother_occupation = serializers.CharField(required=False, allow_blank=True)
    parent_phone = serializers.CharField(required=False, allow_blank=True)
    parent_email = serializers.EmailField(required=False, allow_blank=True)
    guardian_name = serializers.CharField(required=False, allow_blank=True)
    guardian_relation = serializers.CharField(required=False, allow_blank=True)
    guardian_phone = serializers.CharField(required=False, allow_blank=True)
    guardian_email = serializers.EmailField(required=False, allow_blank=True)
    
    # Student Data
    admission_number = serializers.CharField()
    section = serializers.PrimaryKeyRelatedField(queryset=Section.objects.all(), required=False, allow_null=True)
    academic_year = serializers.PrimaryKeyRelatedField(
        queryset=__import__("apps.accounts.models", fromlist=["AcademicYear"]).AcademicYear.objects.all(),
        required=False, allow_null=True
    )
    admission_date = serializers.DateField(required=False, allow_null=True)
    hostel_resident = serializers.BooleanField(default=False)
    transport_user = serializers.BooleanField(default=False)
    previous_school = serializers.CharField(required=False, allow_blank=True)
    roll_number = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if self.instance is None:
            required_on_create = ["first_name", "last_name", "username", "password", "admission_number"]
            missing = [field for field in required_on_create if not attrs.get(field)]
            if missing:
                raise serializers.ValidationError({field: "This field is required." for field in missing})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        # 1. Create User
        user_data = {
            'username': validated_data.pop('username'),
            'first_name': validated_data.pop('first_name'),
            'last_name': validated_data.pop('last_name'),
            'email': validated_data.get('email', ''),
            'phone': validated_data.get('phone', ''),
        }
        password = validated_data.pop('password')
        
        # Assign Student Role
        student_role, _ = Role.objects.get_or_create(name="student")
        
        user = User.objects.create(**user_data)
        user.set_password(password)
        user.role = student_role
        user.save()

        # 2. Update Profile (Ensure it exists)
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.date_of_birth = validated_data.pop('date_of_birth', None)
        profile.gender = validated_data.pop('gender', '')
        profile.blood_group = validated_data.pop('blood_group', '')
        profile.address = validated_data.pop('address', '')
        profile.health_notes = validated_data.pop('health_notes', '')
        profile.allergies = validated_data.pop('allergies', '')
        profile.emergency_contact_name = validated_data.pop('emergency_contact_name', '')
        profile.emergency_contact_phone = validated_data.pop('emergency_contact_phone', '')
        
        # Parent details stored in profile
        profile.father_name = validated_data.pop('father_name', '')
        profile.father_occupation = validated_data.pop('father_occupation', '')
        profile.mother_name = validated_data.pop('mother_name', '')
        profile.mother_occupation = validated_data.pop('mother_occupation', '')
        profile.parent_phone = validated_data.pop('parent_phone', '')
        profile.parent_email = validated_data.pop('parent_email', '')
        profile.guardian_name = validated_data.pop('guardian_name', '')
        profile.guardian_relation = validated_data.pop('guardian_relation', '')
        profile.guardian_phone = validated_data.pop('guardian_phone', '')
        profile.guardian_email = validated_data.pop('guardian_email', '')

        if 'photo' in validated_data:
            profile.photo = validated_data.pop('photo')
        if 'signature' in validated_data:
            profile.signature = validated_data.pop('signature')
        profile.save()

        # 3. Create Student
        student = Student.objects.create(
            user=user,
            admission_number=validated_data.pop('admission_number'),
            section=validated_data.pop('section', None),
            academic_year=validated_data.pop('academic_year', None),
            admission_date=validated_data.pop('admission_date', None),
            hostel_resident=validated_data.pop('hostel_resident', False),
            transport_user=validated_data.pop('transport_user', False),
            previous_school=validated_data.pop('previous_school', ''),
            roll_number=validated_data.pop('roll_number', ''),
        )

        return student

    @transaction.atomic
    def update(self, instance, validated_data):
        user = instance.user
        profile, _ = UserProfile.objects.get_or_create(user=user)

        if "first_name" in validated_data:
            user.first_name = validated_data.pop("first_name")
        if "last_name" in validated_data:
            user.last_name = validated_data.pop("last_name")
        if "email" in validated_data:
            user.email = validated_data.pop("email")
        if "phone" in validated_data:
            user.phone = validated_data.pop("phone")
        if "username" in validated_data and validated_data["username"]:
            user.username = validated_data.pop("username")
        if "password" in validated_data and validated_data["password"]:
            user.set_password(validated_data.pop("password"))
        user.save()

        profile_fields = [
            "date_of_birth", "gender", "blood_group", "address", "health_notes",
            "allergies", "emergency_contact_name", "emergency_contact_phone",
            "father_name", "father_occupation", "mother_name", "mother_occupation",
            "parent_phone", "parent_email", "guardian_name", "guardian_relation",
            "guardian_phone", "guardian_email",
        ]
        for field in profile_fields:
            if field in validated_data:
                setattr(profile, field, validated_data.pop(field))
        if "photo" in validated_data:
            profile.photo = validated_data.pop("photo")
        if "signature" in validated_data:
            profile.signature = validated_data.pop("signature")
        profile.save()

        student_fields = [
            "admission_number", "section", "academic_year", "admission_date",
            "hostel_resident", "transport_user", "previous_school", "roll_number",
        ]
        for field in student_fields:
            if field in validated_data:
                setattr(instance, field, validated_data.pop(field))
        instance.save()

        return instance
