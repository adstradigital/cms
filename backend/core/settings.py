"""
Settings for Campus Management System.
A single, easy-to-use file with both Local and Production configurations.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# BASE_DIR: Folder containing 'manage.py'
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env
load_dotenv(BASE_DIR / '.env')

# 1. ⚙️ GLOBAL TOGGLE (DEBUG)
# Set DEBUG=False in your environment for Production mode
DEBUG = os.getenv('DEBUG', 'True') == 'True'

# 2. 🔌 HOSTS & SECURITY
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-CHANGE-ME-IN-PRODUCTION')
ALLOWED_HOSTS = ['*'] if DEBUG else os.getenv('ALLOWED_HOSTS', '').split(',')


# 3. 💾 DATABASE CONFIGURATION
_db_engine = os.getenv('DB_ENGINE', 'django.db.backends.sqlite3')
if _db_engine == 'django.db.backends.sqlite3':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': _db_engine,
            'NAME': os.getenv('DB_NAME', 'cms'),
            'USER': os.getenv('DB_USER', 'root'),
            'PASSWORD': os.getenv('DB_PASSWORD', ''),
            'HOST': os.getenv('DB_HOST', '127.0.0.1'),
            'PORT': os.getenv('DB_PORT', '3306'),
            'OPTIONS': {
                'charset': 'utf8mb4',
            },
        }
    }


# 4. 📦 APPLICATION DEFINITION
INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third party
    'rest_framework',
    'rest_framework.authtoken',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'channels',

    # Project apps
    'apps.accounts',
    'apps.permissions',
    'apps.students',
    'apps.academics',
    'apps.attendance',
    'apps.exams',
    'apps.fees',
    'apps.transport',
    'apps.hostel',
    'apps.library',
    'apps.notifications',
    'apps.staff',
    'apps.elections',
    'apps.events',
    'apps.alumni',
    'apps.canteen',
    'apps.ai_brain',
    'apps.expenses',
    'apps.payroll',
    'apps.reports',
    'apps.chat',

    # Celery result backend
    'django_celery_results',
    'django_celery_beat',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'apps.permissions.middleware.PortalGuardMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'
ASGI_APPLICATION = 'core.asgi.application'

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [os.getenv('REDIS_URL', 'redis://127.0.0.1:6379/1')],
        },
    },
}

# Fallback to in-memory channel layer if Redis is not available (dev only)
if DEBUG and not os.getenv('REDIS_URL'):
    try:
        import redis as _redis_lib
        _r = _redis_lib.Redis.from_url('redis://127.0.0.1:6379/1')
        _r.ping()
        _r.close()
    except Exception:
        CHANNEL_LAYERS = {
            "default": {
                "BACKEND": "channels.layers.InMemoryChannelLayer",
            },
        }


# 5. 🛡️ AUTH & PASSWORDS
AUTH_USER_MODEL = 'accounts.User'
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


# 6. 🌍 LOCALIZATION
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True


# 7. 📂 STATIC & MEDIA
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# 8. 📡 DJANGO REST FRAMEWORK (DRF)
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 100,
}

from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}


# 9. 🌐 CORS & SECURITY
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
else:
    _cors_origins = os.getenv('CORS_ALLOWED_ORIGINS', '')
    CORS_ALLOWED_ORIGINS = [o for o in _cors_origins.split(',') if o.strip()]
    CORS_ALLOW_CREDENTIALS = True
    
    # Production security headers
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    X_FRAME_OPTIONS = 'DENY'


# ── Cache ──────────────────────────────────────────────────────────────────────
# Uses in-memory cache by default; switch to Redis in production via CACHE_URL env var.
_cache_url = os.getenv('CACHE_URL', '')
if _cache_url.startswith('redis'):
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.redis.RedisCache',
            'LOCATION': _cache_url,
        }
    }
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'cms-default',
        }
    }


# ── Celery ─────────────────────────────────────────────────────────────────────
CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = 'django-db'
CELERY_CACHE_BACKEND = 'django-cache'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'

from celery.schedules import crontab
CELERY_BEAT_SCHEDULE = {
    # Daily at 17:00 IST — check for sections that haven't marked attendance
    'daily-attendance-incomplete-check': {
        'task': 'ai_brain.daily_attendance_incomplete_check',
        'schedule': crontab(hour=17, minute=0),
    },
    # Daily at 07:00 IST — alert for students absent 3+ consecutive days
    'daily-consecutive-absence-alert': {
        'task': 'ai_brain.daily_consecutive_absence_alert',
        'schedule': crontab(hour=7, minute=0),
    },
    # Every Friday at 16:00 IST — school-wide at-risk sweep
    'weekly-at-risk-sweep': {
        'task': 'ai_brain.weekly_at_risk_sweep',
        'schedule': crontab(hour=16, minute=0, day_of_week='friday'),
    },
    # Every Friday at 16:30 IST — section performance digests
    'weekly-performance-digest': {
        'task': 'ai_brain.weekly_performance_digest',
        'schedule': crontab(hour=16, minute=30, day_of_week='friday'),
    },
    # Every Sunday at midnight — clean up discarded AI drafts older than 30 days
    'weekly-draft-cleanup': {
        'task': 'ai_brain.cleanup_old_drafts',
        'schedule': crontab(hour=0, minute=0, day_of_week='sunday'),
    },
}
