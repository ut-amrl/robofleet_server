import { getIp } from "./util";
import { IncomingMessage } from "http";

const MockSocket = jest.fn().mockImplementation(() => {
  return {
    remoteAddress: "1.2.3.4"
  };
});   

test("Gets IP for non-forwarded request", () => {
  const req = new IncomingMessage(new MockSocket() as any);
  expect(getIp(req)).toBe("1.2.3.4");
});

test("Gets IP for forwarded request", () => {
  const MockMessage = jest.fn().mockImplementation(() => {
    return {
      socket: new MockSocket(),
      headers: {
        "x-forwarded-for": "2.3.4.5"
      }
    };
  })
  const req = new MockMessage() as IncomingMessage;
  expect(getIp(req)).toBe("2.3.4.5");
});

test("Gets IP for forwarded request 2", () => {
  const MockMessage = jest.fn().mockImplementation(() => {
    return {
      socket: new MockSocket(),
      headers: {
        "x-forwarded-for": ["2.3.4.5", "2.3.4.5"]
      }
    };
  })
  const req = new MockMessage() as IncomingMessage;
  expect(getIp(req)).toBe("2.3.4.5");
});