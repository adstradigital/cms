import requests

url = "http://127.0.0.1:8001/api/accounts/login/"
data = {"username": "ayaan.menon63", "password": "Test@1234"}
try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.json()}")
except Exception as e:
    print(f"Error: {e}")
