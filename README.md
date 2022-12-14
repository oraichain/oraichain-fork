# Oraichain fork

## Steps:

1. run a local node with new genesis
2. let it run for a few blocks
3. export its genesis
4. collect slashing, distribution, staking & validators fields in the exported genesis and use jq to replace them in the wanted genesis
5. move priv_validator_key & node_key of the local node to the wanted location that we want to run. If using the the same local node, need to: oraid tendermint unsafe-reset-all first to clear all previous blocks, then replace the genesis file.
6. oraid start --x-crisis-skip-assert-invariants

Note: after upgrading, the logs show that the module stores are migrated

Example:

```
6:53PM INF adding a new module: authz
6:53PM INF migrating module bank from version 1 to version 2
6:53PM INF migrating module distribution from version 1 to version 2
6:53PM INF adding a new module: feegrant
6:53PM INF migrating module gov from version 1 to version 2
6:53PM INF migrating module ibc from version 1 to version 2
6:53PM INF migrating module slashing from version 1 to version 2
6:53PM INF migrating module staking from version 1 to version 2
6:53PM INF migrating module transfer from version 1 to version 2
6:53PM INF migrating module auth from version 1 to version 2
```

## Steps to run the scripts to start forking:

1. Setup a new node

```bash
./setup-genesis.sh
```

2. Export the genesis state of the node

```bash
./export-genesis.sh
```

3. Process genesis state to inject the custom wallet into the network

```bash
node index.js
```

4. Clear all network data and start over to apply the new genesis state

```
oraid tendermint unsafe-reset-all && oraid start --x-crisis-skip-assert-invariants
```

To clear the fork network and start over, type:

```bash
./clear.sh
```