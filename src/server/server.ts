import express, { Express, Request, Response } from 'express';
import { IpFilter } from 'express-ipfilter';
import bonjour from 'bonjour';
import { DataEncryptor } from '../encryption/dataEncryptor';
import { IpfsStorage } from '../storage/storage';

const HOST = '0.0.0.0';
const PORT = 3000;

const LAN_IP_RANGES = [
    '127.0.0.1',       // localhost
    '192.168.0.0/16',  // Local Range 192.168.x.x
    '10.0.0.0/8',      // Local Range 10.x.x.x
    '172.16.0.0/12'    // Local Range 172.16.x.x to 172.31.x.x
];

export class Server {

    private srv: Express;

    constructor() {
        this.srv = express();
    }

    configure = async(
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
                await storage.storeCyphertext(homeUUID, bytes);

                res.status(200).json({ message: 'Sensor data received', sensorId, sensorData });
            } catch (err) {
                res.status(500).json({ error_message: 'Internal error: ', err });
            }
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
}
