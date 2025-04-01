const peerConnectionConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" }, // Google STUN 服务器
    {
      urls: "turn:turn.anyfirewall.com:443?transport=tcp", // 你的 TURN 服务器地址
      username: "webrtc", // TURN 用户名
      credential: "webrtc", // TURN 密码
    },
  ],
};
let peerConnection = new RTCPeerConnection(peerConnectionConfig);

let localStream = null;
let remoteStream = null;

// 连接FlaskWebSocket
function connectFlaskWebSocket() {
  //   console.log(socket);

  socket.on("connect", function () {
    console.log("Socket.IO 连接成功");
    socket.emit("joinRoom", { name: nickname, room: room }); // 加入房间

    addSystemChatItem("已连接到服务器");
  });

  // 接收到房间消息
  socket.on("joinRoom", function (data) {
    console.log("收到房间消息:", data);

    users = data.userNames;

    addSystemChatItem(data.message);
    updateUsers(users);
  });

  // 接收到系统消息
  socket.on("system", function (data) {
    console.log("收到系统消息:", data);

    addSystemChatItem(data.message);
  });

  // 接收到用户消息
  socket.on("message", function (data) {
    console.log("收到消息:", data);
    if (data.name !== nickname) {
      addUserChatItem(data.name, data.message);
    }
  });
  // 接收到新用户名
  socket.on("updateName", function (data) {
    users = data.userNames;
    updateUsers(users);
    nickname = data.name;
  });

  // 接收到文件
  const receivedChunks = [];
  let name = "";
  let fileName = "";
  let type = "";
  let size = 0;
  let offset = 0;
  socket.on("file", function (data) {
    if (data.name !== nickname) {
      if (data.message === "start") {
        name = data.name;
        fileName = data.fileName;
        type = data.type;
        size = data.size;

        addFileChatItem(name, fileName);
      } else if (data.message === "EOF") {
        // 文件传输结束，合并数据
        const receivedFile = new Blob(receivedChunks);

        updateProgress(offset, size);
        addReceiveFileChatItem(receivedFile, fileName, type);
        offset = 0;
        size = 0;

        console.log("文件接收完成！");
        receivedChunks.length = 0; // 清空缓存
      } else {
        receivedChunks.push(data.file);
        offset += data.file.byteLength;
        updateProgress(offset, size);
        // console.log(`接收数据块: ${offset}/${size} 字节`);
      }
    }
  });
}

function sendText(event, data) {
  socket.emit(event, data);
}

function sendFile(file) {
  if (file) {
    console.log(`正在发送文件: ${file.name} (大小: ${file.size} 字节)`);
    // console.log(file);

    const chunkSize = 16384; // 每次发送 16KB，避免过载
    let offset = 0;
    // const chatItemNews = document.getElementsByClassName("chat-item-news");
    // const chatItem = chatItemNews[chatItemNews.length - 1];

    // console.log(chatItem);

    // const progress = chatItem.querySelector("progress");
    data = {
      fileName: file.name,
      type: file.type,
      size: file.size,
      message: "start",
    };
    socket.emit("file", data);

    function readChunk() {
      const reader = new FileReader();
      const slice = file.slice(offset, offset + chunkSize);

      reader.onload = function (event) {
        if (event.target.result) {
          // socket.send(event.target.result); // 发送数据
          data = {
            file: event.target.result,
            message: "Uploading",
          };

          socket.emit("file", data);

          offset += event.target.result.byteLength;

          updateProgress(offset, file.size);

          //   progress.value = (offset / file.size) * 100;
          //   progress.title = parseInt(progress.value / 1) + "%";

          //   console.log(progress.title);

          //   console.log(`已发送 ${offset}/${file.size} 字节`);

          if (offset < file.size) {
            readChunk(); // 继续发送
          } else {
            console.log("文件发送完成！");
            //   socket.send("EOF"); // 发送结束标志
            // progress.value = 100;
            // progress.title = 100 + "%";
            updateProgress(offset, file.size);
            data = {
              message: "EOF",
            };
            socket.emit("file", data);
          }
        }
      };

      reader.readAsArrayBuffer(slice);
    }

    readChunk();
  }
}

// 初始化
async function initializePage() {
  // 连接建立后，发送 Offer 或接收 Answer
  createIceCandidate();

  socket.on("offer", function (data) {
    console.log("收到offer信令消息:", data);

    // 等待状态变为 stable，才能设置 remoteDescription
    if (peerConnection.signalingState === "stable") {
      createAnswer(data);
    } else {
      console.log("信令状态不稳定，稍后再设置remoteDescription");
    }
  });
  socket.on("answer", function (data) {
    console.log("收到 answer 信令消息:", data);
    // 处理 answer 信令
    console.log("收到 answer 信令消息:", data);
    // 设置远程描述
    peerConnection
      .setRemoteDescription(new RTCSessionDescription(data))
      .then(() => {
        console.log("设置 remoteDescription 成功");
      })
      .catch((error) => {
        console.error("设置 remoteDescription 失败", error);
      });
  });

  socket.on("ice_candidate", function (candidate) {
    console.log("收到 ICE Candidate:", candidate);
    peerConnection
      .addIceCandidate(new RTCIceCandidate(candidate))
      .catch((error) => {
        console.error("添加 ICE Candidate 失败", error);
      });
  });

  await createOffer();
}

// async function createOffer() {
//   await peerConnection
//     .createOffer()
//     .then((offer) => {
//       peerConnection.setLocalDescription(offer);

//       socket.emit("offer", offer); // 通过 WebSocket 发送给远端
//       sendOffer = offer;
//     })
//     .catch((error) => {
//       console.error("创建 offer 时出错", error);
//     });
// }

// 创建 offer
async function createOffer() {
  try {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit("offer", offer); // 通过 WebSocket 发送给远端
  } catch (error) {
    console.error("创建 offer 时出错", error);
  }
}

// 创建 answer
function createAnswer(offer) {
  peerConnection
    .setRemoteDescription(offer)
    .then(() => {
      return peerConnection.createAnswer();
    })
    .then((answer) => {
      peerConnection.setLocalDescription(answer); // 设置本地描述
    })
    .then(() => {
      socket.emit("answer", peerConnection.localDescription); // 通过 WebSocket 发送给远端
    })
    .catch((error) => {
      console.error("创建 answer 时出错", error);
    });
}

// 创建 ICE candidate
function createIceCandidate() {
  // 创建 ICE candidate
  peerConnection.onicecandidate = function (event) {
    if (event.candidate) {
      socket.emit("ice_candidate", event.candidate); // 发送给远端
    }
  };
}
