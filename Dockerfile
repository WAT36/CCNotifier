# python
FROM public.ecr.aws/lambda/python:3.8
# install  firefox(firefox-esr?)
ENV HOME="/tmp"
RUN yum -y update
RUN cat /etc/os-release
RUN yum install -y amazon-linux-extras
RUN yum install -y Xvfb
RUN PYTHON=python2 amazon-linux-extras install firefox -y
#RUN yum install -y firefox 
RUN yum install -y wget bzip2 libxtst6 libgtk-3-0 libx11-xcb-dev libdbus-glib-1-2 libxt6 libpci-dev && rm -rf /var/lib/apt/lists/*

# node
#RUN curl -SL https://deb.nodesource.com/setup_20.x | bash
RUN yum install nodejs

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

# CMD ["./src/entrypoint.sh"]
COPY ./src/python/app.py ${LAMBDA_TASK_ROOT}
CMD [ "app.handler" ]