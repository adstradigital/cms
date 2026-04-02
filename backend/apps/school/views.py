from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import SchoolConfig
from .serializers import SchoolConfigSerializer

class SchoolConfigView(APIView):
    """
    Get the global school configuration.
    Accessible without authentication for basic branding.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        config = SchoolConfig.objects.first()
        if not config:
            # Create a default one if it doesn't exist
            config = SchoolConfig.objects.create(name="Schoolastica")
        
        serializer = SchoolConfigSerializer(config)
        return Response(serializer.data)
