export interface DataEncryptor {
    encrypt(data: string): Promise<Uint8Array>;
}
