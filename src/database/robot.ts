export default class RobotInformation {
  ip: string;
  name: string;
  lastLocation: string;
  lastStatus: string;
  lastUpdated: Date;

  constructor(i: string, n: string, loc: string, stat: string, updated: Date) {
    this.ip = i;
    this.name = n;
    this.lastLocation = loc;
    this.lastStatus = stat;
    this.lastUpdated = updated;
  }


  jsonString() {
    return JSON.stringify(this.json());
  }

  json() {
    return {
      ip: this.ip,
      name: this.name,
      lastLocation: this.lastLocation,
      lastStatus: this.lastStatus,
      lastUpdated: this.lastUpdated.toString()
    };
  }

  static fromJSON(json: string) {
    let obj = JSON.parse(json);
    return new RobotInformation(obj.ip, obj.name, obj.lastLocation, obj.lastStatus, obj.lastUpdated);
  }

}
