FROM node:18

COPY . /dapphomes-sensors

WORKDIR /dapphomes-sensors/

RUN npm i

ENTRYPOINT ["npx", "ts-node",  "src/index.ts"]
