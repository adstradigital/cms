from apps.accounts.models import User
from rest_framework.test import APIClient
import json

def check_api():
    admin = User.objects.filter(is_superuser=True).first()
    client = APIClient()
    client.force_authenticate(user=admin)
    
    # Check students
    res_s = client.get('/api/students/students/?paginate=false')
    is_list_s = isinstance(res_s.data, list)
    count_s = len(res_s.data) if is_list_s else res_s.data.get('count')
    
    # Check staff
    res_st = client.get('/api/staff/?paginate=false')
    is_list_st = isinstance(res_st.data, list)
    count_st = len(res_st.data) if is_list_st else res_st.data.get('count')
    
    print(f"Students: IsList={is_list_s}, Count={count_s}")
    print(f"Staff: IsList={is_list_st}, Count={count_st}")

if __name__ == "__main__":
    check_api()
