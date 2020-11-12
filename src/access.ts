import ip6addr from "ip6addr";

export type Op = "send" | "receive";

export function isOp(x: any): x is Op {
  return (typeof x === "string") && (x === "send" || x === "receive");
}

export type Action = Op | {op: Op, topicRegex: string};
export interface AuthConfig {
  permissions: Array<{
    ip?: string,
    ipRange?: [string, string],
    email?: string,
    allow: Array<Action>,
  }>,
  [other: string]: any
}

export function makeAuthorizer(config: AuthConfig) {
  return function authorize({ip, email, topic, op}: 
      {ip?: string, email?: string, topic: string, op: Op}) {
    // TODO: handle topic
    
    // allow unauthorized clients to receive status messages
    if (op === "receive" && topic.endsWith("/status")) {
      return true;
    }
    // allow unauthorized clients to send messages to /subscriptions
    if (op === "send" && topic === "/subscriptions") {
      return true;
    }

    const ipAddr = (typeof ip !== "undefined") ? ip6addr.parse(ip) : null;
    
    for (const grant of config.permissions) {
      // is this item granting permission for the requested operation?
      for (const action of grant.allow) {
        // does the attempted action match this allowed action?
        let actionAllowed = false;
        if (isOp(action)) {
          actionAllowed = op === action;
        } else {
          const topicRegex = new RegExp(action.topicRegex);
          const match = topic.match(topicRegex);
          const topicMatches = match !== null && match[0] === topic;
          actionAllowed = op === action.op && topicMatches;
        }

        if (actionAllowed) {
          // does the request include an IP? Do IP-based auth
          if (ipAddr) {
            // does this item grant permission to a particular IP?
            if (grant.ip) {
              const grantIpAddr = ip6addr.parse(grant.ip);
              if (grantIpAddr.compare(ipAddr) === 0) {
                return true;
              }
            }

            // does this item grant permission to a range of IPs?
            if (grant.ipRange) {
              const grantIpRange = ip6addr.createAddrRange(grant.ipRange[0], grant.ipRange[1]);
              if (grantIpRange.contains(ipAddr.toString())) {
                return true;
              }
            }
          }

          // does the request include an email? Do email-based auth
          if (email && grant.email) {
            if (email === grant.email) {
              return true;
            }
          }
        }
      }
    }
    return false;
  };
}
