import {
  AccessoryConfig,
  AccessoryPlugin,
  API,
  CharacteristicEventTypes,
  CharacteristicGetCallback,
  CharacteristicSetCallback,
  CharacteristicValue,
  HAP,
  Logging,
  Service
} from "homebridge";
import { spawnSync } from 'child_process'

let hap: HAP;

/*
 * Initializer function called when the plugin is loaded.
 */
export = (api: API) => {
  hap = api.hap;
  api.registerAccessory("homebridge-plugin-ble-node", "HomebridgePluginBleNode", BleNode);
};

class BleNode implements AccessoryPlugin {

  private readonly log: Logging;
  private readonly name: string;
  private readonly onNode: any;
  private readonly offNode: any;
  private switchOn = false;

  private readonly switchService: Service;
  private readonly informationService: Service;

  constructor(log: Logging, config: AccessoryConfig, api: API) {
    this.log = log;
    this.name = config.name;
    this.onNode = config.onNode;
    this.offNode = config.offNode;

    this.switchService = new hap.Service.Switch(this.name);
    const characteristic = this.switchService.getCharacteristic(hap.Characteristic.On);

    characteristic.on(CharacteristicEventTypes.GET, (callback: CharacteristicGetCallback) => {
      log.info("Current state of the switch was returned: " + (this.switchOn ? "ON" : "OFF"));
      callback(undefined, this.switchOn);
    })

    characteristic.on(CharacteristicEventTypes.SET, (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
      console.log("开关值:", value, spawnSync)
      this.switchOn = value as boolean;
      callback()
      console.log(`开始执行脚本：node ${[value ? this.onNode : this.offNode]}`)
      let spawnSyncRes = spawnSync("node", [value ? this.onNode : this.offNode], { encoding: "utf-8" })
      if (spawnSyncRes.stderr) {
        console.log(Error(spawnSyncRes.stderr.toString()))
        process.exit(1)
      }
      console.log("spawnSyncRes:", spawnSyncRes)
      process.exit(0)
    })

    this.informationService = new hap.Service.AccessoryInformation()
      .setCharacteristic(hap.Characteristic.Manufacturer, "Custom Manufacturer")
      .setCharacteristic(hap.Characteristic.Model, "Custom Model");

    log.info("Switch finished initializing!");
  }

  /*
   * This method is optional to implement. It is called when HomeKit ask to identify the accessory.
   * Typical this only ever happens at the pairing process.
   */
  identify(): void {
    this.log("Identify!");
  }

  /*
   * This method is called directly after creation of this instance.
   * It should return all services which should be added to the accessory.
   */
  getServices(): Service[] {
    return [
      this.informationService,
      this.switchService,
    ];
  }

}
