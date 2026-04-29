import json
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

    def to_internal_value(self, data):
        # Handle rich_content sent as JSON string in multipart form data
        mutable = data.copy() if hasattr(data, "copy") else dict(data)
        rc = mutable.get("rich_content")
        if isinstance(rc, str):
            try:
                mutable["rich_content"] = json.loads(rc)
            except (json.JSONDecodeError, TypeError):
                mutable["rich_content"] = None
        return super().to_internal_value(mutable)
