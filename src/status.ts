import WebSocket from "ws";
import {flatbuffers} from "flatbuffers";
import { fb } from "./schema_generated";
import { getRobofleetMetadata, Logger } from "./util";
import { connect } from './database/database';
import { IRobotModel } from "./database/robots/robots.types";

import * as Mongoose from "mongoose";
import { strict } from "assert";
import { stringify } from "querystring";
import { ExecOptionsWithStringEncoding } from "child_process";

class ClientInfo {
  ip: string;
  location: string;
  name: string;
  lastUpdated: string;
  status: string;

  constructor(ip: string, n: string, loc: string, s: string, lu: string) {
    this.name = n;
    this.ip = ip;
    this.location = loc;
    this.status = s;
    this.lastUpdated = lu;
  }
}

export class StatusManager {
  clientInformation: Map<string, ClientInfo> = new Map();// Map from clientIp to robot information; should always be up to date.
  database?: Mongoose.Connection;
  static CLIENT_SAVE_INTERVAL:number = 10000; // Interval at which we persist current status info the db. 
  logger?: Logger;
  connected:boolean = false;

  constructor(log: Logger) {
    // set up DB connection, populate known clientNames
    log.logOnce("Initializing Status Manager....");
    this.connected = false;
    this.database = connect(this.handleDbConnection.bind(this), this.handleDbConnError.bind(this));
    this.logger = log;
  }

  async handleDbConnection() {
    // populate known clientNames
    const robots = await this.database?.model("robot").find();
    robots?.forEach((robot) => {
      this.clientInformation.set(robot.get('ip'), new ClientInfo(robot.get('ip'), robot.get('name'), robot.get('location'), robot.get('status'), robot.get('lastUpdated')));
    });
    this.logger?.log(`Connected to Database; loaded ${this.clientInformation.size} robot clients.\n`);

    // set up intermittent saves to the db for each robot
    setInterval(this.saveClientInformation.bind(this), StatusManager.CLIENT_SAVE_INTERVAL);
    this.connected = true;
  }

  handleDbConnError() {
    // idk, log stuff?
    this.logger?.log("Error connecting to database");
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

    await Promise.all(Array.from(this.clientInformation).map(async ([ip, client], _) => {
      let robotModel = <IRobotModel>this.database?.model("robot");
      const robot = await robotModel.findOneOrCreate({
        name: client.name,
        ip
      });

      // Don't save if nothing has changed; in fact, let's delete this robot from our local tracking because it's offline now
      if (client.lastUpdated == robot.lastUpdated.toString()) {
        // this.logger?.log(`Clearing tracking for expired client (${client.ip}, ${client.name}).`);
        // this.clientInformation.delete(client.ip);
        return;
      }
      
      robot.set('lastLocation', client.location);
      robot.set('lastStatus', client.status);
      robot.set('lastUpdated', client.lastUpdated);

      return await robot.save().catch((reason: any) => {
        this.logger?.log(`Error saving information for robot ({name, ip})`);
        this.logger?.log(reason.message);
      });
    }));
  }

  private getNameFromTopic(topic: string) {
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
    if (metadata?.type() === "amrl_msgs/RobofleetStatus" || metadata?.type() === "RobofleetStatus" ) {
      const msg = fb.amrl_msgs.RobofleetStatus.getRootAsRobofleetStatus(buf);
      const name = this.getNameFromTopic(topic);

      // If this is the first message from this IP
      if (!this.clientInformation.has(clientIp)) {
        this.logger?.log(`Tracking new client (${clientIp}, ${name})`);
        this.clientInformation.set(clientIp, new ClientInfo(clientIp, name, msg.location()!, msg.status()!, new Date().toString()));
        return;
      } else {
        let clientInfo = this.clientInformation.get(clientIp)!;
        // Check if this name alread
        if (name !== clientInfo?.name) {
          logger?.logOnce(`Recieved message from ${clientIp} with an unexpected name ${name}`);
          return;
        }
        clientInfo.status = msg.status()!;
        clientInfo.location = msg.location()!;
        clientInfo.lastUpdated = new Date().toString();
      }
    }
  }

}