import WebSocket from "ws";
import { flatbuffers } from "flatbuffers";
import { fb } from "./schema_generated";

const ws_port = 8080;

const wss = new WebSocket.Server({
    port: ws_port,
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
