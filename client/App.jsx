import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import banana from "./images/banana.png";
import catSleep from "./images/catsleep.png";
import coffee from "./images/coffee.png";
import hairtie from "./images/hairtie.png";
import earbuds from "./images/earbuds.png";
import hammer from "./images/hammer.png";
import pen from "./images/pen.png";
import pencilSharpener from "./images/pencil sharpener.png";
import qtip from "./images/qtip.png";
import straw from "./images/straw.png";
import sunglasses from "./images/sunglass.png";
import tissueBox from "./images/tissue box.png";
import waterBottle from "./images/watter bottle.png";
import catWake from "./images/catwake.png";
import catSound from "./images/catsound.wav";

const ITEM_LIBRARY = [
  { key: "banana.png", label: "banana", src: banana, spot: { x: 0.08, y: 0.12 } },
  { key: "coffee.png", label: "coffee", src: coffee, spot: { x: 0.92, y: 0.12 } },
  { key: "sunglass.png", label: "sunglass", src: sunglasses, spot: { x: 0.08, y: 0.28 } },
  { key: "pencil sharpener.png", label: "sharpener", src: pencilSharpener, spot: { x: 0.92, y: 0.28 } },
  { key: "pen.png", label: "pen", src: pen, spot: { x: 0.08, y: 0.45 } },
  { key: "qtip.png", label: "qtip", src: qtip, spot: { x: 0.92, y: 0.45 } },
  { key: "earbuds.png", label: "earbuds", src: earbuds, spot: { x: 0.08, y: 0.62 } },
  { key: "hammer.png", label: "hammer", src: hammer, spot: { x: 0.92, y: 0.62 } },
  { key: "hairtie.png", label: "shairtieie", src: hairtie, spot: { x: 0.08, y: 0.78 } },
  { key: "watter bottle.png", label: "water bottle", src: waterBottle, spot: { x: 0.92, y: 0.78 } },
  { key: "straw.png", label: "straw", src: straw, spot: { x: 0.22, y: 0.08 } },
  { key: "tissue box.png", label: "tissue", src: tissueBox, spot: { x: 0.5, y: 0.94 } },
];

const WEIGHT_BY_KEY = {
  "banana.png": 120,
  "earbuds.png": 55,
  "qtip.png": 1,
  "straw.png": 2,
  "watter bottle.png": 500,
  "hairtie.png": 5,
  "coffee.png": 250,
  "hammer.png": 450,
  "pen.png": 20,
  "pencil sharpener.png": 300,
  "sunglass.png": 30,
  "tissue box.png": 90,
};
const WAKE_WEIGHT = 850;

