#!/bin/bash

NEED_TO_RUN=${NEED_TO_RUN:-1}

if [[ ! -f "./genesis.json" ]]
then
    wget -O ./genesis.json https://orai.s3.us-east-2.amazonaws.com/export-genesis.json
fi

if [[ -f "./export-genesis.json" ]]
then
    echo 'Already has export-genesis.json exported. Nothing to do!'
    exit
fi

if [ $NEED_TO_RUN -eq 1 ]
then
    # run the binary in background
    oraid start --p2p.laddr tcp://0.0.0.0:46656 --grpc.address 0.0.0.0:8090 --rpc.laddr tcp://0.0.0.0:46657 &

    sleep 10 && pkill oraid
fi
# export genesis state to file
oraid export 2>&1 | tee export-genesis.json