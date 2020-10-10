import config from '../config'
import levelup from 'levelup'
import leveldown from 'leveldown'
import RobotInformation from './robot';

var robotDbInstance = levelup(leveldown('robofleet-robots'));

export function robotDb() {
  return robotDbInstance;
}

export const disconnect = () => {
  return robotDbInstance.close();
};
