import { SignalingClient } from "./p2p/signaling.ts";

const signaling = await SignalingClient.create("ws:localhost:3000");

console.log("My peer ID: ", signaling.id);

async function connect() {
  const otherPeerId = prompt("Other peer id");
  if (!otherPeerId) return;

  const connection = await signaling.connect(otherPeerId);

  setInterval(() => {
    connection.send("test");
  }, 1000);
}

signaling.connectRequest((connection) => {
  setInterval(() => {
    connection.channel?.send("test");
  }, 1000);
});

const connectButton = document.createElement("button");
connectButton.innerText = "Connect";
document.body.appendChild(connectButton);
connectButton.addEventListener("click", connect);
