# robofleet_server

*RoboFleet 2.0 Server*

## Dependencies

* Node.js
* [yarn](https://classic.yarnpkg.com/en/docs/install)

## Configuration

The server must be configured before building.
1. `cp src/config.example.ts src/config.ts`
2. Edit parameters in `src/config.ts`

### Permissions

The server authorizes each WebSocket message. It verifies that the sender has permission to send the message, and that the receiver has permission to receive the message.

You must grant permissions before anything interesting will happen.

#### Basic setup

Follow these steps to interact with a robot using the web visualizer:

1. Grant permissions to the robot
    * Robots are typically identified by their IP address on an internal network (e.g. WireGuard.)
    * Authorize each robot to at least **send** messages to enable status reports and visualization.
    * To allow robot control, allow the robot to **receive** messages.
2. Grant permissions to the user
    * People are typically identified by their email addresses via Google Sign-in. If you deploy the web visualizer on an internal network address (e.g. WireGuard), you could choose to authorize users by their IP addresses on the internal network.
    * Authorize each user to at least **receive** messages.
    * To allow robot control, allow the user to **send** messages.

**Unstable**: Currently, there is no way to allow sending and receiving on a per-topic basis.

#### Special topics

The server allows anyone to **receive** messages on any topic that **ends in** `/status` (e.g. `/x/y/status`). This allows anyone to view basic robot statuses.

The server allows anyone to **send** messages on the single topic `/subscriptions`. This allows any client to subscribe to topics. However, the client will still only receive messages that they are authorized to receive, regardless of any subscriptions.

## Building

* `yarn install`
* `yarn build` to build
* `yarn start` to start
