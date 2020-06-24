import WebSocket from "ws";
import { makeAuthorizer } from "./access";
import config from "./config";
import { getIp, getRobofleetMetadata, getByteBuffer } from "./util";
import { SubscriptionManager } from "./subscriptions";
import { OAuth2Client } from "google-auth-library"; 
import { Socket } from "net";

const authorize = makeAuthorizer(config);
const subscriptions = new SubscriptionManager();

const wsIpMap = new Map<WebSocket, string>();

const oauth2Client = typeof config.clientId === "string" ? new OAuth2Client(config.clientId) : null;
const wsEmailMap = new Map<WebSocket, string>();

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
      handleTextMessage(wss, ws, data);
      handleBinaryMessage(wss, ws, data);
    });
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

function handleBinaryMessage(wss: WebSocket.Server, sender: WebSocket, data: WebSocket.Data) {
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
    console.error(`WARNING: ${ip} is sending messages with no metadata`);
    return;
  }
  
  if (authorize({ip, email: senderEmail, topic, op: "send"})) {
    // handle subscription messages
    if (subscriptions.handleMessageBuffer(sender, buf)) {
      return;
    }

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
      
      if (authorize({ip: clientIp, email: clientEmail, topic, op: "receive"})) {
        if (subscriptions.isSubscribed(client, topic)) {
          client.send(data);
          console.log(`broadcasted ${topic} from ${ip} to ${clientIp}`);
        }
      }
    }
  }
}

async function handleIdToken(sender: WebSocket, idToken: string | null) {
  if (oauth2Client === null)
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
  // https://developers.google.com/identity/sign-in/web/backend-auth#using-a-google-api-client-library
  const ticket = await oauth2Client.verifyIdToken({
    idToken,
    audience: config.clientId as string
  });
  const payload = ticket.getPayload();
  if (payload?.email && payload?.email_verified) {
    wsEmailMap.set(sender, payload.email);
    console.log(`Authenticated a connection from ${ip} as ${payload.email}`);
  }
}
