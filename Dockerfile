FROM python:3.8.20
RUN apt-get update && apt-get install -y --no-install-recommends firefox-esr
RUN apt-get update && apt-get install -y wget bzip2 libxtst6 libgtk-3-0 libx11-xcb-dev libdbus-glib-1-2 libxt6 libpci-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /src
COPY ./src/python /src
COPY ./requirements.txt /src
COPY ./.env /

# upgrade pip command
RUN pip install --upgrade pip 

# install python lib 
RUN pip install -r requirements.txt