FROM postgres:16-alpine

COPY docker-entrypoint-azurefiles.sh /usr/local/bin/docker-entrypoint-azurefiles.sh
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint-azurefiles.sh \
  && chmod +x /usr/local/bin/docker-entrypoint-azurefiles.sh

ENTRYPOINT ["docker-entrypoint-azurefiles.sh"]
CMD ["postgres"]
