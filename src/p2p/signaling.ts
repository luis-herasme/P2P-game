import { PeerConnection } from "./connection";
import { EventEmitter } from "./event-emitter";

export class SignalingClient {
  readonly socket: WebSocket;
  readonly eventEmitter = new EventEmitter();

  private constructor(serverAddr: string) {
    this.socket = new WebSocket(serverAddr);

    this.socket.onmessage = async (message) => {
      const json = JSON.parse(message.data);
      this.eventEmitter.emit(json.type, json);
    };

    this.eventEmitter.on("answer", (answer) => {
      this.eventEmitter.emit(answer.messageId, answer);
    });

    this.eventEmitter.on("offer", async (offer) => {
      const connection = new PeerConnection();

      await connection.rtcConnection.setRemoteDescription({
        type: "offer",
        sdp: offer.data,
      });

      const answer = await connection.getAnswer();
      this.sendAnswer(offer, answer);

      connection.rtcConnection.addEventListener("connectionstatechange", () => {
        if (connection.rtcConnection.connectionState === "connected") {
          this.eventEmitter.emit("offer-listener", connection);
        }
      });
    });
  }

  id = "";

  static async create(serverAddress: string) {
    const signaling = new SignalingClient(serverAddress);

    return new Promise<SignalingClient>((resolve) => {
      signaling.eventEmitter.once("id", (body) => {
        signaling.id = body.id;
        resolve(signaling);
      });
    });
  }

  connectRequest(fn: (connection: PeerConnection) => void) {
    this.eventEmitter.on("offer-listener", fn);
    return () => this.eventEmitter.off("offer-listener", fn);
  }

  async connect(otherPeerId: string): Promise<RTCDataChannel> {
    const connection = new PeerConnection();
    const channel = connection.getChannel();

    const offer = await connection.getOffer();
    const answer = await this.sendOffer(otherPeerId, offer);

    await connection.rtcConnection.setRemoteDescription({
      type: "answer",
      sdp: answer,
    });

    return channel;
  }

  private async sendRaw(data: MessageToServer) {
    this.socket.send(JSON.stringify(data));
  }

  async sendOffer(to: string, offer: string) {
    const messageId = crypto.randomUUID();

    return await new Promise<string>((resolve) => {
      this.sendRaw({
        to,
        data: offer,
        type: "offer",
        messageId,
      });

      this.eventEmitter.once(messageId, (answer) => resolve(answer.data));
    });
  }

  async sendAnswer(offer: MessageFromServer, answer: string) {
    this.sendRaw({
      to: offer.from,
      data: answer,
      type: "answer",
      messageId: offer.messageId,
    });
  }
}

type MessageToServer = {
  to: string;
  data: string;
  type: "offer" | "answer";
  messageId: string;
};

type MessageFromServer = {
  to: string;
  data: string;
  type: "offer" | "answer";
  messageId: string;

  // Added by the signaling server
  from: string;
};
