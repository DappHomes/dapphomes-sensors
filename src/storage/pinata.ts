import { toHexString } from '@nucypher/taco';
import { IpfsStorage } from './storage';
import PinataClient ,{ PinataPinOptions, PinataPinResponse } from '@pinata/sdk';

export class PinataStorage implements IpfsStorage {
    private pinata: PinataClient;

    constructor(pinataKey: string) {
        this.pinata = new PinataClient({ pinataJWTKey: pinataKey });
        this.pinata.testAuthentication()
            .catch((error: PinataError) => console.log(`Auth error in Pinata: ${error.reason} - ${error.details}`));

    }

    storeCyphertext = async (homeUUID: string, bytes: Uint8Array) => {
        const timestamp = Date.now();
        const options: PinataPinOptions = {
            pinataMetadata: {
                name: `SensorData-${homeUUID}-${timestamp}`,
                id: homeUUID,
                timestamp: Date.now(),
            },
            pinataOptions: {
                cidVersion: 1
            }
        };

        return this.pinata.pinJSONToIPFS({ cypher: toHexString(bytes) }, options)
                    .then((result: PinataPinResponse) => console.log(`PinataPinResponse: ${result.IpfsHash}`));
    };

}

interface PinataError {
    reason: string
    details: string
}

