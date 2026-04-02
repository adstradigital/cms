from django.urls import path
from .views import SchoolConfigView

urlpatterns = [
    path('config/', SchoolConfigView.as_view(), name='school-config'),
]
