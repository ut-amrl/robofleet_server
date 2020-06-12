import WebSocket from "ws";
import config from "./config";
import { flatbuffers } from "flatbuffers";
import { fb } from "./schema_generated";

const wss = new WebSocket.Server({
    port: config.serverPort
});

wss.on("connection", ws => {
    console.log("new connection");
    ws.on("message", data => {
        for (let client of wss.clients) {
            if (client.readyState !== WebSocket.OPEN)
                continue;
            if (client === ws)
                continue;
            client.send(data);
            console.log("broadcasted");
        }
    });
});
