import config from '../config'
import LevelTypescript from 'level-ts';
import Level from 'level';
import RobotInformation from './robot';

const robotDbInstance = Level('robofleet-robots');
let robotDatabase = new LevelTypescript<RobotInformation>(robotDbInstance);

export function robotDb() {
  return robotDatabase;
}

export const disconnect = () => {
  return robotDbInstance.close();
};
