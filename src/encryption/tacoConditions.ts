import { conditions } from '@nucypher/taco';

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

export const isSubscribed = new conditions.base.contract.ContractCondition({
    method: 'isSubscribed',
    functionAbi: isSubscribedABI,
    parameters: [':userAddress'],
    contractAddress: '0x0f8D52Be2D2dc454B4f2639b61a4BB82ec2Ff440',
    chain: 11155111,
    returnValueTest: {
        comparator: '==',
        value: true
    }
});
