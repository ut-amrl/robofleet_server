import { IRobotDocument, IRobotModel } from "./robots.types";

export async function findOneOrCreate(
    this: IRobotModel, {
      name,
      ip
    }: { 
      name: string,
      ip: string
  }): Promise<IRobotDocument> {
    const record = await this.findOne({ name, ip });
    if (record) {
      return record;
    } else {
      return new this({ name, ip }).save();
    }
  }
