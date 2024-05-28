import dotenv from 'dotenv';
import { Signer, ethers } from 'ethers';
import { failWith } from './utils';
import { DataEncryptor } from './encryption/dataEncryptor';
import { TacoEncryptor } from './encryption/taco';
import { isSubscribed } from './encryption/tacoConditions';
import { IpfsStorage } from './storage/storage';
import { PinataStorage } from './storage/pinata';
import express, { Express, Request, Response } from 'express';
import { IpFilter } from 'express-ipfilter';

dotenv.config();

const homeUUID: string = process.env.HOME_UUID ?? failWith("Must provide a home uuid in the env file");

const rpcProvider: string = process.env.RPC_PROVIDER ?? failWith("Must provide a RPC provider in the env file");
const privateKey: string = process.env.PRIV_KEY ?? failWith("Must provide the signer's private key in the env file");
const provider = new ethers.providers.JsonRpcProvider(rpcProvider);
const signer: Signer = new ethers.Wallet(privateKey, provider);
const encryptor: DataEncryptor = new TacoEncryptor(provider, signer, isSubscribed);

const pinataKey: string = process.env.PINATA_JWT_KEY ?? failWith("Must provide Pinata JWT key in the env file");
const ipfsStorage: IpfsStorage = new PinataStorage(pinataKey);

const app: Express = express();
const port = 3000;
const localhost = '127.0.0.1';

app.use(express.json());

// allow connections only from local network
const localNetworkIpRanges = [
    '127.0.0.1',       // localhost
    '192.168.0.0/16',  // Local Range 192.168.x.x
    '10.0.0.0/8',      // Local Range 10.x.x.x
    '172.16.0.0/12'    // Local Range 172.16.x.x to 172.31.x.x
  ];

app.use(IpFilter(localNetworkIpRanges, { mode: 'allow' }));

app.post('/sensor-reading/:sensorId', async (req: Request, res: Response) => {
    try {
        const { sensorId } = req.params;
        const sensorData = req.body;
        // TODO validate request body
        console.log(`Received data from sensor ${sensorId}:`, sensorData);

        const bytes: Uint8Array = await encryptor.encrypt(JSON.stringify(sensorData));
        await ipfsStorage.storeCyphertext(homeUUID, bytes);

        res.status(200).json({ message: 'Sensor data received', sensorId, sensorData });
    } catch (err) {
        res.status(500).json({ error_message: 'Internal error: ', err })
    }
});

app.listen(port, localhost, () => {
    console.log(`Waiting for readings at http://${localhost}:${port}/`);
});

