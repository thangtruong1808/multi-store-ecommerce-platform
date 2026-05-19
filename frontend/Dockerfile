FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Empty VITE_API_BASE_URL => browser uses same-origin /api via nginx proxy
ARG VITE_API_BASE_URL=
ARG VITE_PRODUCT_MEDIA_BASE_URL=
ARG VITE_SUPPORT_EMAIL=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_PRODUCT_MEDIA_BASE_URL=$VITE_PRODUCT_MEDIA_BASE_URL
ENV VITE_SUPPORT_EMAIL=$VITE_SUPPORT_EMAIL
RUN npm run build

FROM nginx:alpine AS final
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
