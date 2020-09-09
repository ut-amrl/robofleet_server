import { Document } from "mongoose";
import { IRobotDocument } from "./robots.types";

export async function setLastUpdated(this: IRobotDocument): Promise<void> {
  const now = new Date();
  if (!this.lastUpdated || this.lastUpdated < now) {
    this.lastUpdated = now;
    await this.save();
  }
}
