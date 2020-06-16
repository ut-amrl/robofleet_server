import ip6addr from "ip6addr";

export type Op = "send" | "receive";

export interface AuthConfig {
  authorizedClients: Array<{
    ip: string
  }>
};

export function makeAuthorizer(config: AuthConfig) {
  return function authorize({ip, token, topic, op}: {ip?: string, token?: string, topic: string, op: Op}) {
    // TODO: handle topic
    // TODO: handle operation
    for (let authorizedClient of config.authorizedClients) {
      if (typeof ip !== "undefined") {
        const ipAddr = ip6addr.parse(ip);
        const authorizedIpAddr = ip6addr.parse(authorizedClient.ip);
        if ("ip" in authorizedClient && ipAddr.compare(authorizedIpAddr) === 0) {
          return true;
        }
      }
    }
    return false;
  };
}
