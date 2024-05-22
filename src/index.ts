import { config } from 'dotenv';
import { Signer, ethers } from 'ethers';
import { failWith } from './utils';
import { SensorData, SensorDataProvider } from './sensors/sensorDataProvider';
import { FakeSensor } from './sensors/fakeSensor';
import { DataEncryptor } from './encryption/dataEncryptor';
import { TacoEncryptor } from './encryption/taco';
import { isSubscribed } from './encryption/tacoConditions';
import { IpfsStorage } from './storage/storage';
import { PinataStorage } from './storage/pinata';

const setup = async () => {
    config();
    const homeUUID: string = process.env.HOME_UUID
        ?? failWith("Must provide a home uuid in the env file");
    const rpcProvider: string = process.env.RPC_PROVIDER
        ?? failWith("Must provide a RPC provider in the env file");
    const privateKey: string = process.env.PRIV_KEY
        ?? failWith("Must provide the signer's private key in the env file");
    const pinataKey: string = process.env.PINATA_JWT_KEY
        ?? failWith("Must provide Pinata JWT key in the env file");
    const openWeatherKey: string = process.env.OPEN_WEATHER_API_KEY
        ?? failWith("Must provide OpenWeather API key for fake sensor in the env file");
    const provider = new ethers.providers.JsonRpcProvider(rpcProvider);
    const signer: Signer = new ethers.Wallet(privateKey, provider);

    const sensorDataProvider: SensorDataProvider = new FakeSensor('Malaga', openWeatherKey);

    const encryptor: DataEncryptor = new TacoEncryptor(provider, signer, isSubscribed);

    const ipfsStorage: IpfsStorage = new PinataStorage(pinataKey);

    return { homeUUID, sensorDataProvider, encryptor, ipfsStorage };
};

const run = async () => {
    console.log("Starting setup...");
    const { homeUUID, sensorDataProvider, encryptor, ipfsStorage } = await setup();
    console.log("Setup completed");

    setInterval(() => {
        sensorDataProvider.getSensorData()
            .then((sensorData: SensorData) => {
                console.log(sensorData);
                return encryptor.encrypt(JSON.stringify(sensorData));
            })
            .then((bytes: Uint8Array) => {
                console.log(bytes);
                return ipfsStorage.storeCyphertext(homeUUID, bytes);
            })
            .then((result) => console.log(result));
    }, 10000);
};

run();

