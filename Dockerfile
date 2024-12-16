FROM public.ecr.aws/lambda/nodejs:18
WORKDIR ${LAMBDA_TASK_ROOT}

COPY package*.json ./
COPY prisma/ ./
COPY src/ ./

RUN npm install
RUN npx prisma generate

CMD ["index.handler"]