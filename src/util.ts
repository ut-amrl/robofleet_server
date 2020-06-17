import { IncomingMessage } from "http";
import WebSocket from "ws";
import { flatbuffers } from "flatbuffers"; // do not remove; needed by generated code
import { fb } from "./schema_generated";

// get IP from IncomingMessage, with support for proxied requests
export function getIp(req: IncomingMessage) {
  // https://github.com/websockets/ws#how-to-get-the-ip-address-of-the-client
  // https://nodejs.org/api/net.html#net_socket_remoteaddress
  const forwardedForValues = req.headers["x-forwarded-for"];
  if (typeof forwardedForValues === "undefined") {
    return req.socket.remoteAddress;
  }
  const forwardedFor = Array.isArray(forwardedForValues) ? forwardedForValues[0] : forwardedForValues;
  return forwardedFor.split(/\s*,\s*/)[0];
}

export function getRobofleetMetadata(data: WebSocket.Data) {
  if (!(data instanceof Buffer)) {
    return null;
  }
  const buf = new flatbuffers.ByteBuffer(data);
  const msg = fb.MsgWithMetadata.getRootAsMsgWithMetadata(buf);
  return msg._metadata();
}
