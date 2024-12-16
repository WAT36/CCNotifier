FROM public.ecr.aws/lambda/nodejs:18
WORKDIR ${LAMBDA_TASK_ROOT}

COPY package*.json ./
COPY prisma/ ./
COPY src/ ./
COPY index.mjs/ ./

RUN npm install
RUN npx prisma generate

RUN ls
RUN pwd 

CMD ["index.handler"]