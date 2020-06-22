import WebSocket from "ws";
import { makeAuthorizer } from "./access";
import config from "./config";
import { getIp, getRobofleetMetadata, getByteBuffer } from "./util";
import { SubscriptionManager } from "./subscriptions";

const authorize = makeAuthorizer(config);
const subscriptions = new SubscriptionManager();

const wsIpMap = new Map<WebSocket, string>();

export function setupWebsocketApp(wss: WebSocket.Server) {
  wss.on("connection", (ws, req) => {
    const ip = getIp(req);
    if (ip === undefined) {
      console.error("IP undefined; socket may have disconnected.");
      return;
    }
    wsIpMap.set(ws, ip);
    console.log(`new connection: ${ip}`);
    
    ws.on("close", () => {
      wsIpMap.delete(ws);
    });

    ws.on("message", (data) => {
      const buf = getByteBuffer(data);
      if (buf === null) {
        return; // received text message; ignore
      }

      // extract topic from message metadata for authorization
      const topic = getRobofleetMetadata(buf)?.topic() ?? null;
      if (topic === null) {
        console.error(`WARNING: ${ip} is sending messages with no metadata`);
        return;
      }
      
      if (authorize({ip, topic, op: "send"})) {
        // handle subscription messages
        if (subscriptions.handleMessageBuffer(ws, buf)) {
          return;
        }

        // broadcast any other messages
        for (let client of wss.clients) {
          if (client === ws)
            continue;
          if (client.readyState !== WebSocket.OPEN)
            continue;
          
          const clientIp = wsIpMap.get(client);
          if (clientIp === undefined) {
            throw new Error("No IP recorded for client; wsIpMap in invalid state.");
          }
          
          if (authorize({ip: clientIp, topic, op: "receive"})) {
            if (subscriptions.isSubscribed(client, topic)) {
              client.send(data);
              console.log(`broadcasted ${topic} from ${ip} to ${clientIp}`);
            }
          }
        }
      }
    });
  });
}
