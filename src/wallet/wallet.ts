import fs from 'fs-extra';
import { Wallet, ethers } from 'ethers';

export interface WalletInfo {
    provider: ethers.providers.JsonRpcProvider,
    wallet: ethers.Wallet;
}


export const getOrCreateWallet = async (
    rpcProvider: string,
    walletPath: string,
    password: string
): Promise<WalletInfo> => {
    const provider = new ethers.providers.JsonRpcProvider(rpcProvider);
    let wallet: Wallet;
    if (fs.existsSync(walletPath)) {
        const walletJSON = await fs.readFile(walletPath, 'utf8');
        wallet = await ethers.Wallet.fromEncryptedJson(walletJSON, password);
    } else {
        wallet = ethers.Wallet.createRandom();
        const encryptedJson = await wallet.encrypt(password);
        await fs.writeFile(walletPath, encryptedJson);
    }
    wallet.connect(provider);
    return { provider, wallet };
};
