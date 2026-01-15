import requests
import os
from dotenv import load_dotenv
from pathlib import Path

env_path = Path(r"E:\Recruitment\Briviio\Socratis\server\agent\.env")
load_dotenv(dotenv_path=env_path)

KEY = os.environ.get("DEEPGRAM_API_KEY")
print(f"Testing Key: {KEY[:5]}...")

url = "https://api.deepgram.com/v1/projects"
headers = {"Authorization": f"Token {KEY}"}

try:
    resp = requests.get(url, headers=headers)
    print(f"Status Code: {resp.status_code}")
    print(f"Response: {resp.text}")
except Exception as e:
    print(f"Request Failed: {e}")
