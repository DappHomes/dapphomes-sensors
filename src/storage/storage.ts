export interface IpfsStorage {
    storeCyphertext(homeUUID: string, bytes: Uint8Array): Promise<string>
}
