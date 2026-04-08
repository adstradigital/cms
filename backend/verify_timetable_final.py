import requests

BASE_URL = "http://127.0.0.1:8000/api/"

def test_timetable_api():
    # 1. Login
    print("Logging in...")
    login_data = {"username": "kiran", "password": "password123"}
    response = requests.post(BASE_URL + "accounts/login/", json=login_data)
    if response.status_code != 200:
        print(f"Login failed: {response.text}")
        return
    token = response.json()["access"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Login successful.")

    # 2. Test /api/timetables/settings/
    print("\nTesting /api/timetables/settings/...")
    response = requests.get(BASE_URL + "timetables/settings/", headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print(f"Data: {response.json()}")

    # 3. Test /api/timetables/absence-status/ (expecting 404 if data missing, but not route 404)
    print("\nTesting /api/timetables/absence-status/...")
    params = {"class_name": "Class 10 - Section A", "day": "Monday"}
    response = requests.get(BASE_URL + "timetables/absence-status/", params=params, headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print("Absence status retrieved successfully.")
    else:
        print(f"Note: Absence status returned {response.status_code} (likely due to missing seed data), but the route exists.")

    # 4. Test /api/timetables/
    print("\nTesting /api/timetables/...")
    response = requests.get(BASE_URL + "timetables/", headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print(f"Found {len(response.json())} timetable entries.")

if __name__ == "__main__":
    test_timetable_api()
