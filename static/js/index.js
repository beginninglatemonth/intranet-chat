let users = [];

let room = "room1";
let nickname = Math.floor(Math.random() * 1000000);

let data = {};

const socket = io.connect(location.href);

//复制按钮图标
const copyButtonIcon = `<svg height="30px" viewBox="0 -960 960 960" width="30px" fill="#CCCCCC"><path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z"/></svg>`;

//复制按钮成功图标
const copyButtonSuccessIcon = `<svg height="30px" viewBox="0 -960 960 960" width="30px" fill="#CCCCCC"><path d="M400-304 240-464l56-56 104 104 264-264 56 56-320 320Z"/></svg>`;
connectFlaskWebSocket();
initializePage();

function createUserChatItem(name) {
  const chatBox = document.querySelector(".chat-wrapper");
  const chatItem = document.createElement("div");
  chatItem.className = "chat-item";
  const chatItemNews = document.createElement("div");
  chatItemNews.className = `chat-item-news${
    name === nickname ? " my_user" : ""
  }`;

  chatItem.append(chatItemNews);
  chatBox.append(chatItem);
  chatBox.scrollTop = chatBox.scrollHeight;

  return chatItemNews; // 返回 chatItemNews 以便后续填充内容
}

//添加系统消息
function addSystemChatItem(message) {
  const chatBox = document.querySelector(".chat-wrapper");
  const chatItem = document.createElement("div");
  chatItem.className = "chat-item";

  chatItem.innerHTML = `
        <div class="chat-item-system">
        ${message}
        </div>`;

  chatBox.append(chatItem);
  chatBox.scrollTop = chatBox.scrollHeight;
}

//
//
//
//
//
//
//
//

// 添加用户消息到窗口
function addUserChatItem(name, message) {
  const chatBox = document.querySelector(".chat-wrapper");
  const chatItem = document.createElement("div");
  chatItem.className = "chat-item";
  const chatItemNews = document.createElement("div");
  chatItemNews.className = `chat-item-news${
    name === nickname ? " my_user" : ""
  }`;
  msg = message
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/ /g, "&nbsp;");
  const copyText = message;

  if (name === nickname) {
    chatItemNews.innerHTML = `
  <div class="chat-item-news-name">${name}</div>
  <div class="chat-item-news-content my_user">${message}</div>
    `;
  } else {
    chatItemNews.innerHTML = `
  <div class="chat-item-news-name ">${name} :</div>
  <div class="chat-item-news-content">${message}</div>
    `;
  }
  const copyButton = document.createElement("button");
  copyButton.className = "copy-btn";
  copyButton.innerHTML = copyButtonIcon;

  copyButton.addEventListener("click", function (e) {
    copy(e, copyText);
  });
  chatItemNews.append(copyButton);
  chatItem.append(chatItemNews);

  chatBox.append(chatItem);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function addFileChatItem(name, fileName) {
  const chatItemNews = createUserChatItem(name);

  chatItemNews.innerHTML = `
  <div class="chat-item-news-name">${name}</div>
  <div class="chat-item-news-content${name === nickname ? " my_user" : ""}">
  <div>${fileName}</div>
  <progress value="0" max="100"></progress>
  <span>0%</span>
  </div> `;
}

function addReceiveFileChatItem(blob, fileName, fileType) {
  const fileURL = URL.createObjectURL(blob);

  const chatItems = document.getElementsByClassName("chat-item");
  const chatItem = chatItems[chatItems.length - 1];
  const chatItemNews = chatItem.getElementsByClassName("chat-item-news")[0];

  chatItemNews.innerHTML += `
    <div class="copy-btn">
    <a class="file" href="${fileURL}" download="${fileName}">下载</a></div>
    `;

  if (fileType.startsWith("image/")) {
    chatItem.innerHTML += `<img src="${fileURL}" style="max-width: 100%; height: auto;">`;
  } else if (fileType.startsWith("video/")) {
    chatItem.innerHTML += `<video controls src="${fileURL}" style="max-width: 100%; height: auto;"></video>`;
  } else if (fileType.startsWith("audio/")) {
    chatItem.innerHTML += `<audio controls src="${fileURL}"></audio>`;
  }
  //   else if (fileType === "application/pdf") {
  //     chatItem.innerHTML += `<embed src="${fileURL}" width="100%" height="500px">`;
  //   }
}

function showNicknameModal() {
  const modal = document.getElementById("nicknameModal");
  const input = document.getElementById("nicknameInput");
  input.value = nickname;
  modal.style.display = "block";

  // 自动获取焦点
  setTimeout(() => input.focus(), 0);

  // 添加回车事件监听
  input.onkeydown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault(); // 阻止默认的回车行为
      saveNickname();
    }
  };
}

function closeNicknameModal() {
  const modal = document.getElementById("nicknameModal");
  const input = document.getElementById("nicknameInput");
  modal.style.display = "none";

  // 清除回车事件监听
  input.onkeydown = null;
}

