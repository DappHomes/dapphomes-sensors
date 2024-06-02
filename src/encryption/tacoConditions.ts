import { conditions } from '@nucypher/taco';
import { ethers } from 'ethers';
import { failWith } from '../utils';

const isSubscribedABI: conditions.base.contract.FunctionAbiProps = {
    "name": "isSubscribed",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
        {
            "internalType": "address",
            "name": "subscriber",
            "type": "address"
        }
    ],
    "outputs": [
        {
            "internalType": "bool",
            "name": "",
            "type": "bool"
        }
    ],
};

export const isSubscribed = (contractAddress: string, chain: number) => {
    if (!ethers.utils.isAddress(contractAddress)) failWith("Must provide a valid contract address");
    return new conditions.base.contract.ContractCondition({
        method: 'isSubscribed',
        functionAbi: isSubscribedABI,
        parameters: [':userAddress'],
        contractAddress: contractAddress,
        chain: chain,
        returnValueTest: {
            comparator: '==',
            value: true
        }
    });
};
