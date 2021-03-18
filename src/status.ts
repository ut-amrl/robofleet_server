import WebSocket from "ws";
import {flatbuffers} from "flatbuffers";
import { fb } from "./schema_generated";
import { getRobofleetMetadata, Logger } from "./util";
import { robotDb } from './database/database';

import { strict } from "assert";
import { stringify } from "querystring";
import { ExecOptionsWithStringEncoding } from "child_process";
import RobotInformation from "./database/robot";

export class StatusManager {
  clientInformation: Map<string, RobotInformation> = new Map();// Map from clientIp to robot information; should always be up to date.
  static CLIENT_SAVE_INTERVAL:number = 10000; // Interval at which we persist current status info the db. 
  logger?: Logger;
  connected:boolean = false;

  constructor(log: Logger) {
    // set up DB connection, populate known clientNames
    log.logOnce("Initializing Status Manager....");
    this.connected = false;
    this.logger = log;
    this.handleDbConnection();
  }

  async handleDbConnection() {
    // populate known clientNames
    robotDb().createReadStream().on('data', (data) => {
      this.clientInformation.set(data.key.toString(), RobotInformation.fromJSON(data.value));
    }).on('close', () => {
      this.logger?.log(`Connected to Database; loaded ${this.clientInformation.size} robot clients.\n`);
  
      // set up intermittent saves to the db for each robot
      setInterval(this.saveClientInformation.bind(this), StatusManager.CLIENT_SAVE_INTERVAL);
      this.connected = true;
    });
  }


  handleNewConnection(sender: WebSocket, clientIp: string, logger?: Logger) {
    logger?.logOnce(`StatusManager got connection at ip ${clientIp}`);
    // Check if this client is one we know about already
    if (this.clientInformation.has(clientIp)) {
      logger?.logOnce(`New connection for client ${clientIp}, which is already being tracked.`);
    } else {
      logger?.logOnce(`New connection for client ${clientIp}, which is not being tracked.`);
    }
  }

  async saveClientInformation() {
    // this.logger?.log("Persisting state to db...");

    let batch = robotDb().batch();
    await Promise.all(Array.from(this.clientInformation).map(async ([ip, client], _) => {
      try {
        let robot = RobotInformation.fromJSON((await robotDb().get(ip)).toString()) //this doesn't come out as the correct
        // Don't save if nothing has changed; in fact, let's delete this robot from our local tracking because it's offline now
        if (client.lastUpdated.toString() == robot.lastUpdated.toString()) {
          // this.logger?.log(`Clearing tracking for expired client (${client.ip}, ${client.name}).`);
          // this.clientInformation.delete(client.ip);
          return;
        }
        robot.lastStatus = client.lastStatus;
        robot.lastLocation = client.lastLocation;
        robot.lastUpdated = client.lastUpdated;
        
        batch = batch.put(ip.toString(), robot.jsonString());
      } catch (err) {
        if (err.notFound) {
          batch = batch.put(ip.toString(), client.jsonString());
        } else {
          throw err;
        }
      }
    }));
    return await batch.write();
  }

  getNameFromTopic(topic: string) {
    // Absolute vs relative path
    if (topic.startsWith('/')) {
      return topic.split('/')[1];
    } else {
      return topic.split('/')[0];
    }
  }

  /**
   * Handle any Robofleet message and, if it has the type RobofleetStatus
   * (on any topic), handles the status management for the given sender  .
   * 
   * @param buf ByteBuffer containing the message data 
   * @param clientIp string ip addr of the client sending the message
   * @param name string name of the client sending the message
   */
  handleMessageBuffer(sender: WebSocket, buf: flatbuffers.ByteBuffer, clientIp: string, topic: string, logger?: Logger) {
    if (!this.connected) {
      this.logger?.log(`Not connected to database`);
      return;
    }

    const metadata = getRobofleetMetadata(buf);
    if (metadata?.type() === "amrl_msgs/RobofleetStatus") {
      const msg = fb.amrl_msgs.RobofleetStatus.getRootAsRobofleetStatus(buf);
      const name = this.getNameFromTopic(topic);

      // If this is the first message from this IP
      if (!this.clientInformation.has(clientIp.toString())) {
        this.logger?.log(`Tracking new client (${clientIp}, ${name})`);
        this.clientInformation.set(clientIp.toString(), new RobotInformation(clientIp, name, msg.location()!, msg.status()!, new Date()));
        return;
      } else {
        let clientInfo = this.clientInformation.get(clientIp.toString())!;
        // Check if this name alread
        if (name !== clientInfo?.name) {
          logger?.logOnce(`Recieved message from ${clientIp} with an unexpected name ${name}. Expected: ${clientInfo?.name}`);
          return;
        }
        clientInfo.lastStatus = msg.status()!;
        clientInfo.lastLocation = msg.location()!;
        clientInfo.lastUpdated = new Date();
      }
    }
  }

}
