const socket = io.connect(location.href);
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
function connectFlaskWebSocket() {
  socket.on("connect", function () {
    // console.log("Socket.IO 连接成功");
    socket.emit("joinRoom", { name: nickname, room: room });
    addSystemChatItem("已连接到服务器");
  });
  socket.on("joinRoom", function (data) {
    // console.log("收到房间消息:", data);
    users = data.userNames;
    addSystemChatItem(data.message);
    updateUsers(users);
  });
  socket.on("system", function (data) {
    // console.log("收到系统消息:", data);
    addSystemChatItem(data.message);
  });
  socket.on("message", function (data) {
    // console.log("收到消息:", data);
    if (data.name !== nickname) {
      createChatItem(data.name, data.message);
    }
  });
  socket.on("updateName", function (data) {
    updateUsers(data.userNames);
  });
  const receivedChunks = [];
  let fileInfo = {};
  let offset = 0;
  socket.on("file", function (data) {
    if (data.name === nickname) return;
    if (data.message === "start") {
      fileInfo = { ...data };
      createChatItem(fileInfo.name, "", true, fileInfo.fileName);
    } else if (data.message === "EOF") {
      //   console.log("文件接收完成！");
      const receivedFile = new Blob(receivedChunks);
      addReceiveFileChatItem(receivedFile, fileInfo.fileName, fileInfo.type);
      offset = 0;
      fileInfo = {};
      receivedChunks.length = 0;
    } else {
      receivedChunks.push(data.file);
      offset += data.file.byteLength;
      updateProgress(offset, fileInfo.size);
      // console.log(`接收数据块: ${offset}/${size} 字节`);
    }
  });
}
function sendText(event, data) {
  socket.emit(event, data);
}
function sendFile(file) {
  if (!file) return;
  // console.log(`正在发送文件: ${file.name} (大小: ${file.size} 字节)`);
  const chunkSize = 16384; // 每次发送 16KB，避免过载
  let offset = 0;
  data = {
    fileName: file.name,
    type: file.type,
    size: file.size,
    message: "start",
  };
  socket.emit("file", data);
  function readChunk() {
    const reader = new FileReader();
    reader.onload = function (event) {
      if (!event.target.result) return;
      data = {
        file: event.target.result,
        message: "Uploading",
      };
      socket.emit("file", data);
      offset += event.target.result.byteLength;
      updateProgress(offset, file.size);
      //   console.log(`已发送 ${offset}/${file.size} 字节`);
      if (offset < file.size) {
        readChunk();
      } else {
        // console.log("文件发送完成！");
        data = {
          message: "EOF",
        };
        socket.emit("file", data);
      }
    };
    reader.readAsArrayBuffer(file.slice(offset, offset + chunkSize));
  }
  readChunk();
}
async function initializePage() {
  createIceCandidate();
  socket.on("offer", (data) => {
    // console.log("收到offer信令消息:", data);
    if (peerConnection.signalingState === "stable") {
      createAnswer(data);
    }
    //   else {
    //   console.log("信令状态不稳定，稍后再设置remoteDescription");
    // }
  });
  socket.on("answer", function (data) {
    // console.log("收到 answer 信令消息:", data);
    peerConnection.setRemoteDescription(new RTCSessionDescription(data));
    //   .then(() => {
    //     console.log("设置 remoteDescription 成功");
    //   })
    //   .catch((error) => {
    //     console.error("设置 remoteDescription 失败", error);
    //   });
  });
  socket.on("ice_candidate", function (candidate) {
    // console.log("收到 ICE Candidate:", candidate);
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    //   .catch((error) => {
    // console.error("添加 ICE Candidate 失败", error);
    //   });
  });
  await createOffer();
}
async function createOffer() {
  try {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit("offer", offer); // 通过 WebSocket 发送给远端
  } catch (error) {
    console.error("创建 offer 时出错", error);
  }
}
async function createAnswer(offer) {
  try {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit("answer", answer);
  } catch (error) {
    // console.error("创建 answer 时出错", error);
  }
}
function createIceCandidate() {
  peerConnection.onicecandidate = function (event) {
    if (event.candidate) {
      socket.emit("ice_candidate", event.candidate);
    }
  };
}
