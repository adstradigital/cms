import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.transport.models import TransportFee

def cleanup():
    # Find all student + period combinations
    pairs = TransportFee.objects.values('student', 'period_label').distinct()
    
    deleted_count = 0
    for pair in pairs:
        fees = TransportFee.objects.filter(
            student_id=pair['student'], 
            period_label=pair['period_label']
        ).order_by('-amount_paid', '-created_at')
        
        if fees.count() > 1:
            # Keep the first one (most paid or most recent)
            to_keep = fees[0]
            to_delete = fees[1:]
            
            for f in to_delete:
                print(f"Deleting duplicate fee: {f.student} - {f.period_label} (ID: {f.id})")
                f.delete()
                deleted_count += 1
                
    print(f"Cleanup complete. Deleted {deleted_count} duplicate records.")

if __name__ == "__main__":
    cleanup()
