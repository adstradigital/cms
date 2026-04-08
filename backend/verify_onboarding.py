import requests
import json

BASE_URL = "http://127.0.0.1:8000/api/accounts/"

def test_onboarding():
    # 1. Login as Superadmin
    print("Logging in as superadmin 'kiran'...")
    login_data = {
        "username": "kiran",
        "password": "password123" # Assuming kiran has this password from common dev setup
    }
    response = requests.post(BASE_URL + "login/", json=login_data)
    if response.status_code != 200:
        print(f"Login failed: {response.text}")
        return
    
    token = response.json()["access"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Login successful.")

    # 2. Onboard a new school
    onboard_data = {
        "school_name": "Test School Alpha",
        "admin_username": "alpha_admin",
        "admin_email": "admin@testschool.com",
        "admin_password": "AdminPassword123!",
        "admin_first_name": "Alpha",
        "admin_last_name": "Admin"
    }
    print(f"Onboarding school '{onboard_data['school_name']}'...")
    response = requests.post(BASE_URL + "onboard-school/", json=onboard_data, headers=headers)
    if response.status_code != 201:
        print(f"Onboarding failed: {response.text}")
        return
    
    print("Onboarding successful!")
    print(json.dumps(response.json(), indent=2))

    # 3. Verify Admin login
    print("\nLogging in as the new admin 'alpha_admin'...")
    admin_login_data = {
        "username": "alpha_admin",
        "password": "AdminPassword123!"
    }
    response = requests.post(BASE_URL + "login/", json=admin_login_data)
    if response.status_code != 200:
        print(f"Admin login failed: {response.text}")
        return
    
    user_data = response.json()["user"]
    print("Admin login successful.")
    print(f"User Portal: {user_data.get('portal')}")
    print(f"User Role: {user_data.get('role_name')}")
    print(f"User School: {user_data.get('school_name')}")

if __name__ == "__main__":
    test_onboarding()
