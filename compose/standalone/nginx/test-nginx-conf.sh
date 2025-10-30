#/usr/bin/env bash
docker compose run --rm --name=tmp-test-nginx --pull=never \
  --volume='/var/run/foxy-dock/lab/test:/var/run/nginx' \
  --entrypoint='/usr/bin/bash -c' nginx '/docker-entrypoint.d/05-just-init.sh && nginx -T'
if [ $? -eq 0 ]; then
  echo "Nginx configuration is valid"
else
  echo "Nginx configuration is invalid"
  exit 1
fi
