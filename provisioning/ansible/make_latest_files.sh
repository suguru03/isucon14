#!/usr/bin/env bash

set -eux
cd $(dirname $0)

cd ../../bench
task build-linux-amd64
mkdir -p ../provisioning/ansible/roles/bench/files
mv bin/bench_linux_amd64 ../provisioning/ansible/roles/bench/files
cd ../provisioning/ansible

cd ../../frontend
make
cp -r ./build/client/ ../webapp/public/
cd ../provisioning/ansible

# 未実装
#cd ../../envcheck
#make
#cd ../provisioning/ansible

cd ../../
tar -zcvf webapp.tar.gz webapp
mv webapp.tar.gz provisioning/ansible/roles/webapp/files

cd ./provisioning/ansible



