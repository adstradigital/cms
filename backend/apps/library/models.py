from django.db import models
from apps.students.models import Student
from apps.accounts.models import User


class Book(models.Model):
    title = models.CharField(max_length=255)
    author = models.CharField(max_length=255)
    isbn = models.CharField(max_length=20, unique=True, blank=True)
    category = models.CharField(max_length=100, blank=True)
    publisher = models.CharField(max_length=100, blank=True)
    total_copies = models.PositiveSmallIntegerField(default=1)
    available_copies = models.PositiveSmallIntegerField(default=1)
    rack_number = models.CharField(max_length=20, blank=True)
    added_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} by {self.author}"

    class Meta:
        db_table = "library_books"


class BookIssue(models.Model):
    STATUS_CHOICES = [("issued", "Issued"), ("returned", "Returned"), ("overdue", "Overdue")]
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name="issues")
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="book_issues")
    issued_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="books_issued")
    issue_date = models.DateField(auto_now_add=True)
    due_date = models.DateField()
    return_date = models.DateField(null=True, blank=True)
    fine_amount = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="issued")

    def __str__(self):
        return f"{self.book.title} → {self.student}"

    class Meta:
        db_table = "book_issues"
