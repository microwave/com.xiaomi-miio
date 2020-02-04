const Homey = require("homey");

class AqaraMotionSensor extends Homey.Device {
  onInit() {
    this.initialize = this.initialize.bind(this);
    this.onEventFromGateway = this.onEventFromGateway.bind(this);
    this.data = this.getData();
    this.initialize();
    this.log("[Xiaomi Mi Home] Device init - name: " + this.getName() + " - class: " + this.getClass() + " - data: " + JSON.stringify(this.data));
  }

  initialize() {
    if (Homey.app.gatewaysList.length > 0) {
      this.registerStateChangeListener();
      this.setAvailable();
    } else {
      this.unregisterStateChangeListener();
    }
  }

  onEventFromGateway(device) {
    const { triggers } = this.getDriver();
    const data = JSON.parse(device["data"]);
    const settings = this.getSettings();

    if (data["status"] == "motion") {
      this.updateCapabilityValue("alarm_motion", true);
      if (this.timeout) {
        clearTimeout(this.timeout);
      }
      this.timeout = setTimeout(() => {
        this.updateCapabilityValue("alarm_motion", false);
      }, settings.alarm_duration_number * 1000);
    }

    if (data["lux"]) {
      this.updateCapabilityValue("measure_luminance", parseInt(data["lux"]));
    }

    if (data["no_motion"]) {
      this.updateCapabilityValue("alarm_motion", false);
      triggers["motionSensorNoMotion" + data.no_motion].trigger(this, {}, true);
    }

    if (data["voltage"]) {
      const battery = (data["voltage"] - 2800) / 5;
      this.updateCapabilityValue("measure_battery", battery > 100 ? 100 : battery);
      this.updateCapabilityValue("alarm_battery", battery <= 20 ? true : false);
    }

    this.setSettings({
      gatewaySid: Object.values(Homey.app.mihub.getDevices()).filter(deviceObj => deviceObj.sid == device.sid)[0].gatewaySid
    });
  }

  updateCapabilityValue(name, value) {
    if (this.getCapabilityValue(name) != value) {
      this.setCapabilityValue(name, value)
        .then(() => this.log("[" + this.getName() + "] [" + this.data.sid + "] [" + name + "] [" + value + "] Capability successfully updated"))
        .catch(error => this.log("[" + this.getName() + "] [" + this.data.sid + "] [" + name + "] [" + value + "] Capability not updated because there are errors: " + error.message));
    }
  }

  registerStateChangeListener() {
    Homey.app.mihub.on(this.data.sid, this.onEventFromGateway);
  }

  unregisterStateChangeListener() {
    Homey.app.mihub.removeListener(this.data.sid, this.onEventFromGateway);
  }

  onAdded() {
    this.log("[Xiaomi Mi Home] " + this.getName() + " device added");
  }

  onDeleted() {
    this.unregisterStateChangeListener();
    this.log("[Xiaomi Mi Home] " + this.getName() + " device deleted!");
  }
}

module.exports = AqaraMotionSensor;
