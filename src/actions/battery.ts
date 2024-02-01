import { KeyUpEvent, SingletonAction, WillAppearEvent, action } from "@elgato/streamdeck";
import { getDeviceList } from 'usb';

@action({ UUID: "dk.comfycastle.razerbatteryindicator.battery" })
export class BatteryIndicator extends SingletonAction {
	onWillAppear(ev: WillAppearEvent<object>): void | Promise<void> {
		return ev.action.setTitle(`Test title`)
	}

	onKeyUp(ev: KeyUpEvent<object>): void | Promise<void> {
		console.log('click')
		console.log(getDeviceList())


		// const devices: usb.Device[] = getDeviceList();
		// console.log(devices)
	}
}