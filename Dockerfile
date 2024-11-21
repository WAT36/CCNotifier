# python
FROM python:3.8.20
RUN apt-get update && apt-get install -y --no-install-recommends firefox-esr
RUN apt-get update && apt-get install -y wget bzip2 libxtst6 libgtk-3-0 libx11-xcb-dev libdbus-glib-1-2 libxt6 libpci-dev && rm -rf /var/lib/apt/lists/*

# node
RUN curl -SL https://deb.nodesource.com/setup_20.x | bash
RUN apt-get install nodejs

WORKDIR /app

COPY ./src ./src
COPY ./prisma ./prisma
COPY ./package*.json ./
COPY ./requirements.txt ./

# npm install
RUN npm install
RUN npx prisma generate

# upgrade pip command
RUN pip install --upgrade pip 

# install python lib 
RUN pip install -r requirements.txt

CMD ["./src/allUpdateBrandBidAsk.sh"]
