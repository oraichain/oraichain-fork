# Oraichain fork

## Steps:

1. run a local node with new genesis
2. let it run for a few blocks
3. export its genesis
4. collect slashing, staking & validators fields in the exported genesis and use jq to replace them in the wanted genesis
5. move priv_validator_key & node_key of the local node to the wanted location that we want to run. If using the the same local node, need to: oraid tendermint unsafe-reset-all first to clear all previous blocks, then replace the genesis file.
6. oraid start --x-crisis-skip-assert-invariants

## Steps to run the scripts to start forking:

1. Setup a new node

```bash
./setup-genesis.sh
```

2. Export the genesis state of the node

```bash
RPC_PORT= GRPC_PORT= P2P_PORT= REST_PORT= ./export-genesis.sh 
```

3. Process genesis state to inject the custom wallet into the network

```bash
node index.js
```

4. Clear all network data and start over to apply the new genesis state

```
oraid tendermint unsafe-reset-all && oraid start --x-crisis-skip-assert-invariants --p2p.laddr tcp://0.0.0.0:46656 --grpc.address 0.0.0.0:8090 --rpc.laddr tcp://0.0.0.0:46657
```

To clear the fork network and start over, type:

```bash
./clear.sh
```

Export genesis state command: ```oraid export 2>&1 | tee forked-genesis.json```