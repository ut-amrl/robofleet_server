import { flatbuffers } from "flatbuffers";
import { IncomingMessage, Server } from "http";
import WebSocket from "ws";
import { makeAuthorizer } from "./access";
import config from "./config";
import { fb } from "./schema_generated";
import https from "https";
import fs from "fs";

const authorize = makeAuthorizer(config);

let httpsServer: https.Server;
let wss: WebSocket.Server;
if (config.useSecure) {
  // https://github.com/websockets/ws#external-https-server
  httpsServer = new https.Server({
    cert: fs.readFileSync(config.certPath),
    key: fs.readFileSync(config.keyPath),
  });

  wss = new WebSocket.Server({
    server: httpsServer
  });

  httpsServer.listen(config.serverPort);  
} else {
  wss = new WebSocket.Server({
    port: config.serverPort
  });
}

const wsIpMap = new Map<WebSocket, string>();

function storeIp(ws: WebSocket, req: IncomingMessage) {
  // https://github.com/websockets/ws#how-to-get-the-ip-address-of-the-client
  const ip = req.socket.remoteAddress;
  if (ip === undefined) {
    // https://nodejs.org/api/net.html#net_socket_remoteaddress
    throw new Error("remoteAddress undefined; socket may have disconnected.");
  }
  wsIpMap.set(ws, ip);
}

function removeIp(ws: WebSocket) {
  wsIpMap.delete(ws);
}

function getIp(ws: WebSocket) {
  if (!wsIpMap.has(ws)) {
    throw new Error("IP not stored; call storeIp() for all new connections.");
  }
  return wsIpMap.get(ws);
}

function getMetadata(data: WebSocket.Data) {
  if (!(data instanceof Buffer)) {
    return null;
  }
  const buf = new flatbuffers.ByteBuffer(data);
  const msg = fb.MsgWithMetadata.getRootAsMsgWithMetadata(buf);
  return msg._metadata();
}

wss.on("connection", (ws, req) => {
  try {
    storeIp(ws, req);
  } catch (e) {
    return;
  }
  console.log(`new connection: ${getIp(ws)}`);
  
  ws.on("close", () => {
    removeIp(ws);
  });
  ws.on("message", (data) => {
    const ip = getIp(ws);
    const topic = getMetadata(data)?.topic() ?? null;
    if (topic === null)
      return;
    
    if (authorize({ip, topic, op: "send"})) {
      for (let client of wss.clients) {
        if (client === ws)
          continue;
        if (client.readyState !== WebSocket.OPEN)
          continue;
        if (authorize({ip: getIp(client), topic, op: "receive"})) {
          client.send(data);
          console.log("broadcasted");
        }
      }
    }
  });
});
