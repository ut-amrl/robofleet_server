import { model } from "mongoose";
import { IRobotDocument } from "./robots.types";
import RobotSchema from "./robots.schema";

export const RobotModel = model<IRobotDocument>("robot", RobotSchema);