FROM python:3-alpine AS compiler
ENV PYTHONUNBUFFERED 1
COPY --from=cdn_ssl_update . /app/ssl_update
WORKDIR /app/ssl_update
RUN python3 -m venv venv
# Enable venv
ENV PATH="/app/myvenv/bin:$PATH"
RUN pip3 install --upgrade pip
RUN pip3 install wheel
RUN pip3 install -Ur requirements.txt

FROM neilpang/acme.sh:latest
RUN  apk --no-cache add docker-cli py3-pip
COPY --from=compiler /app/ssl_update /app/ssl_update
