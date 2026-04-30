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

from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from urllib.parse import parse_qs

User = get_user_model()

@database_sync_to_async
def get_user_from_token(token_key):
    try:
        access_token = AccessToken(token_key)
        user_id = access_token['user_id']
        return User.objects.get(id=user_id)
    except Exception:
        return AnonymousUser()

class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = scope.get('query_string', b'').decode('utf-8')
        query_params = parse_qs(query_string)
        token = query_params.get('token', [None])[0]

        if token:
            scope['user'] = await get_user_from_token(token)
        else:
            # Fallback to checking headers if needed, but query param is easier for WS
            scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)

def JWTAuthMiddlewareStack(inner):
    return JWTAuthMiddleware(inner)
