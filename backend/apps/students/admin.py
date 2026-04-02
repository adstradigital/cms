from django.contrib import admin
from .models import Class, Section, Student

@admin.register(Class)
class ClassAdmin(admin.ModelAdmin):
    list_display = ("name", "school", "code")
    search_fields = ("name", "code")
    list_filter = ("school",)

@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    list_display = ("name", "school_class", "class_teacher", "capacity")
    search_fields = ("name",)
    list_filter = ("school_class",)

@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ("get_full_name", "admission_number", "roll_number", "section", "academic_year")
    search_fields = ("user__first_name", "user__last_name", "admission_number", "roll_number")
    list_filter = ("section__school_class", "section", "academic_year", "is_active")

    def get_full_name(self, obj):
        return obj.user.get_full_name()
    get_full_name.short_description = "Name"
