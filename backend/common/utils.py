"""
Shared utility functions.
"""
import random
import string


def generate_random_id(prefix='CMS', length=8):
    """Generate a random ID like CMS-AB12CD34."""
    chars = string.ascii_uppercase + string.digits
    random_part = ''.join(random.choices(chars, k=length))
    return f'{prefix}-{random_part}'


def get_academic_year():
    """Return current academic year string, e.g. '2025-2026'."""
    from datetime import date
    today = date.today()
    if today.month >= 6:  # Academic year starts in June
        return f'{today.year}-{today.year + 1}'
    return f'{today.year - 1}-{today.year}'
