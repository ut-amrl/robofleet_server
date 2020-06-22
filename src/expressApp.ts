import express from "express";
import cors from "cors";
import { getIp } from "./util";
import { makeAuthorizer } from "./access";
import config from "./config";

const authorize = makeAuthorizer(config);

export function setupExpressApp(app: express.Application) {
  // use */ route to support base path
  app.get("*/echo-ip", cors(), (req, res) => {
    res.send(getIp(req) ?? "");
  });
}
