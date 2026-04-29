from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = "__all__"
        read_only_fields = ["created_by"]

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None
