import WebSocket from "ws";
import {flatbuffers} from "flatbuffers";
import { fb } from "./schema_generated";
import { getRobofleetMetadata, Logger } from "./util";
import { connect } from './database/database';
import { IRobotModel } from "./database/robots/robots.types";

import * as Mongoose from "mongoose";
import { strict } from "assert";
import { stringify } from "querystring";

export class StatusManager {
  clientStatuses: Map<string, string | null> = new Map(); // Map from clientIp to robot status; should always be up to date.
  clientLocations: Map<string, string | null> = new Map();  // Map from clientIp to robot location; should always be up to date.
  clientNames: Map<string, string> = new Map(); // Map from clientIp to robot name; should always be up to date.
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
      this.clientNames.set(robot.get('ip'), robot.get('name'));
    });
    this.logger?.log(`Connected to Database; loaded ${this.clientNames.size} robot clients.\n`);

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
    if (this.clientNames.has(clientIp)) {
      logger?.logOnce(`New connection for client ${clientIp}, which is already being tracked.`);
    } else {
      logger?.logOnce(`New connection for client ${clientIp}, which is not being tracked.`);
    }
  }

  async saveClientInformation() {
    this.logger?.log("Persisting state to db...");
    this.clientNames.forEach(async (name, ip) => {
      let robotModel = <IRobotModel>this.database?.model("robot");
      const robot = await robotModel.findOneOrCreate({
        name,
        ip
      });
      
      if (this.clientLocations.get(ip)) {
        robot.set('lastLocation', this.clientLocations.get(ip));
      }

      if (this.clientStatuses.get(ip)) {
        robot.set('lastStatus', this.clientStatuses.get(ip));
      }

      robot.set('lastUpdated', new Date().toString());

      await robot.save().catch((reason: any) => {
        this.logger?.log(`Error saving information for robot ({name, ip})`);
        this.logger?.log(reason.message);
      });;
    });
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
   * (on any topic), handles the status management for the given sender.
   * 
   * @param buf ByteBuffer containing the message data 
   * @param clientIp string ip addr of the client sending the message
   * @param name string name of the client sending the message
   */
  handleMessageBuffer(sender: WebSocket, buf: flatbuffers.ByteBuffer, clientIp: string, topic: string, logger?: Logger) {
    if (!this.connected) {
      return;
    }

    const metadata = getRobofleetMetadata(buf);
    if (metadata?.type() === "amrl_msgs/RobofleetStatus" || metadata?.type() === "RobofleetStatus" ) {
      const msg = fb.amrl_msgs.RobofleetStatus.getRootAsRobofleetStatus(buf);
      const name = this.getNameFromTopic(topic);

      // If this is the first message from this IP
      if (!this.clientNames.has(clientIp)) {
        this.clientNames.set(clientIp, name);
        this.logger?.logOnce(`Tracking new client (${clientIp}, ${name})`);
      }

      // Check if this name alread
      if (name !== this.clientNames.get(clientIp)) {
        logger?.log(`Recieved message from ${clientIp} with an unexpected name ${name}`);
      }

      if (this.clientStatuses.get(clientIp) !== msg.status()) {
        this.clientStatuses.set(clientIp, msg.status());
      }

      if (this.clientLocations.get(clientIp) !== msg.location()) {
        this.clientLocations.set(clientIp, msg.location());
      }
    }
  }

}