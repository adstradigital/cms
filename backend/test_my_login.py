import requests

url = "http://127.0.0.1:8000/api/accounts/login/"
data = {"username": "admin_test", "password": "admin123"}
try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print("Login Success!")
        print(f"User: {response.json().get('user', {}).get('username')}")
    else:
        print(f"Login Failed: {response.text}")
except Exception as e:
    print(f"Error: {e}")
