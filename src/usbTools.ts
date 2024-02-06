import { findByIds, WebUSBDevice } from "usb";

export const getMessage = (mouse: any, commandClass: number, commandId: number, dataSize: number) => {
    // Function that creates and returns the message to be sent to the device
    let msg = Buffer.from([
        0x00,
        mouse.transactionId,
        0x00,
        0x00,
        0x00,
        dataSize,
        commandClass,
        commandId,
    ]);

    let crc = 0;

    for (let i = 2; i < msg.length; i++) {
        crc = crc ^ msg[i];
    }

    // the next 80 bytes would be storing the data to be sent, but for getting the battery no data is sent
    msg = Buffer.concat([msg, Buffer.alloc(80)]);

    // the last 2 bytes would be the crc and a zero byte
    msg = Buffer.concat([msg, Buffer.from([crc, 0])]);

    return msg;
};

export const getMouse = () => {
    //Find wireless DAV3, fallback wired DAV3
    const device = findByIds(0x1532, 0x00b7) || findByIds(0x1532, 0x00b6);
    if (device) {
        return device;
    } else {
        throw new Error("Can't find Razer DeathAdder V3 Pro");
    }
}

export const ControlTransferOut = async (mouse: WebUSBDevice, msg: Buffer) => {
    return mouse.controlTransferOut(
        {
            requestType: "class",
            recipient: "interface",
            request: 0x09,
            value: 0x300,
            index: 0x00,
        },
        msg
    );
}

export const ControlTransferIn = async (mouse: WebUSBDevice) => {
    return mouse.controlTransferIn(
        {
            requestType: "class",
            recipient: "interface",
            request: 0x01,
            value: 0x300,
            index: 0x00,
        },
        90
    );
}

export const getBatteryStatus = async () => {
    try {
        const device = await getMouse();
        const mouse = await WebUSBDevice.createInstance(device);
        mouse.open();

        const batteryLevelMsg = getMessage(mouse, 0x07, 0x80, 0x02);
        const isChargingMsg = getMessage(mouse, 0x07, 0x84, 0x02);

        if (mouse.configuration === null) {
            mouse.selectConfiguration(1);
        }

        await mouse.claimInterface(
            mouse.configuration.interfaces[0].interfaceNumber
        );

        const batteryLevelRequest = await ControlTransferOut(
            mouse,
            batteryLevelMsg
        );
        await new Promise((res) => setTimeout(res, 100));
        const batteryLevelReply = await ControlTransferIn(mouse);

        const isChargingRequest = await ControlTransferOut(
            mouse,
            isChargingMsg
        );
        await new Promise((res) => setTimeout(res, 100));
        const isChargingReply = await ControlTransferIn(mouse);

		if(batteryLevelReply.data && isChargingReply.data) {
			return {
				batteryLife: (
					(batteryLevelReply.data.getUint8(9) / 255) *
					100
				).toFixed(1),
				isCharging: isChargingReply.data.getUint8(9) == 1,
			};
		} else {
			throw new Error('batteryLevelReply or isChargingReply data is undefined')
		}
    } catch (error) {
        console.log(error)
    }
}