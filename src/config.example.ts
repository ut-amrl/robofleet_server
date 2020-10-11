// create a copy of this file called "config.ts"

import { AuthConfig } from "./access";

const config: AuthConfig = {
    serverPort: 8080,
    useSecure: false,
    certPath: "example.pem",
    keyPath: "example.key",
    // OAuth client ID
    clientId: null,
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

        // grant receive access for my/topic on a particular robot
        // {email: "logan@example.org", allow: [{op: "receive", topicRegex: "/jackal/my/topic"}]},

        // grant receive access for my/topic on any robot
        // {email: "logan@example.org", allow: [{op: "receive", topicRegex: "/[^/]+/my/topic"}]},
    ],
};

export default config;
