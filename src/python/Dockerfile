# ベースイメージとしてAWS Lambda用のPython 3.8を指定
FROM public.ecr.aws/lambda/python:3.8

# 必要なパッケージをインストール
RUN yum install -y \
    wget \
    unzip \
    xorg-x11-server-Xvfb \
    libXcomposite \
    libXcursor \
    libXi \
    libXtst \
    libXScrnSaver \
    libXrandr \
    alsa-lib \
    atk \
    cups-libs \
    gtk3 \
    pango \
    ipa-gothic-fonts \
    nss \
    && yum clean all

# ChromeとChromeDriverをインストール
RUN curl -O https://storage.googleapis.com/chrome-for-testing-public/122.0.6261.111/linux64/chrome-linux64.zip && \
    unzip chrome-linux64.zip && \
    mkdir -p /opt/google/chrome && \
    mv chrome-linux64/* /opt/google/chrome && \
    chmod +x /opt/google/chrome/chrome && \
    ln -sf /opt/google/chrome/chrome /usr/bin/google-chrome && \
    rm -f chrome-linux64.zip

RUN curl -O https://storage.googleapis.com/chrome-for-testing-public/122.0.6261.111/linux64/chromedriver-linux64.zip && \
    unzip chromedriver-linux64.zip && \
    mv chromedriver-linux64/chromedriver /usr/bin/chromedriver && \
    chmod +x /usr/bin/chromedriver && \
    rm -rf chromedriver-linux64*

WORKDIR ${LAMBDA_TASK_ROOT}

COPY ./ ./

# upgrade pip command
RUN pip install --upgrade pip 

# install python lib 
RUN pip3 install -r requirements.txt

# test
RUN pip3 install requests

# 必要な環境変数を設定
ENV PATH="/opt/google/chrome:/usr/bin/google-chrome:/usr/bin:${PATH}"

RUN Xvfb :99 -screen 0 1280x1024x24 & export DISPLAY=:99

CMD [ "app.handler" ]