export function App() {
  let [id, setId] = useState(null);
  let [namesById, setNamesById] = useState({});
  let [playerName, setPlayerName] = useState("");
  let [hasStarted, setHasStarted] = useState(false);
  let [placedItems, setPlacedItems] = useState({});
  let [logs, setLogs] = useState([]);
  let [dragging, setDragging] = useState(null);
  let [dims, setDims] = useState({});
  let catRef = useRef(null);
  let socketRef = useRef(null);
  let idRef = useRef(null);
  let lastSentNameRef = useRef("");
  let nameRef = useRef("");
  let namesRef = useRef({});
  let hasStartedRef = useRef(false);
  let [catBounds, setCatBounds] = useState({ width: 0, height: 0 });
  let [hasPlaced, setHasPlaced] = useState(false);
  let [catAwake, setCatAwake] = useState(false);
  let wakeAudioRef = useRef(null);

  let log = (text, tone = "success") => {
    setLogs((prev) => [{ id: Date.now(), text, tone }, ...prev].slice(0, 6));
  };

  const resetBoard = useCallback(
    (triggeredBy) => {
      let announcer = (triggeredBy || "Someone").trim() || "Someone";
      setPlacedItems({});
      setHasPlaced(false);
      setCatAwake(false);
      setDragging(null);
      setLogs([{ id: Date.now(), text: `${announcer} started a new round`, tone: "success" }]);
    },
    []
  );

  useEffect(() => {
    let link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
    let style = document.createElement("style");
    style.innerHTML = `
      input[data-start-input]::placeholder {
        color: rgba(157, 23, 77, 0.85);
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(link);
      document.head.removeChild(style);
    };
  }, []);

  const sendNameIfReady = useCallback(() => {
    let trimmed = (nameRef.current || "").trim();
    if (!trimmed || !hasStartedRef.current) return;
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      if (lastSentNameRef.current === trimmed) return;
      socketRef.current.send(JSON.stringify({ type: "set_name", name: trimmed }));
      lastSentNameRef.current = trimmed;
    }
  }, []);

  useEffect(() => {
    if (window.location.protocol === "https:") {
      let socket = new WebSocket('wss://' + window.location.host);
      
    } else {
      let socket = new WebSocket('ws://' + window.location.host);
      
    }
     socketRef.current = socket;

    function handler({ data }) {
      let event = JSON.parse(data);
      if (event.type === "welcome") {
        setId(event.id);
        idRef.current = event.id;
        if (event.names) {
          setNamesById(event.names);
          if (!nameRef.current && event.names[event.id]) {
            setPlayerName(event.names[event.id]);
          }
        }
        if (event.placedItems) setPlacedItems(event.placedItems);
      } else if (event.type === "item_placed") {
        if (event.itemKey && event.placement) {
          setPlacedItems((prev) => ({
            ...prev,
            [event.itemKey]: event.placement,
          }));
          if (event.userName) {
            setNamesById((prev) => ({
              ...prev,
              [event.userId]: event.userName,
            }));
          }
          if (event.userId !== idRef.current) {
            let displayName =
              event.userName ||
              namesRef.current[event.userId] ||
              `User ${event.userId ?? "?"}`;
            log(`${displayName} placed ${event.itemKey.replace(".png", "")}`, "success");
          }
        }
      } else if (event.type === "name_updated") {
        setNamesById((prev) => ({ ...prev, [event.id]: event.name }));
        if (event.id === idRef.current) {
          setPlayerName(event.name);
        }
      } else if (event.type === "place_rejected") {
        if (event.itemKey) {
          if (event.placement) {
            setPlacedItems((prev) => ({
              ...prev,
              [event.itemKey]: event.placement,
            }));
          } else {
            setPlacedItems((prev) => {
              let next = { ...prev };
              delete next[event.itemKey];
              return next;
            });
          }
        }
        log(
          `${event.itemKey?.replace(".png", "") ?? "item"} is already on the cat`,
          "warn"
        );
      } else if (event.type === "game_reset") {
        let nameFromEvent =
          event.userName ||
          namesRef.current[event.by] ||
          (event.by != null ? `User ${event.by}` : "Someone");
        resetBoard(nameFromEvent);
      }
    }

    socket.addEventListener("message", handler);
    socket.addEventListener("open", sendNameIfReady);
    return () => {
      socket.removeEventListener("message", handler);
      socket.removeEventListener("open", sendNameIfReady);
      socket.close();
      socketRef.current = null;
    };
  }, [sendNameIfReady]);

  let updateCatBounds = useCallback(() => {
    if (!catRef.current) return;
    let rect = catRef.current.getBoundingClientRect();
    setCatBounds({ width: rect.width, height: rect.height });
  }, []);

  useEffect(() => {
    updateCatBounds();
    window.addEventListener("resize", updateCatBounds);
    return () => window.removeEventListener("resize", updateCatBounds);
  }, [updateCatBounds]);

  useEffect(() => {
    if (!idRef.current) return;
    let alreadyPlaced = Object.values(placedItems).some(
      (item) => item?.userId === idRef.current
    );
    if (alreadyPlaced) {
      setHasPlaced(true);
    }
  }, [placedItems]);

  useEffect(() => {
    nameRef.current = playerName;
  }, [playerName]);

  useEffect(() => {
    namesRef.current = namesById;
  }, [namesById]);

  useEffect(() => {
    hasStartedRef.current = hasStarted;
  }, [hasStarted]);

  useEffect(() => {
    sendNameIfReady();
  }, [playerName, hasStarted, sendNameIfReady]);

  useEffect(() => {
    wakeAudioRef.current = new Audio(catSound);
    wakeAudioRef.current.preload = "auto";
    wakeAudioRef.current.volume = 0.9;
    return () => {
      if (wakeAudioRef.current) {
        wakeAudioRef.current.pause();
        wakeAudioRef.current = null;
      }
    };
  }, []);

  function handleDragStart(event, key) {
    if (hasPlaced || !hasStarted || catAwake) return;
    event.dataTransfer.setData("application/json", JSON.stringify({ key }));
    event.dataTransfer.effectAllowed = "move";
    setDragging(key);
  }

  function handleDragEnd() {
    setDragging(null);
  }

  function handleDragOver(event) {
    event.preventDefault();
  }

  async function handleDrop(event) {
    event.preventDefault();
    if (hasPlaced || !hasStarted || catAwake) {
      setDragging(null);
      return;
    }
    let payloadString = event.dataTransfer.getData("application/json");
    if (!payloadString) return;
    let { key } = JSON.parse(payloadString);
    if (placedItems[key]) {
      log(`${key.replace(".png", "")} has already been placed on the cat`, "warn");
      setDragging(null);
      return;
    }
    if (!catRef.current) return;

    let rect = catRef.current.getBoundingClientRect();
    let dropX = event.clientX - rect.left;
    let dropY = event.clientY - rect.top;

    let itemWidth = dims[key]?.width;
    if (!itemWidth) {
      log("Please let the image finish loading before dragging", "warn");
      setDragging(null);
      return;
    }

    try {
      let response = await fetch("http://" + window.location.hostname + ":3000/api/validate-drop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemKey: key,
          dropX,
          dropY,
          catDisplayWidth: rect.width,
          catDisplayHeight: rect.height,
          itemDisplayWidth: itemWidth,
        }),
      });

      let data = await response.json();
      if (!response.ok) throw new Error(data.error || `http_${response.status}`);
      if (!data.ok) throw new Error(data.error || "validation_failed");

      if (data.overlap) {
        let placement = {
          xRatio: dropX / rect.width,
          yRatio: dropY / rect.height,
          widthRatio: data.placement.width / rect.width,
          heightRatio: data.placement.height / rect.height,
          userId: id,
          userName: playerName.trim() || namesById[id] || `User ${id ?? ""}`,
        };
        setPlacedItems((prev) => ({
          ...prev,
          [key]: placement,
        }));
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(
            JSON.stringify({ type: "place_item", itemKey: key, placement })
          );
        } else {
          log("Not connected to the server; other users cannot see your placement", "warn");
        }
        setHasPlaced(true);
        log(`You successfully put ${key.replace(".png", "")} on the cat`);
      } else {
        log(`${key.replace(".png", "")} did not touch the cat and was reset`, "warn");
      }
    } catch (err) {
      log(`drop failed: ${err.message}`, "warn");
    } finally {
      setDragging(null);
    }
  }

  function handleStart(event) {
    event.preventDefault();
    let trimmed = (playerName || "").trim();
    let finalName = trimmed;
    setPlayerName(finalName);
    setHasStarted(true);
    if (idRef.current != null && finalName) {
      setNamesById((prev) => ({ ...prev, [idRef.current]: finalName }));
    }
  }

  function handlePlayAgain() {
    if (!catAwake) return;
    let displayName =
      (playerName || "").trim() ||
      namesById[id] ||
      (id != null ? `User ${id}` : "Someone");
    resetBoard(displayName);
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "reset_game" }));
    } else {
      log("Not connected to the server; you restarted locally only", "warn");
    }
  }

  let yourDisplayName =
    (playerName || "").trim() ||
    (id != null && namesById[id]) ||
    (id != null ? `User ${id}` : "Your name");

  let totalWeight = useMemo(
    () =>
      Object.keys(placedItems).reduce(
        (sum, key) => sum + (WEIGHT_BY_KEY[key] ?? 0),
        0
      ),
    [placedItems]
  );

  useEffect(() => {
    if (totalWeight > WAKE_WEIGHT && !catAwake) {
      setCatAwake(true);
      let announcer = (playerName || namesById[id] || "").trim() || "Someone";
      log(`${announcer} wake kittie up`);
      wakeAudioRef.current?.pause();
      if (wakeAudioRef.current) {
        wakeAudioRef.current.currentTime = 0;
        wakeAudioRef.current.play().catch(() => {});
      }
    }
  }, [totalWeight, catAwake, playerName, namesById, id]);

  let containerStyle = useMemo(
    () => ({
      position: "relative",
      width: "100vw",
      height: "100vh",
      overflow: "visible",
      background: "#f9d7ec",
      fontFamily: "'Fredoka', 'Baloo 2', 'Nunito', system-ui, -apple-system, sans-serif",
      color: "#3b1d2d",
    }),
    []
  );

  return (
    <div style={containerStyle} onDrop={handleDrop} onDragOver={handleDragOver}>
      <div
        style={{
          position: "absolute",
          left: 16,
          top: 16,
          zIndex: 6,
          padding: "12px 14px",
          borderRadius: "14px",
          background: "rgba(255, 255, 255, 0.72)",
          color: "#a21caf",
          fontWeight: 700,
          fontSize: "15px",
          letterSpacing: "0.2px",
          boxShadow: "0 16px 40px rgba(244, 114, 182, 0.28)",
          border: "1px solid rgba(255, 255, 255, 0.8)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <div style={{ fontSize: "12px", color: "#be185d", fontWeight: 600 }}>Playing as</div>
        <div style={{ fontSize: "18px", color: "#831843", lineHeight: 1.1 }}>
          {yourDisplayName || "Loading..."}
        </div>
        <div style={{ fontSize: "12px", color: "#9f1239", marginTop: 4 }}>
          ID #{id ?? "..."}
        </div>
      </div>

      <img
        ref={catRef}
        src={catAwake ? catWake : catSleep}
        alt="cat"
        draggable={false}
        onLoad={updateCatBounds}
        style={{
          position: "absolute",
          inset: 0,
          width: "100vw",
          height: "100vh",
          objectFit: "cover",
          userSelect: "none",
          pointerEvents: "none",
          zIndex: 0,
          opacity: 0.98,
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 18% 24%, rgba(255, 205, 230, 0.62), transparent 38%), radial-gradient(circle at 82% 70%, rgba(255, 179, 213, 0.55), transparent 45%)",
          mixBlendMode: "screen",
          pointerEvents: "none",
          zIndex: 1,
          filter: "blur(2px)",
        }}
      />

      {ITEM_LIBRARY.filter((item) => !placedItems[item.key]).map((item) => {
        return (
          <img
            key={item.key}
            src={item.src}
            alt={item.label}
            draggable={!hasPlaced && hasStarted && !catAwake}
            onLoad={(e) => {
              setDims((prev) => ({
                ...prev,
                [item.key]: {
                  width: e.target.naturalWidth,
                  height: e.target.naturalHeight,
                },
              }));
            }}
            onDragStart={(event) => handleDragStart(event, item.key)}
            onDragEnd={handleDragEnd}
            style={{
              position: "absolute",
              left: `${item.spot.x * 100}%`,
              top: `${item.spot.y * 100}%`,
              transform: "translate(-50%, -50%)",
              cursor: hasPlaced || !hasStarted || catAwake ? "not-allowed" : "grab",
              opacity: dragging === item.key ? 0.72 : hasStarted ? 1 : 0.65,
              filter: "none",
              pointerEvents: hasPlaced || !hasStarted || catAwake ? "none" : "auto",
              width: "auto",
              height: "auto",
              maxWidth: "none",
              maxHeight: "none",
              zIndex: 2,
            }}
          />
        );
      })}

      {Object.entries(placedItems).map(([key, item]) => (
        catBounds.width > 0 &&
        catBounds.height > 0 && (
          <img
            key={`${key}-placed`}
            src={ITEM_LIBRARY.find((i) => i.key === key)?.src || ""}
            alt={key}
            style={{
              position: "absolute",
              left: item.xRatio * catBounds.width,
              top: item.yRatio * catBounds.height,
              width: item.widthRatio * catBounds.width,
              height: item.heightRatio * catBounds.height,
              transform: "translate(-50%, -50%)",
              pointerEvents: "none",
              filter: "drop-shadow(0 12px 30px rgba(0,0,0,0.25))",
              zIndex: 3,
            }}
          />
        )
      ))}

      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 20,
          transform: "translateX(-50%)",
          width: "min(420px, 80vw)",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          zIndex: 6,
          pointerEvents: "none",
        }}
      >
        {logs.map((entry) => {
          let isWakeLog = entry.text.toLowerCase().includes("wake kittie up");
          return (
            <div
              key={entry.id}
              style={{
                padding: isWakeLog ? "18px 20px" : "12px 14px",
                borderRadius: "12px",
                background:
                  entry.tone === "success"
                    ? "rgba(255, 240, 246, 0.95)"
                    : "rgba(255, 249, 235, 0.97)",
                border:
                  entry.tone === "success" ? "1px solid #f9a8d4" : "1px solid #fcd34d",
                color: entry.tone === "success" ? "#be185d" : "#b45309",
                fontWeight: isWakeLog ? 800 : 600,
                fontSize: isWakeLog ? "22px" : "13px",
                letterSpacing: isWakeLog ? "0.3px" : "0px",
                textAlign: "center",
                boxShadow: isWakeLog
                  ? "0 16px 40px rgba(190, 24, 93, 0.3)"
                  : "0 10px 30px rgba(190, 24, 93, 0.2)",
                pointerEvents: "auto",
              }}
            >
              {entry.text}
            </div>
          );
        })}
      </div>

      {catAwake && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: 26,
            transform: "translateX(-50%)",
            zIndex: 7,
            pointerEvents: "none",
          }}
        >
          <button
            onClick={handlePlayAgain}
            style={{
              pointerEvents: "auto",
              padding: "14px 22px",
              borderRadius: "14px",
              border: "none",
              background: "linear-gradient(120deg, #f472b6, #fb7185)",
              color: "#fff",
              fontWeight: 800,
              fontSize: "16px",
              cursor: "pointer",
              boxShadow: "0 14px 38px rgba(244, 114, 182, 0.35)",
            }}
          >
            Play again
          </button>
        </div>
      )}

      {!hasStarted && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundImage: `url(${catAwake ? catWake : catSleep})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(255, 255, 255, 0.65)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
            }}
          />
          <form
            onSubmit={handleStart}
            style={{
              position: "relative",
              zIndex: 11,
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              padding: "28px 26px",
              borderRadius: "18px",
              background: "rgba(255, 255, 255, 0.32)",
              border: "1px solid rgba(255, 255, 255, 0.8)",
              boxShadow: "0 20px 70px rgba(244, 114, 182, 0.35)",
              minWidth: "min(360px, 90vw)",
              color: "#7a1b3f",
            }}
          >
            <div style={{ fontSize: "26px", fontWeight: 700, color: "#9d174d" }}>
              Name yourself
            </div>
            <input
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="e.g. Helen"
              data-start-input="true"
              style={{
                padding: "14px 16px",
                borderRadius: "14px",
                border: "1px solid rgba(255, 255, 255, 0.8)",
                background: "rgba(255, 255, 255, 0.32)",
                color: "#9d174d",
                fontSize: "16px",
                fontWeight: 600,
                boxShadow: "0 12px 32px rgba(244, 114, 182, 0.25)",
                outline: "none",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
              }}
            />
            <button
              type="submit"
              style={{
                padding: "14px 16px",
                borderRadius: "14px",
                border: "none",
                background: "linear-gradient(120deg, #fb7185, #f472b6)",
                color: "#fff",
                fontWeight: 800,
                fontSize: "16px",
                cursor: "pointer",
                boxShadow: "0 12px 32px rgba(244, 114, 182, 0.35)",
              }}
            >
              Start game
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
