import WebSocket from "ws";

const ws_port = 8080;

const wss = new WebSocket.Server({
    port: ws_port,
});

wss.on("connection", ws => {
    console.log("new connection");
    ws.on("message", data => {
        console.log(data);
        Array.from(wss.clients.keys())
            .filter(client => client !== ws && client.readyState === WebSocket.OPEN)
            .forEach(client => {
                client.send(data);
                console.log("broadcasted");
            });
    });
});
