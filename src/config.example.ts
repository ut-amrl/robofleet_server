// create a copy of this file called "config.ts"

import { AuthConfig } from "./access";

export default {
    serverPort: 8080,
    useSecure: false,
    certPath: "example.pem",
    keyPath: "example.key",
    // OAuth client ID
    clientId: null,
    permissions: [
        // localhost
        {ip: "127.0.0.1", allow: ["send", "receive"]},
        {ip: "::1", allow: ["send", "receive"]},
        // allow receive from all addresses
        // {ipRange: ["0.0.0.0", "255.255.255.255"], allow: ["receive"]},
        // {ipRange: ["::", "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff"], allow: ["receive"]},
    ],
} as AuthConfig;

