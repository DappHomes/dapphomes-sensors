export interface SensorDataProvider {
   getSensorData(): Promise<SensorData>
}

export class SensorData {
    sensorReadings: Array<SensorReading>;

    constructor(sensorReadings: Array<SensorReading>) {
        this.sensorReadings = sensorReadings;
    }
}

export class SensorReading {
    value: string;
    magnitude: string; // enumerate values? "temp, humidity, light, ..."
    location: string;
    metadata?: object;

    constructor(value: string, magnitude: string, location: string, metadata?: object) {
        this.value = value;
        this.magnitude = magnitude;
        this.location = location;
        if (metadata) {
            this.metadata = metadata;
        }
    }
}
