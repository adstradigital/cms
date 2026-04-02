from rest_framework import serializers
from .models import SchoolConfig

class SchoolConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = SchoolConfig
        fields = '__all__'
