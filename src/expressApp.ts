import express from "express";
import cors from "cors";
import { getIp } from "./util";
import { makeAuthorizer, isOp } from "./access";
import config from "./config";
import { googleAuthAvailable, getAuthPayload } from "./googleAuth";

const authorize = makeAuthorizer(config);
import { robotDb } from './database/database';
import RobotInformation from './database/robot';
import { StatusManager } from "./status";

export function setupExpressApp(app: express.Application, sm: StatusManager) {
  // use */ route to support base path

  app.use(cors());

  app.get("*/echo-ip", (req, res) => {
    res.send(getIp(req) ?? "");
  });

  app.post("*/check-auth", express.json(), async (req, res) => {
    const ip = getIp(req);
    
    // get identity if token is provided
    let email = undefined;
    const token = req.body["id_token"];
    if (googleAuthAvailable && typeof token === "string") {
      const payload = await getAuthPayload(token);
      if (payload?.email_verified && payload.email)
        email = payload.email;
    }

    const op = req.body["op"];
    const topic = req.body["topic"];

    if (!isOp(op) || typeof topic !== "string") {
      res.status(400).send(false);
    } else {
      if (authorize({ip, email, op, topic})) {
        res.status(200).send(true);
      } else {
        res.status(200).send(false);
      }
    }
  });

  app.get("/robots", async (req, res) => {
    const staticRobotInformation:any[] = [];

    robotDb().createReadStream().on('data', (data) => {
      staticRobotInformation.push(RobotInformation.fromJSON(data.value.toString()).json());
    }).on('close', () => {
      res.status(200).json(staticRobotInformation);
    });
  });

  app.post("/robots/delete", express.json(), async (req, res) => {
    let ip = getIp(req);
    // get identity if token is provided
    let email = undefined;
    const token = req.body["id_token"];
    if (googleAuthAvailable && typeof token === "string") {
      const payload = await getAuthPayload(token);
      if (payload?.email_verified && payload.email)
        email = payload.email;
    }

    const authorized = authorize({ip, email, op: 'send', topic: req.body.name });

    if (!authorized || !req.body.name) {
      return res.status(403).send();
    }

    if (ip == '::1') {
      ip = ':127.0.0.1';
    }

    // Since ips stored in the db are always ipv6 + ipv4... Need to resolve this at some point
    ip = '::ffff' + ip;

    try {
      console.log('received request', authorized, ip!);
      await robotDb().del(ip!);
      console.log(sm.clientInformation.keys());
      sm.clientInformation.delete(ip!);
      console.log('deleted');
      return res.status(204).send();
    } catch (e) {
      return res.status(400).send();
    }
  })
}
