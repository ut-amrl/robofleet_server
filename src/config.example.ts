// create a copy of this file called "config.ts"

export default {
    serverPort: 8080,
    useSecure: false,
    certPath: "example.pem",
    keyPath: "example.key",
    permissions: [
        // localhost
        {ip: "127.0.0.1", allow: ["send", "receive"]},
        {ip: "::1", allow: ["send", "receive"]},
        // {ipRange: ["0.0.0.0", "255.255.255.255"], allow: ["receive"]},
    ],
};
