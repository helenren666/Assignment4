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

  console.log(`${id} connected`)

  send(client, {
    type: "welcome",
    id,
    connected: Object.keys(clients),
    messages,
  });

  broadcast({ type: "connected", id });

  clients[id] = client;

  client.on("message", (dataString) => {
    let event = JSON.parse(dataString);

    if (event.type === "client_message") {
      let { content } = event;

      let message = { content, time: Date.now(), sender: id };

      messages.push(message);

      broadcast({
        type: "server_message",
        ...message,
      });
    }
  });

  client.on("close", () => {
    console.log(`${id} disconnected`)
    delete clients[id];
    broadcast({ type: "disconnected", id });
  });
});

// Start the server
server.listen(port, "0.0.0.0", () => {});

function send(client, message) {
  client.send(JSON.stringify(message));
}

function broadcast(message) {
  for (let client of Object.values(clients)) {
    send(client, message);
  }
}
