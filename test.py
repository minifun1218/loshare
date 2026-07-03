import os
import json
import requests

url = "http://10.0.15.5:8080/apis/ais-v2/chat/completions"
# 如果是公网：
# url = "https://你的域名/v1/chat/completions"

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer "
}

body = {
    "model": "deepseek-v4-flash-w8a8c16",
    "messages": [
        {
            "role": "user",
            "content": "你好"
        }
    ],
    "stream": True,
    "stream_options": {}
}

res = requests.post(
    url,
    headers=headers,
    json=body,
    stream=True,
    timeout=120
)

res.raise_for_status()

for line in res.iter_lines(decode_unicode=True):
    if not line:
        continue

    if line.startswith("data: "):
        data = line[len("data: "):]

        if data == "[DONE]":
            break

        try:
            chunk = json.loads(data)
            content = chunk["choices"][0].get("delta", {}).get("content", "")
            if content:
                print(content, end="", flush=True)
        except Exception:
            print(data)