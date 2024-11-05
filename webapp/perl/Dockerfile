FROM perl:5.40.0-bookworm

WORKDIR /home/isucon/webapp/perl

COPY . .
RUN go build -o webapp .

CMD ["/home/isucon/webapp/go/webapp"]
