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
const noble = require("@abandonware/noble");
const shell = require('shelljs');

const serviceUuids = ["ffe0"];
const characteristicUUID = "ffe2";

/*
 * IMPORTANT NOTICE
 *
 * One thing you need to take care of is, that you never ever ever import anything directly from the "homebridge" module (or the "hap-nodejs" module).
 * The above import block may seem like, that we do exactly that, but actually those imports are only used for types and interfaces
 * and will disappear once the code is compiled to Javascript.
 * In fact you can check that by running `npm run build` and opening the compiled Javascript file in the `dist` folder.
 * You will notice that the file does not contain a `... = require("homebridge");` statement anywhere in the code.
 *
 * The contents of the above import statement MUST ONLY be used for type annotation or accessing things like CONST ENUMS,
 * which is a special case as they get replaced by the actual value and do not remain as a reference in the compiled code.
 * Meaning normal enums are bad, const enums can be used.
 *
 * You MUST NOT import anything else which remains as a reference in the code, as this will result in
 * a `... = require("homebridge");` to be compiled into the final Javascript code.
 * This typically leads to unexpected behavior at runtime, as in many cases it won't be able to find the module
 * or will import another instance of homebridge causing collisions.
 *
 * To mitigate this the {@link API | Homebridge API} exposes the whole suite of HAP-NodeJS inside the `hap` property
 * of the api object, which can be acquired for example in the initializer function. This reference can be stored
 * like this for example and used to access all exported variables and classes from HAP-NodeJS.
 */
let hap: HAP;

/*
 * Initializer function called when the plugin is loaded.
 */
export = (api: API) => {
  hap = api.hap;
  api.registerAccessory("homebridge-plugin-ble-node", BleNode);
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
      console.log("开关值:", value)


      noble.on("stateChange", async (state: string) => {
        console.log("state:", state);
        if (state === "poweredOn") {
          await noble.startScanningAsync(serviceUuids);
        }
      });
      noble.on("discover", async (peripheral: any) => {
        noble.stopScanning();
        peripheral.connect(() => {
          peripheral.discoverServices(serviceUuids, (err: any, services: any) => {
            services.forEach((service: any) => {
              console.log("found service:", service.uuid);

              service.discoverCharacteristics(characteristicUUID, (err: any, characteristics: any) => {
                characteristics.forEach((characteristic: any) => {
                  console.log("found characteristic:", characteristic.uuid);
                  if (characteristic.uuid === characteristicUUID) {
                    write(characteristic);
                  }
                });
              });
            });
          });
        });
      });
      const write = (characteristic: any) => {
        var crust = Buffer.alloc(3);
        crust.writeUInt8(231, 0);
        crust.writeUInt8(241, 1);
        crust.writeUInt8(value ? 1 : 0, 2);
        characteristic.write(crust, true, (err: any) => {
          if (err) {
            console.log("写入失败：", err);
          } else {
            console.log("写入成功");
            this.switchOn = value as boolean;
            callback()
          }
        });
      }





      // console.log(`开始执行脚本：node ${[value ? this.onNode : this.offNode]}`)
      // let spawnSyncRes = spawnSync("node", [value ? this.onNode : this.offNode], { encoding: "utf-8" })
      // console.log("spawnSyncRes:", spawnSyncRes)
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
