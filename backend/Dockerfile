FROM node:18-alpine
WORKDIR /app

RUN apk update && apk add --no-cache ffmpeg

COPY package.json .
RUN npm install
COPY . .

# Copy SSL certificates
COPY ssl/backend-selfsigned.key /app/ssl/
COPY ssl/backend-selfsigned.crt /app/ssl/
EXPOSE 3042
CMD ["node", "index.js"]