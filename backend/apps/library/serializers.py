from rest_framework import serializers
from .models import Book, BookIssue, Rack, Shelf, LibrarySetting


class RackSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rack
        fields = "__all__"


class ShelfSerializer(serializers.ModelSerializer):
    rack_name = serializers.CharField(source="rack.name", read_only=True)

    class Meta:
        model = Shelf
        fields = "__all__"


class LibrarySettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = LibrarySetting
        fields = "__all__"


class BookSerializer(serializers.ModelSerializer):
    shelf_name = serializers.CharField(source="shelf.name", read_only=True)
    rack_name = serializers.CharField(source="shelf.rack.name", read_only=True)
    rack_code = serializers.CharField(source="shelf.rack.code", read_only=True)
    shelf_code = serializers.CharField(source="shelf.code", read_only=True)

    class Meta:
        model = Book
        fields = [
            "id", "custom_id", "title", "author", "isbn", "category", 
            "publisher", "edition", "year", "total_copies", "available_copies", 
            "shelf", "position", "rack_number", "added_at", "shelf_name", 
            "rack_name", "rack_code", "shelf_code"
        ]


class BookIssueSerializer(serializers.ModelSerializer):
    book_title = serializers.CharField(source="book.title", read_only=True)
    student_name = serializers.CharField(source="student.user.get_full_name", read_only=True)
    staff_name = serializers.CharField(source="staff.user.get_full_name", read_only=True)
    issued_by_name = serializers.CharField(source="issued_by.get_full_name", read_only=True)

    class Meta:
        model = BookIssue
        fields = [
            "id", "book", "student", "staff", "issued_by", "issue_date", 
            "due_date", "return_date", "return_condition", "fine_amount", 
            "fine_paid", "status", "book_title", "student_name", 
            "staff_name", "issued_by_name"
        ]
        read_only_fields = ["issue_date", "status", "fine_amount", "issued_by"]
