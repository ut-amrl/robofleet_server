import WebSocket from "ws";
import { makeAuthorizer } from "./access";
import config from "./config";
import { getIp, getRobofleetMetadata } from "./util";

const authorize = makeAuthorizer(config);

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
      const topic = getRobofleetMetadata(data)?.topic() ?? null;
      if (topic === null)
        return;
      
      if (authorize({ip, topic, op: "send"})) {
        for (let client of wss.clients) {
          if (client === ws)
            continue;
          if (client.readyState !== WebSocket.OPEN)
            continue;
          
          const clientIp = wsIpMap.get(client);
          if (clientIp === undefined) {
            console.error("Client IP not available; wsIpMap may be broken.");
            continue;
          }

          if (authorize({ip: clientIp, topic, op: "receive"})) {
            client.send(data);
            console.log("broadcasted");
          }
        }
      }
    });
  });
}