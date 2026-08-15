# Multi-stage: install and build with the full toolchain, ship only the
# standalone server.
FROM node:22-alpine AS build
WORKDIR /app

# NEXT_PUBLIC_* values are inlined into the client bundle at BUILD time, not
# read from the environment at run time. They have to arrive as build args or
# the browser ends up calling whatever URL was baked in when the image was
# made.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_QR_BASE_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_QR_BASE_URL=$NEXT_PUBLIC_QR_BASE_URL

COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S sijill && adduser -S sijill -G sijill

# The standalone output carries its own minimal node_modules; static assets and
# public files are not included in it and must be copied alongside.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

USER sijill
EXPOSE 3000
CMD ["node", "server.js"]
