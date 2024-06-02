import { DataEncryptor } from './encryption/dataEncryptor';
import { TacoEncryptor } from './encryption/taco';
import { isSubscribed } from './encryption/tacoConditions';
import { IpfsStorage } from './storage/storage';
import { PinataStorage } from './storage/pinata';
import { Server } from './server/server';
import { getOrCreateWallet } from './wallet/wallet';
import { failWith } from './utils';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const homeUUID: string = process.env.HOME_UUID ?? failWith("Must provide a home uuid in the env file");

const rpcProvider: string = process.env.RPC_PROVIDER ?? failWith("Must provide a RPC provider in the env file");
const chain: number = Number(process.env.CHAIN_ID ?? 11155111);
if (Number.isNaN(chain)) failWith("Must provide a chain");
const contractAddress = process.env.CONTRACT_ADDRESS ?? failWith("Must provide a contract address");

const walletPath = path.resolve(__dirname, 'wallet.json');
const walletPassword = process.env.WALLET_PASSWORD ?? failWith("Must provide a wallet password in the env file");
const serverName = 'sensor-coordinator';

(async () => {
    const { provider, wallet } = await getOrCreateWallet(rpcProvider, walletPath, walletPassword);

    const isSubscribedCondition = isSubscribed(contractAddress, chain);
    const encryptor: DataEncryptor = new TacoEncryptor(provider, wallet, isSubscribedCondition);

    const pinataKey: string = process.env.PINATA_JWT_KEY ?? failWith("Must provide Pinata JWT key in the env file");
    const ipfsStorage: IpfsStorage = new PinataStorage(pinataKey);

    const server = new Server();

    server.configure(homeUUID, encryptor, ipfsStorage);
    server.launch(serverName);
})();
