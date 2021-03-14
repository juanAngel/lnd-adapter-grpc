FROM alpine

RUN apk --no-cache add git bash nodejs npm
RUN npm install -g typescript
RUN mkdir -p /app/lnd-adapter && mkdir -p /root/.lightning && mkdir -p /root/.lightning-adapter
WORKDIR /app/lnd-adapter
COPY ./ ./

RUN npm install && npm run build

VOLUME [ "/root/.lightning"]
VOLUME [ "/root/.lightning-adapter"]

EXPOSE 9737
CMD ["npm", "start"]
