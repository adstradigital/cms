from django.http import JsonResponse

PORTAL_PATHS = {
    '/api/admin/':   'admin',
    '/api/student/': 'student',
    '/api/parent/':  'parent',
}

class PortalGuardMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        user = request.user
        if user.is_authenticated:
            for path_prefix, portal in PORTAL_PATHS.items():
                if request.path.startswith(path_prefix):
                    # check if user has access to this portal
                    if user.portal != portal and not user.is_superuser:
                        return JsonResponse({'error': 'Wrong portal', 'portal': user.portal}, status=403)
        return self.get_response(request)
