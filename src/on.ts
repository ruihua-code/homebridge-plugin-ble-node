const noble = require("@abandonware/noble");
const shell = require('shelljs');

const serviceUuids = ["ffe0"];
const characteristicUUID = "ffe2";

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
function write(characteristic: any) {
    var crust = Buffer.alloc(3);
    crust.writeUInt8(231, 0);
    crust.writeUInt8(241, 1);
    crust.writeUInt8(1, 2);
    characteristic.write(crust, true, (err: any) => {
        if (err) {
            console.log("写入失败：", err);
        } else {
            console.log("写入成功");
        }
    });
}
