let users = [];
let room = "room1";
let nickname = Math.floor(Math.random() * 1000000);
let data = {};
const icons = {
  copy: `<svg height="30px" viewBox="0 -960 960 960" width="30px" fill="#CCCCCC"><path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z"/></svg>`,
  copySuccess: `<svg height="30px" viewBox="0 -960 960 960" width="30px" fill="#CCCCCC"><path d="M400-304 240-464l56-56 104 104 264-264 56 56-320 320Z"/></svg>`,
};
connectFlaskWebSocket();
initializePage();
function createChatItem(name, message, isFile = false, fileName = "") {
  const chatBox = document.querySelector(".chat-wrapper");
  const chatItem = document.createElement("div");
  chatItem.className = "chat-item";
  const chatItemNews = document.createElement("div");
  chatItemNews.className = `chat-item-news${
    name === nickname ? " my_user" : ""
  }`;
  if (isFile) {
    chatItemNews.innerHTML = `
        <div class="chat-item-news-name">${name}</div>
        <div class="chat-item-news-content${
          name === nickname ? " my_user" : ""
        }">
        <div>${fileName}</div>
        <progress value="0" max="100"></progress>
        <span>0%</span>
        </div>`;
  } else {
    msg = message
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/ /g, "&nbsp;");
    chatItemNews.innerHTML = `
        <div class="chat-item-news-name">${name}</div>
        <div class="chat-item-news-content${
          name === nickname ? " my_user" : ""
        }">${msg}</div>`;
    const copyButton = document.createElement("button");
    copyButton.className = "copy-btn";
    copyButton.innerHTML = icons.copy;
    copyButton.addEventListener("click", (e) => copyText(e, message));
    chatItemNews.append(copyButton);
  }
  chatItem.append(chatItemNews);
  chatBox.append(chatItem);
  chatBox.scrollTop = chatBox.scrollHeight;
}
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
}
function showNicknameModal() {
  const modal = document.getElementById("nicknameModal");
  const input = document.getElementById("nicknameInput");
  input.value = nickname;
  modal.style.display = "block";
  setTimeout(() => input.focus(), 0);
  input.onkeydown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      saveNickname();
    }
  };
}
function closeNicknameModal() {
  const modal = document.getElementById("nicknameModal");
  const input = document.getElementById("nicknameInput");
  modal.style.display = "none";
  input.onkeydown = null;
}
function saveNickname() {
  const input = document.getElementById("nicknameInput");
  const nickname = input.value.trim();
  data = { name: nickname };
  sendText("updateName", data);
  closeNicknameModal();
}
function updateProgress(offset, endOffset) {
  const chatItemNews = document.getElementsByClassName("chat-item-news");
  const chatItem = chatItemNews[chatItemNews.length - 1];
  const progress = chatItem.querySelector("progress");
  const progressText = chatItem.querySelector("span");
  const pace = parseInt((offset / endOffset) * 100);
  progress.value = pace;
  progressText.textContent = pace + "%";
}
document.addEventListener("DOMContentLoaded", () => {
  document
    .querySelector(".nickname-btn")
    .addEventListener("click", showNicknameModal);
  document.querySelector(".file-btn").addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.addEventListener("change", (e) => {
      if (e.target.files.length > 0) {
        createChatItem(nickname, "", true, e.target.files[0].name);
        sendFile(e.target.files[0]);
      }
    });
    input.click();
  });
  document
    .querySelector(".toggle-users-btn")
    .addEventListener("click", toggleUsersList);
  document
    .querySelector(".mobile-overlay")
    .addEventListener("click", toggleUsersList);
  document.body.addEventListener("dragenter", (e) => {
    e.preventDefault();
    document.body.classList.add("dragover");
  });
  document.body.addEventListener("dragover", (e) => e.preventDefault());
  document.body.addEventListener("dragleave", (e) => {
    if (!document.body.contains(e.relatedTarget)) {
      document.body.classList.remove("dragover");
    }
  });
  document.body.addEventListener("drop", (e) => {
    e.preventDefault();
    document.body.classList.remove("dragover");
    if (e.dataTransfer.files.length > 0) {
      createChatItem(nickname, "", true, e.dataTransfer.files[0].name);
      sendFile(e.dataTransfer.files[0]);
    }
  });
});
function toggleUsersList() {
  document.body.classList.toggle("show-users");
}
function sendMessage() {
  createChatItem(nickname, messageInput.value);
  socket.send({ message: messageInput.value });
  messageInput.value = "";
}
async function copyText(e, msg) {
  // 只能在 HTTPS 或 localhost 下使用
  // const button = e.currentTarget; // 先保存按钮元素
  // navigator.clipboard.writeText(msg).then(() => {
  //   button.innerHTML = icons.copySuccess;
  //   setTimeout(() => (button.innerHTML = icons.copy), 1000);
  // });

  const button = e.currentTarget;
  const textArea = document.createElement("textarea");
  textArea.value = msg;
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  document.body.removeChild(textArea);
  button.innerHTML = icons.copySuccess;
  setTimeout(() => (button.innerHTML = icons.copy), 1000);
}
function enterTxt(event) {
  if (event.shiftKey && event.keyCode === 13) {
  } else if (event.keyCode === 13) {
    sendMessage();
    event.preventDefault();
  }
}
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
