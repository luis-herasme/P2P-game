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
  }

  async answer(offer: Offer) {
    const connection = new PeerConnection();

    await connection.rtcConnection.setRemoteDescription({
      type: "offer",
      sdp: offer.data,
    });

    const answer = await connection.getAnswer();
    this.sendAnswer(offer, answer);

    return new Promise<RTCDataChannel>((resolve) => {
      connection.rtcConnection.ondatachannel = (event) =>
        resolve(event.channel);
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

  connectRequest(fn: (offer: Offer) => void) {
    this.eventEmitter.on("offer", fn);
    return () => this.eventEmitter.off("offer", fn);
  }

  async connect(otherPeerId: string): Promise<RTCDataChannel> {
    const connection = new PeerConnection();
    const channel = connection.rtcConnection.createDataChannel("channel");

    const offer = await connection.getOffer();
    const answer = await this.sendOffer(otherPeerId, offer);

    await connection.rtcConnection.setRemoteDescription({
      type: "answer",
      sdp: answer,
    });

    return new Promise<RTCDataChannel>((resolve) => {
      channel.onopen = () => resolve(channel);
    });
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

type MessageFromServer = Offer | Answer;

type Offer = {
  to: string;
  data: string;
  type: "offer";
  messageId: string;
  from: string;
};

type Answer = {
  to: string;
  data: string;
  type: "answer";
  messageId: string;
  from: string;
};
