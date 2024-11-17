FROM python:3.8.20

WORKDIR /src
COPY ./src/python /src
COPY ./requirements.txt /src

# upgrade pip command
RUN pip install --upgrade pip 

# install python lib 
RUN pip install -r requirements.txt