import { TypedSocket } from "./typed-socket";
import { getAnswer, getOffer } from "./peer-utils";
import type { ClientToServer, ServerToClient } from "../../server/src/index";

type Config = {
  id: string;
  serverAddress: string;
};

export class SignalingClient {
  id: string;
  readonly socket: TypedSocket<ServerToClient, ClientToServer>;

  private constructor(config: Config) {
    this.id = config.id;
    this.socket = new TypedSocket(config.serverAddress);
  }

  static async create(serverAddress: string) {
    const peerId = crypto.randomUUID();
    const messageId = crypto.randomUUID();

    const signaling = new SignalingClient({
      id: peerId,
      serverAddress,
    });

    return new Promise<SignalingClient>((resolve) => {
      signaling.socket.send({
        type: "setId",
        body: peerId,
      });
    });
  }

  async answer(offer: ServerToClient["offer"]): Promise<RTCDataChannel> {
    const connection = new RTCPeerConnection();

    await connection.setRemoteDescription({
      type: "offer",
      sdp: offer.sdp,
    });

    const answer = await getAnswer(connection);

    this.socket.send({
      type: "answer",
      to: offer.from,
      sdp: answer,
      messageId: offer.messageId,
    });

    return new Promise((resolve) => {
      connection.ondatachannel = (event) => {
        resolve(event.channel);
      };
    });
  }

  async connect(otherPeerId: string): Promise<RTCDataChannel> {
    const connection = new RTCPeerConnection();
    const channel = connection.createDataChannel("channel");
    const offer = await getOffer(connection);

    const messageId = crypto.randomUUID();

    await this.socket.send({
      type: "offer",
      to: otherPeerId,
      sdp: offer,
      messageId: messageId,
    });

    this.socket.on("answer", (data) => {
      if (data.messageId !== messageId) {
        return;
      }

      connection.setRemoteDescription({
        type: "answer",
        sdp: data.sdp,
      });
    });

    return new Promise((resolve) => {
      channel.onopen = () => {
        resolve(channel);
      };
    });
  }

  connectRequest(fn: (offer: ServerToClient["offer"]) => void) {
    return this.socket.on("offer", fn);
  }
}
