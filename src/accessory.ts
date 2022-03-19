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
  private readonly initNode: any;
  private switchOn = false;

  private readonly switchService: Service;
  private readonly informationService: Service;

  constructor(log: Logging, config: AccessoryConfig, api: API) {
    this.log = log;
    this.name = config.name;
    this.onNode = config.onNode;
    this.offNode = config.offNode;
    this.initNode = config.initNode;

    this.switchService = new hap.Service.Switch(this.name);
    const characteristic = this.switchService.getCharacteristic(hap.Characteristic.On);

    characteristic.on(CharacteristicEventTypes.GET, (callback: CharacteristicGetCallback) => {
      let spawnSyncRes = spawnSync("node", [this.initNode], { encoding: "utf-8" })
      console.log("初始化执行结果:", spawnSyncRes.stdout.toString())
      this.switchOn = spawnSyncRes.stdout.includes('1')
      log.info("Current state of the switch was returned: " + (this.switchOn ? "ON" : "OFF"));
      callback(undefined, this.switchOn);
    })

    characteristic.on(CharacteristicEventTypes.SET, (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
      console.log(`执行脚本：node ${[value ? this.onNode : this.offNode]}`)
      let spawnSyncRes = spawnSync("node", [value ? this.onNode : this.offNode], { encoding: "utf-8" })
      console.log("执行结果:", spawnSyncRes.stdout)
      this.switchOn = value as boolean;
      callback()
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
