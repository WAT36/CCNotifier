FROM public.ecr.aws/lambda/nodejs:18
WORKDIR ${LAMBDA_TASK_ROOT}

ENV npm_config_loglevel=warn

COPY package*.json ./
COPY prisma/ ./prisma
COPY src/ ./src
COPY tsconfig.json ./

RUN npm install
RUN npx prisma generate
RUN npm run build

CMD ["dist/index.handler"]