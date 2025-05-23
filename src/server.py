# server.py
import socket
from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit, join_room, leave_room

app = Flask(__name__, template_folder="../templates", static_folder="../static")
socketio = SocketIO(app, cors_allowed_origins="*")  # 允许跨域访问
clients = {}


@app.route("/")
def index():
    return render_template("index.html")


def forward_event(event, data, room):
    print(f"收到 {event}: {data}")
    emit(event, data, room=room)


# 客户端发送信令消息（offer）
# WebRTC 连接的发起方（通常是第一个开始连接的客户端）向对方发送的一个会话描述
@socketio.on("offer")
def handle_offer(offer):
    print(f"收到 offer: {offer}")
    if not request.sid in clients:
        return
    client = clients[request.sid]
    # 转发给目标客户端
    emit("offer", offer, room=client["room"])


# 客户端发送信令消息（answer）
# WebRTC 连接的接收方（通常是被呼叫方）对 offer 进行响应的 SDP 描述
@socketio.on("answer")
def handle_answer(answer_data):
    print(f"收到 answer: {answer_data}")
    client = clients[request.sid]
    # 转发给目标客户端
    emit("answer", answer_data, room=client["room"])


# 客户端发送 ICE candidates
# WebRTC 需要通过 NAT（网络地址转换）穿透，让两个客户端能够直接连接。ICE candidates（候选项）用于尝试各种可能的网络路径，直到找到一条可行的路径进行通信。
@socketio.on("ice_candidate")
def handle_ice_candidate(candidate_data):
    print(f"收到 ICE candidate: {candidate_data}")
    client = clients[request.sid]
    # 转发给目标客户端
    emit("ice_candidate", candidate_data, room=client["room"])


@socketio.on("connect")
def handle_connect():
    print("客户端已连接")


@socketio.on("joinRoom")
def on_join(data):
    room = data["room"]
    join_room(room)
    print(f"加入房间: {room}")
    sid = request.sid
    clients[sid] = {"sid": sid, "name": data["name"], "room": room}
    result = {"userNames": get_user_name(), "message": f"用户 {data['name']} 加入房间"}
    emit("joinRoom", result, room=room)


@socketio.on("message")
def handle_message(data):
    print(f"收到消息: {data}")
    client = clients[request.sid]
    emit(
        "message",
        {"name": client["name"], "message": f"{data['message']}"},
        room=client["room"],
    )


@socketio.on("updateName")
def handle_update_name(data):
    print(f"收到消息: {data}")
    sid = request.sid
    client = clients[sid]
    clients[sid]["name"] = data["name"]
    emit(
        "updateName",
        {"name": data["name"], "userNames": get_user_name()},
        room=client["room"],
    )


@socketio.on("file")
def handle_file(data):
    sid = request.sid
    client = clients[sid]

    if data["message"] == "start":
        result = {
            "name": client["name"],
            "fileName": data["fileName"],
            "type": data["type"],
            "size": data["size"],
            "message": "start",
        }
    elif data["message"] == "EOF":
        result = {
            "name": client["name"],
            "message": "EOF",
        }
    else:
        result = {
            "name": client["name"],
            "file": data["file"],
        }
        # print(f"收到消息: {data}")

    emit("file", result, room=client["room"])


@socketio.on("disconnect")
def handle_disconnect(message):
    sid = request.sid
    if sid in clients:
        client = clients[sid]
        print(f"客户端断开连接: {sid}")
        del clients[sid]  # 从字典中移除
        result = {
            "userNames": get_user_name(),
            "message": f"用户 {client['name']} 断开连接",
        }
        emit("joinRoom", result, room=client["room"])
    else:
        print("未知客户端断开连接")


# @socketio.on("leave")
# def on_leave(data):
#     leave_room(data["room"])
#     print(f"离开房间: {data["room"]}")
#     message = f"用户 {data["id"]} 离开房间"
#     result = {"message": message, "room": data["room"]}
#     emit("system", result, room=data["room"])


def get_user_name():
    return [client["name"] for client in clients.values()]


if __name__ == "__main__":
    port = 5000

    while True:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("0.0.0.0", port))  # 绑定端口
                print(f"正在端口 {port} 执行服务...")
                break
            except OSError:  # 端口被占用，尝试下一个
                print(f"端口 {port} 正在使用中，正在尝试 {port + 1}...")
                port += 1
    socketio.run(app, host="0.0.0.0", port=port, debug=True)
