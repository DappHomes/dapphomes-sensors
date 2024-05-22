import { DataEncryptor } from './dataEncryptor';
import * as TACo from '@nucypher/taco';
import { providers, Signer } from 'ethers';

type TACoCondition = TACo.conditions.condition.Condition;

export class TacoEncryptor implements DataEncryptor {
    provider: providers.Provider;
    signer: Signer;
    condition: TACoCondition;

    constructor(
        provider: providers.Provider,
        signer: Signer,
        condition: TACoCondition
    ) {
        this.provider = provider;
        this.signer = signer;
        this.condition = condition;
    }

    encrypt(data: string): Promise<Uint8Array> {
        console.assert(this.condition.requiresSigner(), 'Subscription requires a signer.');

        return TACo.initialize()
            .then(() => TACo.encrypt(
                this.provider,
                TACo.domains.TESTNET,
                data,
                this.condition,
                0,
                this.signer,
            ))
            .then((mk: TACo.ThresholdMessageKit) => mk.toBytes());
    }

}
