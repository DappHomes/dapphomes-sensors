import express, { Express, Request, Response } from 'express';
import { WebSocketServer } from 'ws';
import { IpFilter } from 'express-ipfilter';
import bonjour from 'bonjour';
import { DataEncryptor } from '../encryption/dataEncryptor';
import { IpfsStorage } from '../storage/storage';
import fs from 'fs';
import path from 'path';

const HOST = '0.0.0.0';
const PORT = 3000;
const WS_PORT = 3001;

const LAN_IP_RANGES = [
    '127.0.0.1',       // localhost
    '192.168.0.0/16',  // Local Range 192.168.x.x
    '10.0.0.0/8',      // Local Range 10.x.x.x
    '172.16.0.0/12'    // Local Range 172.16.x.x to 172.31.x.x
];

interface SensorReading {
    sensorId: string;
    temperature: number;
    pressure: number;
    humidity: number;
    timestamp: Date;
    ipfsHash: string;
}

export class Server {

    private srv: Express;
    private wss: WebSocketServer;
    private readings: SensorReading[] = [];
    private template: string;

    constructor() {
        this.srv = express();
        this.wss = new WebSocketServer({ port: WS_PORT });
        this.template = fs.readFileSync(path.join(__dirname, 'logs_template.html'), 'utf-8');
    }

    configure = async (
        homeUUID: string,
        encryptor: DataEncryptor,
        storage: IpfsStorage,
    ) => {
        this.srv.use(express.json());
        // allow connections only from local network
        this.srv.use(IpFilter(LAN_IP_RANGES, { mode: 'allow' }));

        this.srv.post('/sensor-reading/:sensorId', async (req: Request, res: Response) => {
            try {
                const { sensorId } = req.params;
                const sensorData = req.body;
                // TODO validate request body
                console.log(`Received data from sensor ${sensorId}:`, sensorData);

                const bytes: Uint8Array = await encryptor.encrypt(JSON.stringify(sensorData));
                const ipfsHash = await storage.storeCyphertext(homeUUID, bytes);

                this.addReading(sensorId, sensorData, ipfsHash);
                this.broadcastUpdate();

                res.status(200).json({ message: 'Sensor data received', sensorId, sensorData });
            } catch (err) {
                res.status(500).json({ error_message: 'Internal error: ', err });
            }
        });

        this.srv.get('/logs', (req: Request, res: Response) => {
            const readingsHtml = this.generateReadingsHtml(this.readings);
            const html = this.template.replace('<!-- Readings will be inserted here -->', readingsHtml);
            res.send(html);
        });
    };

