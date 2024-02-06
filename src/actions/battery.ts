import {
    Action,
    ActionEvent,
    DidReceiveSettingsEvent,
    KeyUpEvent,
    SingletonAction,
    WillAppearEvent,
    WillDisappearEvent,
    action,
} from "@elgato/streamdeck";
import { getBatteryStatus } from "../usbTools";
import usb from "usb";
//@ts-ignore
import SvgBuilder from "svg-builder";

type BatteryStatusType = {
    batteryLife: string;
    isCharging: Boolean;
};

type IntervalsType = Record<
    string,
    {
        battery: Battery;
        batteryCheckInterval: NodeJS.Timeout;
		attachListener: void
    }
>;

class Battery {
    batteryStatus: BatteryStatusType = { batteryLife: "0", isCharging: false };

    updateBattery(batteryLife: string, isCharging: Boolean) {
        this.batteryStatus = { batteryLife, isCharging };
    }

    generateSvg(batteryStatus: BatteryStatusType) {
        if (!batteryStatus.batteryLife && !batteryStatus.isCharging)
            return new Error(`Can't generate svg. Battery status missing.`);
        let { batteryLife, isCharging } = batteryStatus;
        var svgImg = SvgBuilder.newInstance();
        svgImg.width(144).height(144);
        svgImg.rect({ height: "144", width: "144" });

        svgImg.text(
            {
                x: 72,
                y: 42,
                "font-size": 32,
                stroke: "white",
                fill: "white",
                "text-anchor": "middle",
            },
            batteryLife + "%"
        );
        svgImg.text(
            {
                x: 72,
                y: 80,
                "font-size": 32,
                stroke: "white",
                fill: "white",
                "text-anchor": "middle",
            },
            isCharging ? "Charging" : ""
        );

        let image = svgImg.render();
        let base64encoded = Buffer.from(image).toString("base64");
        let svgImage = `data:image/svg+xml;base64,${base64encoded}`;
        return svgImage;
    }
}

@action({ UUID: "dk.comfycastle.razerbatteryindicator.battery" })
export class BatteryIndicator extends SingletonAction {
    intervals: IntervalsType = {};
    async onWillAppear(ev: WillAppearEvent<object>): Promise<void> {
        if (!this.intervals[ev.action.id]) {
            this.intervals[ev.action.id] = {};
            this.intervals[ev.action.id]["battery"] = new Battery();
        }

        //ensures you don't have multiple intervals running for the same action
        if (this.intervals[ev.action.id]["batteryCheckInterval"] == undefined) {
            this.intervals[ev.action.id]["batteryCheckInterval"] = setInterval(
                async () => {
                    updateScreen();
                },
                10000
            );
        }

        let updateScreen = async () => {
            let batteryStatus = await getBatteryStatus();
            if (batteryStatus == undefined)
                return new Error("Battery status returned undefined");
            if (!batteryStatus.batteryLife && !batteryStatus.isCharging)
                return new Error(`Battery status malformed.`);
            let { batteryLife, isCharging } = batteryStatus;

            this.intervals[ev.action.id]["battery"].updateBattery(
                batteryLife,
                isCharging
            );
            let image =
                this.intervals[ev.action.id]["battery"].generateSvg(
                    batteryStatus
                );
            if (typeof image === "string") {
                ev.action.setImage(image);
            }
            ev.action.setSettings({
                batteryLife: batteryStatus?.batteryLife,
                isCharging: batteryStatus?.isCharging,
            });
            console.log(batteryLife, isCharging);
        };

		if (this.intervals[ev.action.id]["attachListener"] == undefined) {
			this.intervals[ev.action.id]["attachListener"] = usb.usb.on('attach', () => {
				setTimeout(async () => {
					console.log('BEEP BOOP MOMENT')
					updateScreen()
				}, 1000)
			})
		}
		


        updateScreen();
        console.log(this.intervals);
    }
    async onWillDisappear(ev: WillDisappearEvent<object>): Promise<void> {
        //ensures a queue of actions doesn't build up else after you switch screens these will all be executed at once
        clearInterval(this.intervals[ev.action.id]["batteryCheckInterval"]);
        delete this.intervals[ev.action.id]["batteryCheckInterval"];
		usb.usb.removeListener('attach', device => {console.log(device)})
    }

    async onKeyUp(ev: KeyUpEvent<object>): Promise<void> {
        console.log(this.intervals);
    }

    onDidReceiveSettings(
        ev: DidReceiveSettingsEvent<object>
    ): void | Promise<void> {
        console.log("didReceiveSettings");
    }
}