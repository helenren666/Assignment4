import { useState, useEffect } from "react";

export function App() {
  let [id, setId] = useState();
  let [connected, setConnected] = useState([]);
  let [messages, setMessages] = useState([]);

  let [socket, setSocket] = useState(null);

  useEffect(() => {
    // EXERCISE 1: Replace this with Matthew's current IP address
    let socket = new WebSocket("ws://localhost:3000/");

    function handler({ data }) {
      let event = JSON.parse(data);

      if (event.type === "welcome") {
        setId(event.id);
        setMessages(event.messages);
        setConnected(event.connected);
      } else if (event.type === "server_message") {
        let { type, ...message } = event;
        setMessages(messages => [...messages, message])
      } else if (event.type === "connected") {
        // EXERCISE 2: Update the list of connected users here
        setConnected(connected => connected);
      } else if (event.type === "disconnected") {
        // EXERCISE 3: Update the list of connected users here
        setConnected(connected => connected);
      }
    }

    setSocket(socket);
    socket.addEventListener("message", handler);

    return () => {
      socket.removeEventListener("message", handler);
    };
  }, []);

  let [currentMessage, setCurrentMessage] = useState("");

  return (
    <>
      <section className="users">
        <div>My ID: {id}</div>
        <ul className="connected">
          {connected.map(id => <li>User {id}</li>)}
        </ul>
      </section>
      <section id="chat">
        <section id="messages">
          {messages.map(({ sender, time, content }) => (
            <Message sender={`User ${sender}`} time={time} content={content} isLocal={id === sender} />
          ))}
        </section>
        <form action={(formData) => {
            socket.send(JSON.stringify({ type: "client_message", content: formData.get("message") }));
            setCurrentMessage("");
          }}>
          <input
            name="message"
            value={currentMessage}
            onChange={(event) => setCurrentMessage(event.target.value)}
          ></input>
          <input type="submit" value="Send" />
        </form>
      </section>
    </>
  );
}

function Message({ sender, time, isLocal, content }) {
  return <div className={`message${isLocal ? " local" : ""}`}>
    <div className="sender">{sender}</div>
    {/* EXERCISE 4: Look up Javascript's Date object and figure out how to render this */}
    <div className="time">{time}</div>
    <p>{content}</p>
  </div>;
}

// EXERCISE 5: Add some CSS to your index.html to style things