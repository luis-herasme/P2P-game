import type { z } from "zod";
import type { Server, ServerWebSocket } from "bun";

type SocketData = {
  id: string;
};

type ServerWithSockets<ServerMessages> = Server & {
  sockets: Map<string, ServerWebSocket<SocketData>>;
  send: <T extends keyof ServerMessages>(
    socket: ServerWebSocket<any>,
    type: T,
    data: ServerMessages[T]
  ) => void;
};

type Route<T = any, R = any> = {
  validator?: z.ZodType<T>;
  handler: (context: { input: T; socket: ServerWebSocket<SocketData> }) => R;
};

export type GetInputs<T extends Record<string, Route>> = {
  [K in keyof T]: T[K]["validator"] extends undefined
    ? { type: K }
    : { type: K; body: z.output<Exclude<T[K]["validator"], undefined>> };
};

export type GetOutputs<T extends Record<string, Route>> = {
  [K in keyof T]: ReturnType<T[K]["handler"]>;
};

function tryJSONParse(data: string): unknown {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// type GetRoutes

export function createRouter<T extends Record<string, Route>>(routes: T) {
  return (data: string, socket: ServerWebSocket<SocketData>) => {
    const json = tryJSONParse(data);

    if (
      !json ||
      typeof json !== "object" ||
      !("type" in json) ||
      typeof json.type !== "string"
    ) {
      return;
    }

    const route = routes[json.type];

    if (!route) {
      return;
    }

    if (route.validator) {
      const result = route.validator.safeParse(json);

      if (result.success) {
        route.handler({ input: result.data, socket });
      }
    } else {
      route.handler({ input: undefined, socket });
    }
  };
}

export function route<T = undefined>(input: {
  validator?: z.ZodType<T>;
  handler: (context: { input: T; socket: ServerWebSocket<SocketData> }) => void;
}): Route<T> {
  return input;
}

export function startServer<ServerMessages>({
  port,
  router,
}: {
  port: number;
  router: (data: string, socket: any) => void;
}): ServerWithSockets<ServerMessages> {
  const sockets: Map<string, ServerWebSocket<SocketData>> = new Map();

  const server = Bun.serve<SocketData>({
    port,
    fetch(req, server) {
      if (server.upgrade(req)) return;
      return new Response("Upgrade failed", { status: 500 });
    },
    websocket: {
      open(ws) {
        ws.data = { id: crypto.randomUUID() };
        sockets.set(ws.data.id, ws);
      },
      message: (ws, message) => {
        router(message.toString(), ws);
      },
      close: (ws) => {
        sockets.delete(ws.data.id);
      },
    },
  });

  // @ts-ignore
  server.sockets = sockets;
  // @ts-ignore
  server.send = (socket, data) => socket.send(JSON.stringify(data));

  return server as ServerWithSockets<ServerMessages>;
}
