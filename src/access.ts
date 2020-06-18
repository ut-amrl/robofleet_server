import ip6addr from "ip6addr";

export type Op = "send" | "receive";

export interface AuthConfig {
  permissions: Array<{
    ip?: string,
    ipRange?: [string, string],
    allow: Array<Op>,
  }>,
  [other: string]: any
}

export function makeAuthorizer(config: AuthConfig) {
  return function authorize({ip, token, topic, op}: {ip?: string, token?: string, topic: string, op: Op}) {
    // TODO: handle topic
    
    // allow unauthorized clients to receive status messages
    if (op === "receive" && /^.*\/status$/.test(topic)) {
      return true;
    }

    const ipAddr = (typeof ip !== "undefined") ? ip6addr.parse(ip) : null;
    
    for (let grant of config.permissions) {
      // is this item granting permission for the requested operation?
      if (grant.allow.includes(op)) {
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
      }
    }
    return false;
  };
}
