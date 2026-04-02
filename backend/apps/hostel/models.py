from django.db import models
from apps.students.models import Student
from apps.accounts.models import User


class HostelBlock(models.Model):
    name = models.CharField(max_length=100)
    warden = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="hostel_blocks")
    gender = models.CharField(max_length=10, choices=[("male", "Male"), ("female", "Female"), ("mixed", "Mixed")])
    total_rooms = models.PositiveSmallIntegerField(default=0)

    def __str__(self):
        return self.name

    class Meta:
        db_table = "hostel_blocks"


class HostelRoom(models.Model):
    block = models.ForeignKey(HostelBlock, on_delete=models.CASCADE, related_name="rooms")
    room_number = models.CharField(max_length=20)
    capacity = models.PositiveSmallIntegerField(default=4)
    occupied = models.PositiveSmallIntegerField(default=0)

    def __str__(self):
        return f"{self.block.name} — Room {self.room_number}"

    class Meta:
        db_table = "hostel_rooms"
        unique_together = ("block", "room_number")


class HostelAllotment(models.Model):
    student = models.OneToOneField(Student, on_delete=models.CASCADE, related_name="hostel_allotment")
    room = models.ForeignKey(HostelRoom, on_delete=models.CASCADE, related_name="allotments")
    join_date = models.DateField()
    leave_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.student} — {self.room}"

    class Meta:
        db_table = "hostel_allotments"
