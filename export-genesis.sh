#!/bin/bash

NEED_TO_RUN=${NEED_TO_RUN:-1}
RPC_PORT=${RPC_PORT:-46657}
GRPC_PORT=${GRPC_PORT:-8090}
P2P_PORT=${P2P_PORT:-46656}
REST_PORT=${REST_PORT:-5317}

sed -i "0,/address/s/address *= *.*/address = \"tcp:\/\/0.0.0.0:$REST_PORT\"/g" .oraid/config/app.toml # reference: https://stackoverflow.com/a/9453461

if [[ -f "./export-genesis.json" ]]
then
    echo 'Already has export-genesis.json exported. Nothing to do!'
    exit
fi

if [ $NEED_TO_RUN -eq 1 ]
then
    # run the binary in background
    oraid start --p2p.laddr tcp://0.0.0.0:$P2P_PORT --grpc.address 0.0.0.0:$GRPC_PORT --rpc.laddr tcp://0.0.0.0:$RPC_PORT &

    sleep 10 && pkill oraid
fi
# export genesis state to file
oraid export 2>&1 | tee export-genesis.json