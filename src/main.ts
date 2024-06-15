import { SignalingClient } from "./p2p/signaling.ts";

const signaling = await SignalingClient.create("ws:localhost:3000");

async function connect() {
  const otherPeerId = prompt("Other peer id")!;
  const connection = await signaling.connect(otherPeerId);
  connection.onmessage = (message) => console.log("Message: ", message.data);

  connection.send("Hello");
}

signaling.connectRequest(async (offer) => {
  const connection = await signaling.answer(offer);
  connection.onmessage = (message) => console.log("Message: ", message.data);

  connection.send("Hello! I accepted your connection offer");
});

const connectButton = document.getElementById("connect-button")!;
connectButton.addEventListener("click", connect);
