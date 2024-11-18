# OS: Debian Buster
# # Node.js: 14.4.0
# FROM node:20-alpine

FROM ubuntu:latest
RUN apt-get update
RUN apt-get install nodejs -y
RUN apt-get install npm -y
RUN update-alternatives --install /usr/bin/node node /usr/bin/nodejs 10

# Create app directory
WORKDIR /usr/src
COPY ./src/ts ./src/ts

# Install app dependencies (package.json and package-lock.json)
COPY package*.json ./
RUN npm install

CMD npm run start:test