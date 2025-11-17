import { useState, useEffect } from "react";

export function App() {
  let [id, setId] = useState();
  let [connected, setConnected] = useState();
  let [messages, setMessages] = useState([]);

  let [socket, setSocket] = useState(null);

  useEffect(() => {
    let socket = "REPLACE_THIS"; // Create a websocket

    function handler({ data }) {
      let event = JSON.parse(data);

      if (event.type === "welcome") {
        // How do you respond to this
        // What other messages do you need to respond to?
      }
    }

    socket.addEventListener("message", handler);

    return () => {
      socket.removeEventListener("message", handler);
    };
  }, []);

  let [currentMessage, setCurrentMessage] = useState("");

  return (
    <>
      <section id="messages">
        {messages.map((data) => (
          <Message />
        ))}
      </section>
      <input
        value={currentMessage}
        onChange={(event) => setCurrentMessage(event.target.value)}
      ></input>
      <button
        onClick={() => {
          /* Do something here */
        }}
      >
        Send
      </button>
    </>
  );
}

function Message({ ...props }) {
  return <div></div>;
}
