export default class RobotInformation {
  name: string;
  ip: string;
  lastLocation: string;
  lastStatus: string;
  lastUpdated: Date;

  constructor(n: string, i: string, loc: string, stat: string, updated: Date) {
    this.name = n;
    this.ip = i;
    this.lastLocation = loc;
    this.lastStatus = stat;
    this.lastUpdated = updated;
  }


  toJSON() {
    return JSON.stringify({
      name: this.name,
      ip: this.ip,
      lastLocation: this.lastLocation,
      lastStatus: this.lastStatus,
      lastUpdated: this.lastUpdated.toString()
    }, null, 2);
  }

}
