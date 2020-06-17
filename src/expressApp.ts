import express from "express";
import cors from "cors";
import { getIp } from "./util";

export function setupExpressApp(app: express.Application) {
  // use */ route to support base path
  app.get("*/echo-ip", cors(), (req, res) => {
    res.send(getIp(req) ?? "");
  });
}
