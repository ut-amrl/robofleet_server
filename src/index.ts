import express from "express";
import fs from "fs";
import http from "http";
import https from "https";
import WebSocket from "ws";
import config from "./config";
import { StatusManager } from "./status";
import { setupExpressApp } from "./expressApp";
import { setupWebsocketApp } from "./websocketApp";
import { Logger } from "./util";

const app = express();

let wss: WebSocket.Server;
if (config.useSecure) {
  const httpsServer = https.createServer({
    cert: fs.readFileSync(config.certPath),
    key: fs.readFileSync(config.keyPath),
  }, app).listen(config.serverPort);

  wss = new WebSocket.Server({
    server: httpsServer
  });
} 
else {
  const httpServer = http.createServer(app).listen(config.serverPort);

  wss = new WebSocket.Server({
    server: httpServer
  });
}
const sm = new StatusManager(new Logger("StatusManager"));

setupWebsocketApp(wss, sm);
setupExpressApp(app, sm);
