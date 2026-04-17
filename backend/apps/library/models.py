from django.db import models
from apps.students.models import Student
from apps.staff.models import Staff
from apps.accounts.models import User


class Rack(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)
    location = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"Rack: {self.name} ({self.code})"

    class Meta:
        db_table = "library_racks"


class Shelf(models.Model):
    rack = models.ForeignKey(Rack, on_delete=models.CASCADE, related_name="shelves")
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50)
    description = models.TextField(blank=True)

    def __str__(self):
        return f"{self.rack.code} - Shelf: {self.name}"

    class Meta:
        db_table = "library_shelves"
        unique_together = ("rack", "code")


class Book(models.Model):
    custom_id = models.CharField(max_length=50, unique=True, null=True, blank=True)
    title = models.CharField(max_length=255)
    author = models.CharField(max_length=255)
    isbn = models.CharField(max_length=20, unique=True, null=True, blank=True)
    category = models.CharField(max_length=100, blank=True)
    publisher = models.CharField(max_length=100, blank=True)
    edition = models.CharField(max_length=50, blank=True)
    year = models.PositiveSmallIntegerField(null=True, blank=True)
    total_copies = models.PositiveSmallIntegerField(default=1)
    available_copies = models.PositiveSmallIntegerField(default=1)
    
    # Physical Location
    shelf = models.ForeignKey(Shelf, on_delete=models.SET_NULL, null=True, blank=True, related_name="books")
    position = models.CharField(max_length=50, blank=True)
    
    # Legacy field (keeping for compatibility during transition if needed, or we can migrate)
    rack_number = models.CharField(max_length=20, blank=True)
    
    added_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} by {self.author}"

    class Meta:
        db_table = "library_books"


class BookIssue(models.Model):
    STATUS_CHOICES = [("issued", "Issued"), ("returned", "Returned"), ("overdue", "Overdue")]
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name="issues")
    
    # Can be issued to either student or staff
    student = models.ForeignKey(Student, on_delete=models.CASCADE, null=True, blank=True, related_name="book_issues")
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE, null=True, blank=True, related_name="book_issues")
    
    issued_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="books_issued")
    issue_date = models.DateField(auto_now_add=True)
    due_date = models.DateField()
    return_date = models.DateField(null=True, blank=True)
    return_condition = models.TextField(blank=True)
    
    fine_amount = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    fine_paid = models.BooleanField(default=False)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="issued")

    def __str__(self):
        borrower = self.student if self.student else self.staff
        return f"{self.book.title} → {borrower}"

    class Meta:
        db_table = "book_issues"


class LibrarySetting(models.Model):
    config_key = models.CharField(max_length=100, unique=True) # e.g., 'fine_rate_per_day', 'student_max_books'
    value = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.config_key

    class Meta:
        db_table = "library_settings"
