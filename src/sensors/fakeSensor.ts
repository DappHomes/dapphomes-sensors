import { SensorDataProvider, SensorData, SensorReading } from "./sensorDataProvider";

export class FakeSensor implements SensorDataProvider {
    private city: string;
    private weatherURL: string;


    constructor(city: string, apiKey: string) {
        this.city = city;
        this.weatherURL = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&APPID=${apiKey}`;
    }

    async getSensorData(): Promise<SensorData> {
        const response = await fetch(this.weatherURL);
        if (!response.ok) {
            throw new Error(`Failed to fetch weather data: ${response.statusText}`);
        }
        const weatherData = await response.json();
        console.log(weatherData);
        const { main: { temp, pressure, humidity } } = weatherData;
        return new SensorData(
            [
                new SensorReading(temp, "temp", this.city),
                new SensorReading(pressure, "pressure", this.city),
                new SensorReading(humidity, "humidity", this.city),
            ]
        );
    }
}
