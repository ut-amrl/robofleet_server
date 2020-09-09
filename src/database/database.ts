import Mongoose = require('mongoose');
let database: Mongoose.Connection;
import { RobotModel } from "./robots/robots.model";
import RobotSchema from './robots/robots.schema';


export const connect = (onConnect: () => void, onError: () => void) => {
  // add your own uri below
  const uri = "mongodb+srv://robofleet:dKXTHQhwSWk3Czao@robofleetstarter.irrcw.mongodb.net/<dbname>?retryWrites=true&w=majority";
  
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
