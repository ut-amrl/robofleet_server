import { makeAuthorizer } from "./access";

test("Does not authorize receive /x/y/topic for unauthorized client", () => {
  const authorize = makeAuthorizer({
    permissions: []
  });
  expect(authorize({
    ip: "1.2.3.4",
    topic: "/x/y/topic",
    op: "receive"
  })).toBe(false);
});

test("Does not authorize send status for unauthorized client", () => {
  const authorize = makeAuthorizer({
    permissions: []
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
    permissions: []
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

test("Does not authorize send .*/subscriptions for unauthorized client", () => {
  const authorize = makeAuthorizer({
    permissions: []
  });
  
  expect(authorize({
    ip: "1.2.3.4",
    topic: "/my/robot/subscriptions",
    op: "send"
  })).toBe(false);

  expect(authorize({
    ip: "1.2.3.4",
    topic: "/my/robot/subscriptions",
    op: "receive"
  })).toBe(false);
});

test("Authorizes send /subscriptions for unauthorized client", () => {
  const authorize = makeAuthorizer({
    permissions: []
  });
  
  expect(authorize({
    ip: "1.2.3.4",
    topic: "/subscriptions",
    op: "send"
  })).toBe(true);

  expect(authorize({
    ip: "1.2.3.4",
    topic: "/subscriptions",
    op: "receive"
  })).toBe(false);
});

test("Authorizes receive topic for authorized client", () => {
  const authorize = makeAuthorizer({
    permissions: [
      {
        ip: "1.2.3.4",
        allow: ["receive"]
      }
    ]
  });
  
  expect(authorize({
    ip: "1.2.3.4",
    topic: "/x/y/topic",
    op: "send"
  })).toBe(false);

  expect(authorize({
    ip: "1.2.3.4",
    topic: "/x/y/topic",
    op: "receive"
  })).toBe(true);
});

test("Authorizes send topic for client in authorized IP range", () => {
  const authorize = makeAuthorizer({
    permissions: [
      {
        ipRange: ["1.0.0.0", "1.2.0.0"],
        allow: ["receive"]
      }
    ]
  });

  expect(authorize({
    ip: "1.1.0.0",
    topic: "/x/y/topic",
    op: "receive"
  })).toBe(true);
});

test("Does not authorize send topic for client outside authorized IP range", () => {
  const authorize = makeAuthorizer({
    permissions: [
      {
        ipRange: ["1.0.0.0", "1.2.0.0"],
        allow: ["receive"]
      }
    ]
  });

  expect(authorize({
    ip: "1.2.0.1",
    topic: "/x/y/topic",
    op: "receive"
  })).toBe(false);
});