function saveNickname() {
  const input = document.getElementById("nicknameInput");
  const nickname = input.value.trim();
  data = { name: nickname };
  sendText("updateName", data);
  closeNicknameModal();
}

// ... 添加昵称按钮事件监听
document.addEventListener("DOMContentLoaded", () => {
  document
    .querySelector(".nickname-btn")
    .addEventListener("click", showNicknameModal);
});

function updateProgress(offset, endOffset) {
  const chatItemNews = document.getElementsByClassName("chat-item-news");
  const chatItem = chatItemNews[chatItemNews.length - 1];
  const progress = chatItem.querySelector("progress");
  const progressText = chatItem.querySelector("span");

  pace = parseInt((offset / endOffset) * 100);
  progress.value = pace;
  progressText.textContent = pace + "%";
}

//
document.addEventListener("DOMContentLoaded", () => {
  document.querySelector(".file-btn").addEventListener("click", async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = async (e) => {
      if (e.target.files.length > 0) {
        file = e.target.files[0];
        // addUserChatItem(nickname, "[文件]" + e.target.files[0].name);

        addFileChatItem(nickname, file.name);
        sendFile(file);
      }
    };
    input.click();
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const dropArea = document.body;

  //  监听拖拽进入
  document.body.addEventListener("dragenter", (e) => {
    e.preventDefault();
    dropArea.classList.add("dragover");
    console.log(e);
  });

  //  监听拖拽悬停
  document.body.addEventListener("dragover", (e) => {
    e.preventDefault();
    console.log(e);
  });

  //  监听拖拽离开
  document.body.addEventListener("dragleave", (e) => {
    if (!dropArea.contains(e.relatedTarget)) {
      dropArea.classList.remove("dragover");
      console.log(e);
    }
  });
  //  监听放置文件
  document.body.addEventListener("drop", (e) => {
    e.preventDefault();
    dropArea.classList.remove("dragover");

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      //   console.log("收到文件:", files);
      addFileChatItem(nickname, files[0].name);
      sendFile(files[0]);
    }
  });
});

// let droptarget = document.body;
// //监听拖拽事件，实现文件上传。
// async function handleEvent(event) {
//   console.log("监听拖拽事件");
//   event.preventDefault();
//   if (event.type === "drop") {
//     console.log("OK");
// droptarget.classList.remove("dragover");

//   if (event.dataTransfer.files.length > 0) {
//     await sendFile(event.dataTransfer.files[0]);
//   }
// } else if (event.type === "dragleave") {
//   droptarget.classList.remove("dragover");
// } else {
//   droptarget.classList.add("dragover");
//   }
// }

// 发送消息到服务器
function sendFlaskWebSocketMessage(message) {
  const data = { message: message };
  console.log("发送消息:", data);

  socket.send(data);

  // sendFlaskWebSocket("message", data);
}

// 发送消息
function sendMessage() {
  const message = messageInput.value;

  addUserChatItem(nickname, message);

  messageInput.value = "";
  sendFlaskWebSocketMessage(message);
}

//复制
async function copy(e, msg) {
  const currentTarget = e.currentTarget;

  try {
    await navigator.clipboard.writeText(msg);
    //复制成功-替换图标
    copySuccess();
  } catch (error) {}

  function copySuccess() {
    currentTarget.innerHTML = copyButtonSuccessIcon;
    const timer = setTimeout(() => {
      currentTarget.innerHTML = copyButtonIcon;
      clearTimeout(timer);
    }, 1000);
  }
}

// 发送消息按钮
function sendMessageButton() {
  //   if (messageInput.value.trim()) {
  //     // 只有当消息不为空时才发送
  //     sendMessage();
  //   }

  sendMessage();
}

// textarea 文本框 messageInput
function enterTxt(event) {
  if (event.shiftKey && event.keyCode === 13) {
  } else if (event.keyCode === 13) {
    //回车
    sendMessage();
    event.preventDefault();
  }
}

// 用户列表
function updateUsers(users) {
  document.querySelector("#users").innerHTML = users
    .map((u) => {
      isConnected = true;
      //   isConnected = false;
      const statusClass = isConnected ? "connected" : "disconnected";
      const statusIcon = `<svg height="24px" viewBox="0 -960 960 960" width="24px" fill="#75FB4C"><path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>`;
      return `
        <li>
          <span class="connection-status ${statusClass}">
            ${statusIcon}
          </span>
          ${u}${u === nickname ? "（我）" : ""}
        </li>
      `;
    })
    .join("");
}
function toggleUsersList() {
  document.body.classList.toggle("show-users");
}
// 为切换按钮和叠加层添加事件侦听器
document.addEventListener("DOMContentLoaded", function () {
  console.log();

  const toggleBtn = document.querySelector(".toggle-users-btn");
  const overlay = document.querySelector(".mobile-overlay");

  toggleBtn.addEventListener("click", toggleUsersList);
  overlay.addEventListener("click", toggleUsersList);
});
