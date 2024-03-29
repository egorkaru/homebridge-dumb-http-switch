import {
  API,
  AccessoryPlugin,
  Logger,
  AccessoryConfig,
  Service,
  Characteristic,
} from 'homebridge';

import axios from 'axios';

import { ACCESSORY_NAME } from './settings';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJSON = require('../package.json');

interface IHomebridgeDumbHTTPSwitchAccessoryConfig extends AccessoryConfig {
  url: string;
  method: 'GET' | 'POST';
  body: string;
}

const getBody = (body: string): Record<string, unknown> => {
  try {
    return JSON.parse(body) || {};
  } catch (e) {
    return {};
  }
};

export class HomebridgeDumbHTTPSwitchAccessory implements AccessoryPlugin {
  public readonly config: IHomebridgeDumbHTTPSwitchAccessoryConfig;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  private isRequestInProgress = false;

  private readonly switchService: Service;
  private readonly informationService: Service;

  constructor(
    public readonly log: Logger,
    config: AccessoryConfig,
    public readonly api: API,
  ) {
    this.config = config as IHomebridgeDumbHTTPSwitchAccessoryConfig;

    this.switchService = new this.api.hap.Service.Switch(this.config.name);
    this.switchService.getCharacteristic(this.Characteristic.On)
      .onGet(() => this.isRequestInProgress)
      .onSet(async () => {
        const url = this.config.url;
        const bodyOrParams = getBody(this.config.body);

        try {
          this.isRequestInProgress = true;

          const request = this.config.method === 'POST'
            ? axios.post(url, bodyOrParams)
            : axios.get(url, { params: bodyOrParams });

          await request;

          this.isRequestInProgress = false;

          return true;
        } catch (error) {
          this.log.error(String(error));

          this.isRequestInProgress = false;

          return false;
        }
      });

    this.informationService = new this.api.hap.Service.AccessoryInformation()
      .setCharacteristic(this.Characteristic.Manufacturer, 'Egor Rudinsky')
      .setCharacteristic(this.Characteristic.Model, ACCESSORY_NAME)
      .setCharacteristic(this.Characteristic.FirmwareRevision, packageJSON.version);

    log.info('Switch finished initializing!');
  }

  getServices(): Service[] {
    return [
      this.informationService,
      this.switchService,
    ];
  }

}
