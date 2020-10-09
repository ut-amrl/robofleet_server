import express from "express";
import cors from "cors";
import { getIp } from "./util";
import { makeAuthorizer, isOp } from "./access";
import config from "./config";
import { googleAuthAvailable, getAuthPayload } from "./googleAuth";

const authorize = makeAuthorizer(config);
import { robotDb } from './database/database';
import RobotInformation from './database/robot';

export function setupExpressApp(app: express.Application) {
  // use */ route to support base path

  async function handleDbConnection() {
    // populate known clientNames
    console.log("Express App: connected to database");
  }
  
  function handleDbConnError() {
    // idk, log stuff?
    console.log("Express App: error connecting to database");
  }

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
    const iterator = robotDb().iterator();
    
    const staticRobotInformation = []

    for await (const { key, value } of iterator) {
      staticRobotInformation.push(value.toJSON());
    }
    
    res.status(200).send(staticRobotInformation);
  })
}
