# Chat Protocol

All messages are sent as JSON strings.

## Server

### Connection

On connection, the server assigns the client an id number
and sends this message:

```json
{
  "type": "welcome",
  "id": <number>,
  "connected": <number[]>,
  "messages": [{
      "content": <string>,
      "time": <number> // milliseconds since "unix epoch" 1/1/1970
      "sender": <number>
  }]
}
```

The server also sends the following to all the other clients:

```json
{
  "type": "connected",
  "id": <number>
}
```

### Sending a Message

When the server receives a message, it sends out the following
event to all clients:

```json
{
  "type": "server_message",
  "content": <string>,
  "time": <number>,
  "sender": <number>
}
```

### Disconnect

When a client disconnects, the server sends all clients:

```json
{
  "type": "disconnected",
  "id": <number>
}
```

## Client

### Connection

### Sending a Message

```json
{
  "type": "client_message",
  "content": <string>
}
```

### Disconnect Event