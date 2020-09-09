import { Document, Model } from "mongoose";

export interface IRobot {
  name: string,
  ip: string,
  lastLocation: string,
  lastStatus: string,
  lastUpdated: Date
}

export interface IRobotDocument extends IRobot, Document {
    setLastUpdated: (this: IRobotDocument) => Promise<void>;
}

export interface IRobotModel extends Model<IRobotDocument> {
    findOneOrCreate: (
      this: IRobotModel, {
        name,
        ip
      }: { 
        name: string,
        ip: string
    }
    ) => Promise<IRobotDocument>;
}