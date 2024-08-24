FROM golang:1.23

WORKDIR /home/isucon/webapp/go

COPY . .
RUN go build -o webapp .

CMD ["/home/isucon/webapp/go/webapp"]
