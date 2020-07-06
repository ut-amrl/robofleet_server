import WebSocket from "ws";
import {flatbuffers} from "flatbuffers";
import { fb } from "./schema_generated";
import { getRobofleetMetadata } from "./util";

export const ACTION_SUBSCRIBE = fb.amrl_msgs.RobofleetSubscriptionConstants.action_subscribe.value;
export const ACTION_UNSUBSCRIBE = fb.amrl_msgs.RobofleetSubscriptionConstants.action_unsubscribe.value;

export class SubscriptionManager {
  subs: Map<WebSocket, Array<string>> = new Map();
  
  private _handleSubscribe(sender: WebSocket, regex: string) {
    if (!this.subs.has(sender)) {
      this.subs.set(sender, []);
    }
    // TODO: limit number of subscriptions?
    this.subs.get(sender)?.push(regex);
  }

  private _handleUnsubscribe(sender: WebSocket, regex: string) {
    const regexes = this.subs.get(sender);
    if (!regexes) {
      return;
    }
    const idx = regexes.indexOf(regex) ?? -1;
    if (idx < 0) {
      return;
    }
    regexes.splice(idx, 1);
  }

  /**
   * Handle any Robofleet message and, if it has the type RobofleetSubscription
   * (on any topic), handles the subscription action for the given sender.
   * 
   * @param sender websocket connection from which message was received
   * @param buf ByteBuffer containing the message data 
   * @returns whether the message was handled
   */
  handleMessageBuffer(sender: WebSocket, buf: flatbuffers.ByteBuffer) {
    const metadata = getRobofleetMetadata(buf);
    if (metadata?.type() === "amrl_msgs/RobofleetSubscription" || metadata?.type() === "RobofleetSubscription" ) {
      const msg = fb.amrl_msgs.RobofleetSubscription.getRootAsRobofleetSubscription(buf);
      const regex = msg.topicRegex() ?? "";
      const action = msg.action();
      if (action === ACTION_SUBSCRIBE) {
        this._handleSubscribe(sender, regex);
      }
      else if (action === ACTION_UNSUBSCRIBE) {
        this._handleUnsubscribe(sender, regex);
      }
      else {
        console.error(`WARNING: got invalid RobofleetSubscription action value: ${action}`);
      }
      return true;
    }
    return false;
  }

  /**
   * Test whether a WebSocket client is subscribed to a given topic.
   * 
   * @param ws WebSocket to test
   * @returns whether the given topic matches any of the client's subscriptions
   */
  isSubscribed(ws: WebSocket, topic: string) {
    const regexes = this.subs.get(ws);
    if (!regexes) {
      return false;
    }
    // V8 most likely caches compiled regexes.
    // keep it simple unless profiling shows poor performance here.
    return regexes.some(r => new RegExp(r).test(topic));
  }
}
