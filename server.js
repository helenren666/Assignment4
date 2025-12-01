import express from "express";
import expressWs from "express-ws";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Create a server
const server = express();
// Added websocket features
expressWs(server);

const port = 3000;

let clients = {};
let clientNames = {};
let imageStack = []; // 存储所有图片，按时间顺序排列：[{ userId, url, timestamp }, ...]

let messages = [];
let placedItems = {};

let global_id = 0;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ASSET_DIR = path.join(__dirname, "client", "images");
const CAT_IMAGE = path.join(ASSET_DIR, "catsleep.png");

server.use(express.json({ limit: "2mb" }));
server.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

// Set up a websocket endpoint
server.ws("/", (client) => {
  // Figure out the client's id
  let id = global_id++;
  let defaultName = formatName("", id);
  clientNames[id] = defaultName;

  console.log(`${id} connected`)

  send(client, {
    type: "welcome",
    id,
    connected: Object.keys(clients),
    messages,
    images: imageStack, // 发送所有图片的列表（按时间顺序）
    placedItems,
    names: clientNames,
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
    } else if (event.type === "image_upload") {
      // 处理图片上传事件：添加到全局图片栈
      let { imageUrl } = event;
      
      // 添加图片到栈顶（最新的图片在前面）
      imageStack.unshift({
        userId: id,
        url: imageUrl,
        timestamp: Date.now()
      });

      // 广播更新给所有客户端
      broadcast({
        type: "image_update",
        images: imageStack,
      });
    } else if (event.type === "set_name") {
      let safeName = formatName(event.name, id);
      clientNames[id] = safeName;
      broadcast({ type: "name_updated", id, name: safeName });
    } else if (event.type === "place_item") {
      let { itemKey, placement } = event;
      if (!isValidPlacement(placement) || typeof itemKey !== "string") {
        send(client, { type: "place_rejected", itemKey, reason: "invalid" });
        return;
      }

      if (placedItems[itemKey]) {
        send(client, {
          type: "place_rejected",
          itemKey,
          reason: "already_placed",
          placement: placedItems[itemKey],
        });
        return;
      }

      let userName = clientNames[id] || formatName("", id);
      placedItems[itemKey] = { ...placement, userId: id, userName, placedAt: Date.now() };

      broadcast({
        type: "item_placed",
        itemKey,
        placement: placedItems[itemKey],
        userId: id,
        userName,
      });
    }
  });

  client.on("close", () => {
    console.log(`${id} disconnected`)
    delete clients[id];
    delete clientNames[id];
    broadcast({ type: "disconnected", id });
  });
});

server.post("/api/validate-drop", async (req, res) => {
  let {
    itemKey,
    dropX,
    dropY,
    catDisplayWidth,
    catDisplayHeight,
    itemDisplayWidth,
  } = req.body || {};

  if (
    typeof itemKey !== "string" ||
    typeof dropX !== "number" ||
    typeof dropY !== "number" ||
    typeof catDisplayWidth !== "number" ||
    typeof catDisplayHeight !== "number" ||
    typeof itemDisplayWidth !== "number"
  ) {
    res.status(400).json({ ok: false, error: "invalid_payload" });
    return;
  }

  let itemPath = path.join(ASSET_DIR, itemKey);

  if (!fs.existsSync(itemPath) || !fs.existsSync(CAT_IMAGE)) {
    res.status(404).json({ ok: false, error: "asset_missing" });
    return;
  }

  try {
    let catMeta = await sharp(CAT_IMAGE).metadata();
    let itemMeta = await sharp(itemPath).metadata();

    if (!catMeta.width || !catMeta.height || !itemMeta.width || !itemMeta.height) {
      res.status(500).json({ ok: false, error: "metadata_missing" });
      return;
    }

    let scaleX = catMeta.width / catDisplayWidth;
    let scaleY = catMeta.height / catDisplayHeight;

    let naturalDropX = dropX * scaleX;
    let naturalDropY = dropY * scaleY;

    let targetWidth = Math.max(1, Math.round(itemDisplayWidth * scaleX));
    let targetHeight = Math.max(
      1,
      Math.round(itemMeta.height * (targetWidth / itemMeta.width))
    );

    let offsetX = Math.round(naturalDropX - targetWidth / 2);
    let offsetY = Math.round(naturalDropY - targetHeight / 2);

    let catRaw = await sharp(CAT_IMAGE)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let itemRaw = await sharp(itemPath)
      .ensureAlpha()
      .resize({ width: targetWidth, height: targetHeight })
      .raw()
      .toBuffer({ resolveWithObject: true });

    let hasOverlap = false;
    let threshold = 10;

    for (let y = 0; y < itemRaw.info.height && !hasOverlap; y++) {
      for (let x = 0; x < itemRaw.info.width; x++) {
        let catX = offsetX + x;
        let catY = offsetY + y;

        if (
          catX < 0 ||
          catY < 0 ||
          catX >= catRaw.info.width ||
          catY >= catRaw.info.height
        ) {
          continue;
        }

        let itemAlpha = itemRaw.data[(y * itemRaw.info.width + x) * 4 + 3];
        if (itemAlpha <= threshold) continue;

        let catAlpha = catRaw.data[(catY * catRaw.info.width + catX) * 4 + 3];
        if (catAlpha > threshold) {
          hasOverlap = true;
          break;
        }
      }
    }

    let displayScaleY = catDisplayHeight / catMeta.height;
    let itemDisplayHeight = targetHeight * displayScaleY;

    res.json({
      ok: true,
      overlap: hasOverlap,
      placement: {
        x: dropX,
        y: dropY,
        width: itemDisplayWidth,
        height: itemDisplayHeight,
      },
    });
  } catch (err) {
    console.error("validate-drop failed", err);
    res.status(500).json({ ok: false, error: "validation_failed" });
  }
});

// Start the server
server.listen(port, "0.0.0.0", () => {});

function formatName(name, id) {
  let fallback = `Cozy Cat ${id + 1}`;
  if (typeof name !== "string") return fallback;
  let trimmed = name.trim().replace(/\s+/g, " ").slice(0, 30);
  return trimmed || fallback;
}

function send(client, message) {
  client.send(JSON.stringify(message));
}

function broadcast(message) {
  for (let client of Object.values(clients)) {
    send(client, message);
  }
}

function isValidPlacement(placement) {
  if (!placement || typeof placement !== "object") return false;

  let { xRatio, yRatio, widthRatio, heightRatio } = placement;

  let numericOk = [xRatio, yRatio, widthRatio, heightRatio].every(
    (value) => typeof value === "number" && Number.isFinite(value)
  );

  if (!numericOk) return false;

  return widthRatio > 0 && heightRatio > 0 && xRatio >= 0 && yRatio >= 0;
}
