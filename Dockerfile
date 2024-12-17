FROM public.ecr.aws/lambda/nodejs:18
WORKDIR ${LAMBDA_TASK_ROOT}

COPY package*.json ./
COPY prisma/ ./prisma
COPY src/ ./src
COPY tsconfig.json ./
COPY index.mjs ./

RUN npm install
RUN npx prisma generate
RUN npm run build

RUN ls
RUN pwd 

CMD ["dist/index.handler"]