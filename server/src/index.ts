import z from "zod";
import { createRouter, route, startServer, type GetInputs } from "./server";

const router = {
  getId: route({
    handler: ({ socket }) => {
      return socket.data.id;
    },
  }),
  setId: route({
    validator: z.string(),
    handler: ({ input, socket }) => {
      server.sockets.delete(socket.data.id);
      server.sockets.set(input, socket);
      socket.data.id = input;

      return input;
    },
  }),
  offer: route({
    validator: z.object({
      to: z.string(),
      sdp: z.string(),
    }),
    handler: ({ input, socket }) => {
      const id = socket.data.id;

      if (!id) {
        return;
      }

      const destination = server.sockets.get(input.to);

      if (!destination) {
        return;
      }

      // server.send(destination, "offer", {
      //   from: id,
      //   sdp: input.sdp,
      //   messageId: input.messageId,
      // });
    },
  }),
  answer: route({
    validator: z.object({
      to: z.string(),
      sdp: z.string(),
    }),
    handler: ({ input, socket }) => {
      const id = socket.data.id;

      if (!id) {
        return;
      }

      const destination = server.sockets.get(input.to);

      if (!destination) {
        return;
      }

      // server.send(destination, "answer", {
      //   from: id,
      //   sdp: input.sdp,
      //   messageId: input.messageId,
      // });
    },
  }),
};

export type ClientToServer = GetInputs<typeof router>;
export type ServerToClient = {
  offer: {
    from: string;
    sdp: string;
    messageId: string;
  };
  answer: {
    from: string;
    sdp: string;
    messageId: string;
  };
  id: {
    id: string;
    messageId: string;
  };
};

const server = startServer<ServerToClient>({
  port: 3000,
  router: createRouter(router),
});
