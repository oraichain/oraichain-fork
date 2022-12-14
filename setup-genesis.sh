#!/bin/bash

CHAIN_ID=${CHAIN_ID:-Oraichain-fork}
USER=${USER:-foobar}
MONIKER=${MONIKER:-node001}
AMOUNT=${AMOUNT:-"1000000orai"}

if [[ -d ".oraid/data" ]] 
then
    echo 'Already has data/ directory. Nothing to do!'
else

    rm -rf "$PWD"/.oraid

    oraid init --chain-id $CHAIN_ID "$MONIKER"

    sed -i "s/keyring-backend *= *.*/keyring-backend = \"test\"/g" .oraid/config/client.toml
    sed -i "s/chain-id *= *.*/chain-id = \"$CHAIN_ID\"/g" .oraid/config/client.toml
    sed -i "s/broadcast-mode *= *.*/broadcast-mode = \"block\"/g" .oraid/config/client.toml
    sed -i "s/node *= *.*/node = \"tcp:\/\/0.0.0.0:36657\"/g" .oraid/config/client.toml

    oraid keys add $USER 2>&1 | tee account.txt

    # hardcode the validator account for this instance
    oraid add-genesis-account $USER "100000000000000orai" --keyring-backend test

    oraid add-genesis-account 'orai18hr8jggl3xnrutfujy2jwpeu0l76azprlvgrwt' "100000000000000orai" --keyring-backend test

    sed -i "s/enabled-unsafe-cors *= *.*/enabled-unsafe-cors = true/g" .oraid/config/app.toml
    sed -i "s/cors_allowed_origins *= *.*/cors_allowed_origins = \[\"*\"\]/g" .oraid/config/config.toml
    sed -i "1,/\<laddr\>/{s/\<laddr\> *= *.*/laddr = \"tcp:\/\/0.0.0.0:36657\"/g}" .oraid/config/config.toml # replace exactly the string laddr with\< and \>

    # submit a genesis validator tx
    ## Workraround for https://github.com/cosmos/cosmos-sdk/issues/8251
    oraid gentx $USER $AMOUNT --chain-id=$CHAIN_ID -y

    oraid collect-gentxs

    oraid validate-genesis

    # cat $PWD/.oraid/config/genesis.json | jq .app_state.genutil.gen_txs[0] -c > "$MONIKER"_validators.txt

    echo "The genesis initiation process has finished ..."
fi