import { IncomingMessage } from "http";
import WebSocket from "ws";
import { fb } from "./schema_generated";

export function getIp(req: IncomingMessage) {
  // https://github.com/websockets/ws#how-to-get-the-ip-address-of-the-client
  // https://nodejs.org/api/net.html#net_socket_remoteaddress
  return req.socket.remoteAddress;
}

export function getRobofleetMetadata(data: WebSocket.Data) {
  if (!(data instanceof Buffer)) {
    return null;
  }
  const buf = new flatbuffers.ByteBuffer(data);
  const msg = fb.MsgWithMetadata.getRootAsMsgWithMetadata(buf);
  return msg._metadata();
}
