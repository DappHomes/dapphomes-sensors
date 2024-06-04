# dapphomes-sensors

Code processing sensors readings: read, packing, encrypting and pushing to [IPFS](https://ipfs.tech/) using [Pinata](https://www.pinata.cloud/).

## deploy

```bash
git clone https://github.com/DappHomes/dapphomes-sensors.git
cp .env.sample .env
# edit .env within your own data
docker compose up -d --build
```