    launch = (
        serverName: string
    ) => {
        this.srv.listen({ host: HOST, port: PORT }, async () => {

            const bonjourService = bonjour();
            bonjourService.publish({ name: serverName, type: 'http', port: PORT, host: `${serverName}.local` });

            console.log(`Waiting for readings at http://${serverName}.local/`);
        });
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    addReading = (sensorId: string, data: any, ipfsHash: string) => {
        const reading: SensorReading = {
            sensorId,
            temperature: data.readings.temperature.value,
            pressure: data.readings.pressure.value,
            humidity: data.readings.humidity.value,
            timestamp: new Date(),
            ipfsHash: ipfsHash
        };
        this.readings.push(reading);
    };

    broadcastUpdate = () => {
        const update = JSON.stringify(this.readings);
        this.wss.clients.forEach(client => {
            if (client.readyState === 1) {
                client.send(update);
            }
        });
    };

    generateReadingsHtml = (readings: SensorReading[]): string => {
        const iconTemperature = `
            <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 15.28V10.5a1 1 0 0 0-2 0v4.78A2 2 0 0 0 10 17a2 2 0 0 0 4 0 2 2 0 0 0-1-1.72M16.5 13V5.5a4.5 4.5 0 0 0-9 0V13a6 6 0 0 0 3.21 9.83A7 7 0 0 0 12 23a6 6 0 0 0 4.5-10m-2 7.07a4 4 0 0 1-5.32-6 1 1 0 0 0 .3-.71V5.5a2.5 2.5 0 0 1 5 0v7.94a1 1 0 0 0 .3.71 4 4 0 0 1-.28 6Z"/>
            </svg>
        `;
        const iconPressure = `
            <svg width="24" height="24" viewBox="0 0 188.377 188.377" xmlns="http://www.w3.org/2000/svg">
                <path d="M158.717 24.669c-5.23-12.101-17.528-20.058-31.432-20.058-17.526 0-32 12.741-33.825 29.07-12.736 1.128-22.754 11.749-22.754 24.64 0 13.017 10.154 23.763 23.206 24.675q.327.063.663.063h63.166q.144 0 .284-.01.42.01.844.01c16.271 0 29.508-13.097 29.508-29.195 0-16.147-13.158-29.268-29.66-29.195m.151 51.258q-.489 0-.97-.021-.081-.005-.162-.004a3 3 0 0 0-.413.024H95.028a8 8 0 0 0-.265-.024c-9.493-.481-16.927-8.204-16.927-17.582 0-10.025 8.7-18.021 18.829-17.582a3.58 3.58 0 0 0 2.627-.996 3.6 3.6 0 0 0 1.104-2.594c0-14.009 12.062-25.406 26.888-25.406 11.791 0 22.097 7.132 25.647 17.746.524 1.57 2.07 2.622 3.719 2.417a23 23 0 0 1 2.218-.104c12.339 0 22.377 9.897 22.377 22.063 0 12.167-10.037 22.063-22.377 22.063m-56.071 39.225v-7.133H12.176l6.519-6.519-5.042-5.042-12.608 12.607a3.563 3.563 0 0 0 0 5.042l12.607 12.606 5.042-5.042-6.519-6.519zm28.527 28.526v-7.132H40.702l6.519-6.519-5.042-5.042-12.607 12.606a3.563 3.563 0 0 0 0 5.042l12.607 12.606 5.042-5.042-6.519-6.519zm24.96 9.834-5.042 5.042 6.519 6.519H63.573v7.132h94.188l-6.519 6.519 5.042 5.042 12.607-12.606a3.563 3.563 0 0 0 0-5.042z"/>
            </svg>
        `;
        const iconHumidity = `
            <svg width="24" height="24" viewBox="0 0 328.611 328.611" xmlns="http://www.w3.org/2000/svg">
                <path d="M209.306 50.798a7.5 7.5 0 0 0-12.088 8.883c54.576 74.266 66.032 123.541 66.032 151.8 0 27.691-8.272 52.794-23.293 70.685-17.519 20.866-42.972 31.446-75.651 31.446-73.031 0-98.944-55.018-98.944-102.131 0-52.227 28.103-103.234 51.679-136.829 25.858-36.847 52.11-61.415 52.37-61.657a7.5 7.5 0 0 0-10.209-10.99c-1.11 1.031-27.497 25.698-54.254 63.765-24.901 35.428-54.586 89.465-54.586 145.71 0 31.062 9.673 59.599 27.236 80.353 20.361 24.061 50.345 36.779 86.708 36.779 36.794 0 66.926-12.726 87.139-36.801 17.286-20.588 26.806-49.117 26.806-80.33-.001-55.265-37.493-117.884-68.945-160.683"/>
                <path d="m198.43 148.146-95.162 95.162a7.5 7.5 0 0 0 5.304 12.803 7.48 7.48 0 0 0 5.304-2.197l95.162-95.162a7.5 7.5 0 0 0 0-10.606 7.5 7.5 0 0 0-10.608 0m-6.465 59.753c-13.292 0-24.106 10.814-24.106 24.106s10.814 24.106 24.106 24.106 24.106-10.814 24.106-24.106-10.814-24.106-24.106-24.106m0 33.212c-5.021 0-9.106-4.085-9.106-9.106s4.085-9.106 9.106-9.106 9.106 4.085 9.106 9.106-4.085 9.106-9.106 9.106m-66.787-46.949c13.292 0 24.106-10.814 24.106-24.106s-10.814-24.106-24.106-24.106-24.106 10.814-24.106 24.106 10.814 24.106 24.106 24.106m0-33.213c5.021 0 9.106 4.085 9.106 9.106s-4.085 9.106-9.106 9.106-9.106-4.085-9.106-9.106 4.084-9.106 9.106-9.106"/>
            </svg>
        `;
        const iconIPFS = `
            <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 0 1.608 6v12L12 24l10.392-6V6zm-1.073 1.445a1.8 1.8 0 0 0 2.138 0l7.534 4.35a1.8 1.8 0 0 0 0 .403l-7.535 4.35a1.8 1.8 0 0 0-2.137 0l-7.536-4.35a1.8 1.8 0 0 0 0-.402zM21.324 7.4q.164.12.349.201v8.7a1.8 1.8 0 0 0-1.069 1.852l-7.535 4.35a1.8 1.8 0 0 0-.349-.2l-.009-8.653a1.8 1.8 0 0 0 1.07-1.851zm-18.648.048 7.535 4.35a1.8 1.8 0 0 0 1.069 1.852v8.7q-.186.081-.349.202l-7.535-4.35a1.8 1.8 0 0 0-1.069-1.852v-8.7a2 2 0 0 0 .35-.202z"/>
            </svg>
        `;

        return readings.map(reading => `
            <div>
                <h3>Sensor ID: ${reading.sensorId}</h3>
                <p>${iconTemperature} Temperature: ${reading.temperature} °C</p>
                <p>${iconPressure} Pressure: ${reading.pressure} hPa</p>
                <p>${iconHumidity} Humidity: ${reading.humidity} %</p>
                <p>${iconIPFS} IPFS Hash: <a href="https://ipfs.io/ipfs/${reading.ipfsHash}" target="_blank">${reading.ipfsHash}</a></p>
                <p>Timestamp: ${reading.timestamp.toISOString()}</p>
            </div>
        `).join('<hr>');
    };
}
