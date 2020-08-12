import { SubscriptionManager, ACTION_SUBSCRIBE, ACTION_UNSUBSCRIBE } from "./subscriptions";
import { flatbuffers } from "flatbuffers";
import { fb } from "./schema_generated";
import WebSocket from "ws";

function makeSubMsg({type="RobofleetSubscription", fromTopic, topicRegex, action}: {type?: string, fromTopic: string, topicRegex: string, action: number}) {
  const fbb = new flatbuffers.Builder();

  const typeOffset = fbb.createString(type);
  const topicOffset = fbb.createString(fromTopic);
  const metadata = fb.MsgMetadata.createMsgMetadata(fbb, typeOffset, topicOffset);
  
  const topicRegexOffset = fbb.createString(topicRegex);

  const msg = fb.amrl_msgs.RobofleetSubscription.createRobofleetSubscription(
    fbb,
    metadata,
    topicRegexOffset,
    action
  );
  fbb.finish(msg);
  return fbb.dataBuffer();
}

test("Ignores a message with the type NotRobofleetSubscription", () => {
  const s = new SubscriptionManager();
  const dummySocket = jest.fn() as any;
  const buf = makeSubMsg({
    type: "NotRobofleetSubscription",
    fromTopic: "/test/subscriptions",
    topicRegex: "",
    action: ACTION_SUBSCRIBE
  });
  expect(s.handleMessageBuffer(dummySocket, buf, "dummyIp")).toBe(false);
});

test("Handles a message with the type RobofleetSubscription", () => {
  const s = new SubscriptionManager();
  const dummySocket = jest.fn() as any;
  const buf = makeSubMsg({
    fromTopic: "/test/subscriptions",
    topicRegex: "",
    action: ACTION_SUBSCRIBE
  });
  expect(s.handleMessageBuffer(dummySocket, buf, "dummyIp")).toBe(true);
});

test("isSubscribed() returns true for a topic that matches the subscription", () => {
  const s = new SubscriptionManager();
  const dummySocket = jest.fn() as any;
  const buf = makeSubMsg({
    fromTopic: "/test/subscriptions",
    topicRegex: "test_[abc]",
    action: ACTION_SUBSCRIBE
  });
  expect(s.handleMessageBuffer(dummySocket, buf, "dummyIp")).toBe(true);
  expect(s.isSubscribed(dummySocket, "test_b")).toBe(true);
});

test("isSubscribed() returns false for a topic that does not match the subscription", () => {
  const s = new SubscriptionManager();
  const dummySocket = jest.fn() as any;
  const buf = makeSubMsg({
    fromTopic: "/test/subscriptions",
    topicRegex: "test_[abc]",
    action: ACTION_SUBSCRIBE
  });
  expect(s.handleMessageBuffer(dummySocket, buf, "dummyIp")).toBe(true);
  expect(s.isSubscribed(dummySocket, "test_d")).toBe(false);
});

test("isSubscribed() is true after subscribing and false after unsubscribing", () => {
  const s = new SubscriptionManager();
  const dummySocket = jest.fn() as any;
  const subBuf = makeSubMsg({
    fromTopic: "/test/subscriptions",
    topicRegex: "test_[abc]",
    action: ACTION_SUBSCRIBE
  });
  const unsubBuf = makeSubMsg({
    fromTopic: "/test/subscriptions",
    topicRegex: "test_[abc]",
    action: ACTION_UNSUBSCRIBE
  });
  expect(s.handleMessageBuffer(dummySocket, subBuf, "dummyIp")).toBe(true);
  expect(s.isSubscribed(dummySocket, "test_b")).toBe(true);
  expect(s.handleMessageBuffer(dummySocket, unsubBuf, "dummyIp")).toBe(true);
  expect(s.isSubscribed(dummySocket, "test_b")).toBe(false);
});
