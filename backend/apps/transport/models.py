from django.db import models
from apps.students.models import Student
from apps.accounts.models import User


class TransportRoute(models.Model):
    name = models.CharField(max_length=100)
    driver = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="routes")
    vehicle_number = models.CharField(max_length=20, blank=True)
    vehicle_capacity = models.PositiveSmallIntegerField(default=40)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

    class Meta:
        db_table = "transport_routes"


class RouteStop(models.Model):
    route = models.ForeignKey(TransportRoute, on_delete=models.CASCADE, related_name="stops")
    stop_name = models.CharField(max_length=100)
    stop_order = models.PositiveSmallIntegerField()
    pickup_time = models.TimeField(null=True, blank=True)
    drop_time = models.TimeField(null=True, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    def __str__(self):
        return f"{self.route.name} — Stop {self.stop_order}: {self.stop_name}"

    class Meta:
        db_table = "route_stops"
        ordering = ["stop_order"]


class StudentTransport(models.Model):
    student = models.OneToOneField(Student, on_delete=models.CASCADE, related_name="transport")
    stop = models.ForeignKey(RouteStop, on_delete=models.CASCADE, related_name="students")
    join_date = models.DateField()
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.student} — {self.stop.stop_name}"

    class Meta:
        db_table = "student_transport"
