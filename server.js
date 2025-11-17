import express from "express";

import expressWs from "express-ws";

// Create a server
const server = express();
// Added websocket features
expressWs(server);

const port = 3000;

let clients = {};

let messages = [];

let global_id = 0;

// Set up a websocket endpoint
server.ws("/", (client) => {
  // Figure out the client's id
  let id = global_id++;

  send(client, {
    type: "welcome",
    id,
    connected: Object.keys(clients),
    messages,
  });

  broadcast({ type: "connected", id });

  connections.push(ws);

  ws.on("client_message", (dataString) => {
    let { content } = JSON.stringify(dataString);
    let message = { content, time: Date.now(), sender: id };

    messages.push(message);

    broadcast({
      type: "server_message",
      ...message,
    });
  });

  ws.on("close", () => {
    delete clients[id];
    broadcast({ type: "disconnected", id });
  });
});

// Start the server
server.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});

function send(client, message) {
  client.send(JSON.stringify(message));
}

function broadcast(message) {
  for (let client of Object.values(clients)) {
    send(client, message);
  }
}
