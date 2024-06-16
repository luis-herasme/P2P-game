import { EventEmitter } from "./event-emitter";

export class TypedSocket<ServerToClient, ClientToServer> {
  readonly socket: WebSocket;
  readonly eventEmitter = new EventEmitter();

  constructor(serverAddress: string) {
    this.socket = new WebSocket(serverAddress);

    this.socket.onmessage = async (message) => {
      const json = JSON.parse(message.data);

      if (json.type) {
        this.eventEmitter.emit(json.type, json);
      }

      if (json.messageId) {
        this.eventEmitter.emit(json.messageId, json);
      }
    };
  }

  on<T extends keyof ServerToClient>(
    type: T,
    fn: (data: ServerToClient[T]) => void
  ): () => void {
    this.eventEmitter.on(type as string, fn);

    return () => {
      this.eventEmitter.off(type as string, fn);
    };
  }

  once<T extends keyof ServerToClient>(
    type: T,
    fn: (data: ServerToClient[T]) => void
  ) {
    this.eventEmitter.once(type as string, fn);
  }

  off<T extends keyof ServerToClient>(
    type: T,
    fn: (data: ServerToClient[T]) => void
  ) {
    this.eventEmitter.off(type as string, fn);
  }

  send<T extends keyof ClientToServer>(
    message: {
      type: T;
      body: ClientToServer[T] 
    },
    callback?: (data: any) => void
  ) {
    if (callback) {
      const messageId = crypto.randomUUID();

      this.socket.send(
        JSON.stringify({
          ...message,
          messageId,
        })
      );

      this.socket.once(messageId, callback);
    } else {
      this.socket.send(JSON.stringify(message));
    }
  }
}
