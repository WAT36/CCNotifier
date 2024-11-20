FROM node:20-alpine

# Create app directory
WORKDIR /usr/src
COPY ./src/ts ./src/ts

# Install app dependencies (package.json and package-lock.json)
COPY package*.json ./
RUN npm install

CMD npm run start:test