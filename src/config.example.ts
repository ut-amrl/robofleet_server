// create a copy of this file called "config.ts"

import { AuthConfig } from "./access";

export default {
    serverPort: 8080,
    useSecure: false,
    certPath: "example.pem",
    keyPath: "example.key",
    // OAuth client ID
    clientId: null,
    // Path to the root folder for the robot db
    robotDbPath: 'robofleet-robots', 
    permissions: [
        // full access to localhost
        {ip: "127.0.0.1", allow: ["send", "receive"]},
        {ip: "::1", allow: ["send", "receive"]},

        {ipRange: ["10.0.0.100", "10.0.0.200"], allow: ["send", "receive"]},

        // allow all addresses to receive messages
        // {ipRange: ["0.0.0.0", "255.255.255.255"], allow: ["receive"]},
        // {ipRange: ["::", "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff"], allow: ["receive"]},

        // grant full access to a particular email address
        // {email: "logan@example.org", allow: ["send", "receive"]},
    ],
} as AuthConfig;

