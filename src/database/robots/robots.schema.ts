import { Schema } from "mongoose";
import { findOneOrCreate } from "./robots.statics";
import { setLastUpdated } from "./robots.methods";

const RobotSchema = new Schema({
  name: String,
  ip: String,
  lastLocation: {
    type: String,
    default: ''
  },
  lastStatus: {
    type: String,
    default: ''
  },
  lastUpdated: {
    type: Date,
    default: new Date()
  }
});

RobotSchema.statics.findOneOrCreate = findOneOrCreate;
RobotSchema.methods.setLastUpdated = setLastUpdated;

export default RobotSchema;