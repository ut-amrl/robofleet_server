import express from "express";
import fs from "fs";
import http from "http";
import https from "https";
import WebSocket from "ws";
import config from "./config";
import { setupExpressApp } from "./expressApp";
import { setupWebsocketApp } from "./websocketApp";

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

setupWebsocketApp(wss);
setupExpressApp(app);
