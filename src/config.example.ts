// create a copy of this file called "config.ts"

export default {
    serverPort: 8080,
    useSecure: false,
    certPath: "example.pem",
    keyPath: "example.key",
    authorizedClients: [
        // localhost
        {ip: "127.0.0.1"},
        {ip: "::1"},
    ],
};
