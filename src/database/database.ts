import Mongoose = require('mongoose');
let database: Mongoose.Connection;
import { RobotModel } from "./robots/robots.model";
import RobotSchema from './robots/robots.schema';
import config from '../config'

export const connect = (onConnect: () => void, onError: () => void) => {
  const uri = config.dbConnectString;
  // add your own uri below  
  database = Mongoose.createConnection(uri, {
    useNewUrlParser: true,
    useFindAndModify: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  });

  database.once("open", onConnect);
  database.on("error", onError);
  database.model("robot", RobotSchema);

  return database;
};

export const disconnect = () => {
  if (!database) {
    return;
  }
  Mongoose.disconnect();
};
