FROM perl:5.40.0-bookworm

RUN apt-get update && apt-get install -y libmariadb-dev libmariadb-dev-compat libssl-dev \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

RUN useradd --uid=1001 --create-home isucon
USER isucon

WORKDIR /home/isucon/webapp/perl

COPY cpanfile ./
RUN cpm install --show-build-log-on-failure

COPY --chown=isucon:isucon ./lib /home/isucon/webapp/perl/lib
COPY --chown=isucon:isucon ./cpanfile ./app.psgi /home/isucon/webapp/perl/
ENV PERL5LIB=/home/isucon/webapp/perl/local/lib/perl5
ENV PATH=/home/isucon/webapp/perl/local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

ENV LANG=en_US.UTF-8
ENV LANGUAGE=en_US:en
ENV LC_ALL=en_US.UTF-8

EXPOSE 8080
CMD ["./local/bin/plackup", "-s", "Starlet", "-p", "8080", "-Ilib", "app.psgi"]
