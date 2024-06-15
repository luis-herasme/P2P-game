import type { ServerWebSocket } from "bun";
import z from "zod";

type SocketData = {
  id: string;
};

const messageValidator = z.object({
  to: z.string(),
  data: z.string(),
  type: z.string(),
  messageId: z.string(),
});

const sockets: Map<string, ServerWebSocket<SocketData>> = new Map();

Bun.serve<SocketData>({
  fetch(req, server) {
    if (server.upgrade(req)) return;
    return new Response("Upgrade failed", { status: 500 });
  },
  websocket: {
    open(ws) {
      ws.data = {
        id: crypto.randomUUID(),
      };

      sockets.set(ws.data.id, ws);

      ws.send(
        JSON.stringify({
          id: ws.data.id,
          type: "id",
        })
      );
    },
    message(ws, message) {
      try {
        const result = messageValidator.parse(JSON.parse(message.toString()));

        sockets.get(result.to)?.send(
          JSON.stringify({
            ...result,
            from: ws.data.id,
          })
        );
      } catch (e) {
        console.log("Error: ", e);
      }
    },
    close(ws) {
      sockets.delete(ws.data.id);
    },
  },
});
