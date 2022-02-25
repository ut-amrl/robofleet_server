import WebSocket from "ws";
import { makeAuthorizer } from "./access";
import config from "./config";
import { getIp, getRobofleetMetadata, getByteBuffer, Logger } from "./util";
import { SubscriptionManager } from "./subscriptions";
import { Socket } from "net";
import { googleAuthAvailable, getAuthPayload } from "./googleAuth";
import { StatusManager } from "./status";

const authorize = makeAuthorizer(config);
const subscriptions = new SubscriptionManager();

const wsIpMap = new Map<WebSocket, string>();

const wsEmailMap = new Map<WebSocket, string>();

const wsLoggers = new Map<WebSocket, Logger>();

export function setupWebsocketApp(wss: WebSocket.Server, sm: StatusManager) {
  wss.on("connection", (ws, req) => {
    const ip = getIp(req);
    if (ip === undefined) {
      console.error("IP undefined; socket may have disconnected.");
      return;
    }
    wsIpMap.set(ws, ip);
    wsLoggers.set(ws, new Logger(ip));
    console.log(`New connection: ${ip}`);
    
    sm.handleNewConnection(ws, ip, wsLoggers.get(ws));

    // check if this connection is from a robot
    // If so, get the appropriate robot model from the db, update the last status info, start keeping track of it
    // set up a timer to update the db with the latest of this stuff, since messages probably come in faster than we want to update the db
    
    ws.on("close", () => {
      wsIpMap.delete(ws);
      wsEmailMap.delete(ws);
      wsLoggers.delete(ws);
      console.log(`Disconnected: ${ip}`);
    });

    ws.on("message", (data) => {
      handleTextMessage(wss, ws, data);
      handleBinaryMessage(wss, sm, ws, data);
    });
    
    ws.on("error", console.error);
  });

}

function handleTextMessage(wss: WebSocket.Server, sender: WebSocket, data: WebSocket.Data) {
  if (typeof data !== "string") {
    return;
  }

  let json = null;
  try {
    json = JSON.parse(data);
  } catch (e) {
    return; // ignore malformed json
  }

  if ("id_token" in json) {
    handleIdToken(sender, json["id_token"]);
  }
}

function handleBinaryMessage(wss: WebSocket.Server, sm: StatusManager, sender: WebSocket, data: WebSocket.Data) {
  const buf = getByteBuffer(data);
  if (buf === null) {
    return;
  }

  const ip = wsIpMap.get(sender);
  if (!ip) {
    throw new Error("No IP recoded for sender; wsIpMap in invalid state.");
  }
  const senderEmail = wsEmailMap.get(sender);

  // extract topic from message metadata for authorization
  const topic = getRobofleetMetadata(buf)?.topic() ?? null;
  if (topic === null) {
    wsLoggers.get(sender)?.logOnce(`WARNING: ${ip} is sending messages with no metadata`);
    return;
  }
  
  if (authorize({ip, email: senderEmail, topic, op: "send"})) {
    // handle robot status messages (update status map, for eventual db update)
    sm.handleMessageBuffer(sender, buf, ip, topic, wsLoggers.get(sender));

    // handle subscription messages
    if (subscriptions.handleMessageBuffer(sender, buf, ip, wsLoggers.get(sender))) {
      return;
    }
    
    wsLoggers.get(sender)?.logOnce(`Received message(s) on "${topic}" from ${ip}`);

    // broadcast any other messages
    for (let client of wss.clients) {
      if (client === sender)
        continue;
      if (client.readyState !== WebSocket.OPEN)
        continue;

      // skip this client if we are waiting to write any data to it
      const clientSock: Socket = (client as any)._socket;
      if (clientSock.bufferSize > 0)
        continue;
      
      const clientIp = wsIpMap.get(client);
      if (clientIp === undefined) {
        throw new Error("No IP recorded for client; wsIpMap in invalid state.");
      }
      const clientEmail = wsEmailMap.get(client);
    
      // Send out message to any subscribers
      if (subscriptions.isSubscribed(client, topic)) {
        if (authorize({ip: clientIp, email: clientEmail, topic, op: "receive"})) {
          client.send(data);
          wsLoggers.get(sender)?.logOnce(`broadcasting message(s) on topic "${topic}" to ${clientIp}`);
        } else {
          wsLoggers.get(client)?.logOnce(
            `WARNING: client (${clientEmail ?? "not signed in"}) not authorized to receive "${topic}"`);
        }
      } 
    }
  } else {
    wsLoggers.get(sender)?.logOnce(
      `WARNING: client (${senderEmail ?? "not signed in"}) not authorized to send "${topic}"`);
  }
}

async function handleIdToken(sender: WebSocket, idToken: string | null) {
  if (!googleAuthAvailable)
    return;

  const ip = wsIpMap.get(sender) ?? "<unknown IP>";
  
  // Sign out
  if (idToken === null) {
    if (wsEmailMap.has(sender)) {
      const oldEmail = wsEmailMap.get(sender);
      wsEmailMap.delete(sender);
      console.log(`De-authenticated a connection from ${ip} (was ${oldEmail})`);
    }
    return;
  }
  
  // Authenticate
  const payload = await getAuthPayload(idToken);
  if (payload?.email && payload?.email_verified) {
    wsEmailMap.set(sender, payload.email);
    console.log(`Authenticated a connection from ${ip} as ${payload.email}`);
  }
}
