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

WORKDIR ${LAMBDA_TASK_ROOT}

COPY ./ ./

# upgrade pip command
RUN pip install --upgrade pip 

# install python lib 
RUN pip install -r requirements.txt

RUN pwd
RUN ls
CMD [ "app.handler" ]