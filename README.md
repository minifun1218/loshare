# LoShare 生产环境启动说明

LoShare 由两部分组成：

- `backend/`：FastAPI + SQLite，生产建议监听 `127.0.0.1:9000`，由 Nginx 反向代理。
- `frontend/`：React + Vite，生产构建产物在 `frontend/dist/`，由 Nginx 或其他静态文件服务托管。

本项目的音视频依赖 LiveKit。只使用位置共享时可以不启动 LiveKit；需要通话必须启动 LiveKit Server；需要录制还必须启动 LiveKit Egress。

## 生产前必须检查

1. 修改 `backend/auth.py` 里的 `SECRET_KEY`。
   当前是硬编码开发值，正式部署前必须替换成高强度随机字符串。

2. 后端不要开多个 worker。
   当前 WebSocket 在线状态使用进程内内存管理，多 worker 会导致房间在线状态不一致。

3. 生产环境使用 HTTPS/WSS。
   前端生产构建会检查接口地址：非本机地址必须使用 `https://` 和 `wss://`。

4. 配置真实域名。
   后端 `.env` 的 `FRONTEND_ORIGIN` 必须和用户访问前端的 origin 完全一致。

## 后端环境变量

在 `backend/.env` 中配置：

```env
APP_ENV=prod
LOG_LEVEL=INFO

DATABASE_URL=sqlite+aiosqlite:///./loshare.db
FRONTEND_ORIGIN=https://your-domain.com
ENFORCE_HTTPS=true
TRUSTED_PROXY_HEADERS=true

SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_USER=your@qq.com
SMTP_PASSWORD=your_smtp_app_password
SMTP_FROM=your@qq.com

LIVEKIT_WS_URL=wss://livekit.your-domain.com
LIVEKIT_API_URL=https://livekit.your-domain.com
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
```

如果 LiveKit 和后端都在内网，也可以让后端使用内网 `LIVEKIT_API_URL`，但前端拿到的 `LIVEKIT_WS_URL` 必须是浏览器能访问的地址。

## 前端生产环境变量

在 `frontend/.env.production` 中配置：

```env
VITE_API_BASE_URL=https://your-domain.com
VITE_WS_BASE_URL=wss://your-domain.com
```

如果前端和后端 API 使用同一个域名，并且 Nginx 把 `/api` 代理到后端，可以不写这两个变量，前端会默认请求当前域名。

## Linux 生产启动

### 1. 安装后端依赖

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. 启动后端

```bash
cd backend
source .venv/bin/activate
python -m uvicorn main:app --host 127.0.0.1 --port 9000
```

推荐使用 systemd 托管：

```ini
[Unit]
Description=LoShare Backend
After=network.target

[Service]
WorkingDirectory=/opt/loshare/backend
Environment=PATH=/opt/loshare/backend/.venv/bin
ExecStart=/opt/loshare/backend/.venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 9000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

启动：

```bash
sudo systemctl daemon-reload
sudo systemctl enable loshare-backend
sudo systemctl start loshare-backend
sudo systemctl status loshare-backend
```

### 3. 构建前端

```bash
cd frontend
npm install
npm run build
```

构建产物在：

```text
frontend/dist/
```

### 4. Nginx 示例

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /opt/loshare/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:9000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

如果 WebSocket 也通过同一域名代理，补充：

```nginx
location /api/location/ws/ {
    proxy_pass http://127.0.0.1:9000/api/location/ws/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

正式环境建议用 Certbot 或云厂商证书启用 HTTPS。

## LiveKit 启动

开发或单机测试可以用 Docker：

```bash
docker run --rm -p 7880:7880 -p 7881:7881 -p 7882:7882/udp \
  -e LIVEKIT_KEYS="devkey: secret" \
  livekit/livekit-server --dev
```

录制需要 LiveKit Egress：

```bash
docker run --rm --network host \
  -v /recordings:/recordings \
  -e LIVEKIT_URL=ws://localhost:7880 \
  -e LIVEKIT_API_KEY=devkey \
  -e LIVEKIT_API_SECRET=secret \
  livekit/egress
```

生产环境请把 `devkey` 和 `secret` 替换为真实密钥，并确保后端 `.env` 中的 LiveKit 配置一致。

## Windows 本机 product/production 预览

这不是正式部署方式，只适合在本机验证生产构建。

### 1. 启动后端

```powershell
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 9000
```

### 2. 构建并预览前端

```powershell
cd frontend
npm install
npm run build
npm run preview -- --host 0.0.0.0 --port 5000
```

访问：

```text
http://localhost:5000
```

如果使用前端 preview 直接访问后端，需要在 `frontend/.env.production` 中设置：

```env
VITE_API_BASE_URL=http://localhost:9000
VITE_WS_BASE_URL=ws://localhost:9000
```

注意：本机 localhost 允许使用 HTTP/WS；部署到真实域名时必须改成 HTTPS/WSS。

## 开发环境启动

Windows 可直接运行：

```powershell
.\start.ps1
```

它会启动：

```text
Backend:  http://localhost:9000
Frontend: http://localhost:5000
API Docs: http://localhost:9000/docs
```

也可以分开启动：

```bash
cd backend
python -m uvicorn main:app --reload --port 9000
```

```bash
cd frontend
npm install
npm run dev
```

## 验证命令

```bash
cd frontend
npm run lint
npm run build
```

后端当前没有自动化测试。启动后可访问：

```text
http://localhost:9000/docs
```

检查 API 文档是否正常加载。
