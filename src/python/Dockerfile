# python
FROM public.ecr.aws/lambda/python:3.8
# install  firefox(firefox-esr?)
ENV HOME="/tmp"
RUN yum -y update
RUN yum install -y amazon-linux-extras
RUN yum install -y Xvfb
RUN PYTHON=python2 amazon-linux-extras install firefox -y
RUN yum install -y firefox
RUN yum install -y wget bzip2 libxtst6 libgtk-3-0 libx11-xcb-dev libdbus-glib-1-2 libxt6 libpci-dev && rm -rf /var/lib/apt/lists/*
RUN wget https://github.com/mozilla/geckodriver/releases/download/v0.32.2/geckodriver-v0.32.2-linux64.tar.gz
RUN yum -y install tar 
RUN tar -xf geckodriver-v0.32.2-linux64.tar.gz
RUN mv geckodriver /usr/local/bin/
RUN export MOZ_HEADLESS=1
RUN export HOME=/tmp/profile
ENV HOME="/tmp"

WORKDIR ${LAMBDA_TASK_ROOT}

COPY ./ ./

# upgrade pip command
RUN pip install --upgrade pip 

# install python lib 
RUN pip install -r requirements.txt --target "${{LAMBDA_TASK_ROOT}}"

CMD [ "app.handler" ]