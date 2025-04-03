# 使用 Python 官方镜像
FROM python:3.9-slim

WORKDIR /app

COPY . .

RUN pip install --no-cache-dir flask flask-socketio eventlet

CMD ["python", "src/server.py"]