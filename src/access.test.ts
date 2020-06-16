import { makeAuthorizer } from "./access";

test("Does not authorize receive /x/y/topic for unauthorized client", () => {
  const authorize = makeAuthorizer({
    authorizedClients: []
  });
  expect(authorize({
    ip: "1.2.3.4",
    topic: "/x/y/topic",
    op: "receive"
  })).toBe(false);
});

test("Does not authorize send status for unauthorized client", () => {
  const authorize = makeAuthorizer({
    authorizedClients: []
  });
  
  expect(authorize({
    ip: "1.2.3.4",
    topic: "/x/y/status",
    op: "send"
  })).toBe(false);

  expect(authorize({
    ip: "1.2.3.4",
    topic: "/status",
    op: "send"
  })).toBe(false);
});

test("Authorizes receive status for unauthorized client", () => {
  const authorize = makeAuthorizer({
    authorizedClients: []
  });
  
  expect(authorize({
    ip: "1.2.3.4",
    topic: "/status",
    op: "receive"
  })).toBe(true);

  expect(authorize({
    ip: "1.2.3.4",
    topic: "/x/y/status",
    op: "receive"
  })).toBe(true);
});

test("Authorizes send status for authorized client", () => {
  const authorize = makeAuthorizer({
    authorizedClients: [
      {ip: "1.2.3.4"}
    ]
  });
  
  expect(authorize({
    ip: "1.2.3.4",
    topic: "/x/y/status",
    op: "send"
  })).toBe(true);
});
