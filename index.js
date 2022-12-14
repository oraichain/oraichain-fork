const fs = require('fs');
const cp = require('child_process');
const json = require('big-json');

const exportGenesisJsonPath = './export-genesis.json';
const wantedGenesisStateJsonPath = './genesis.json';
const genesisJsonPath = '.oraid/config/genesis.json';
const notBondedTokenPoolsModuleName = "orai1tygms3xhhs3yv487phx3dw4a95jn7t7ljgraws";

const readGenesis = (totalBalances) => {
    if (!fs.existsSync(exportGenesisJsonPath)) {
        console.log("You need to export the genesis state of your newly created node first before running this script.");
        return;
    }
    const result = JSON.parse(Buffer.from(fs.readFileSync(exportGenesisJsonPath)).toString('ascii'));
    const totalUnbondingDelegations = calculateTotalUnbondingDelegations();
    const slashing = JSON.stringify(result.app_state.slashing);
    result.app_state.staking.unbonding_delegations = [{
        delegator_address: result.app_state.staking.delegations[0].delegator_address,
        validator_address: result.app_state.staking.delegations[0].validator_address,

        // TODO: How to read the actual unbonded amount from the genesis state? Should we just accumulate all from the original genesis state?
        entries: [
            {
                balance: totalUnbondingDelegations,
                completion_time: "2022-12-23T18:34:26.180326050Z",
                creation_height: "9305417",
                initial_balance: totalUnbondingDelegations,
            }
        ]
    }]
    const staking = JSON.stringify(result.app_state.staking);
    const validators = JSON.stringify(result.validators);

    // TODO: How to calculate actual total amount of orai supply? Accumulate all from the original genesis state?
    const jq = `'.app_state.slashing = ${slashing} | .app_state.staking = ${staking} | .validators = ${validators} | .app_state.staking.params.unbonding_time = "10s" | .app_state.gov.voting_params.voting_period = "60s" | .app_state.gov.deposit_params.min_deposit[0].amount = "1" | .app_state.gov.tally_params.quorum = "0.000000000000000000" | .app_state.gov.tally_params.threshold = "0.000000000000000000" | .app_state.mint.params.inflation_min = "0.500000000000000000" | .app_state.bank.supply[31].amount = ${totalBalances} | .chain_id = "Oraichain-fork"'` // the supply[31] is used to fix bank invariant problem of Oraichain. Somehow there's a difference between total supply & the total balances

    cp.exec(`jq ${jq} ${wantedGenesisStateJsonPath} > ${genesisJsonPath}`, (err, stdout, stderr) => {
        if (err) {
            console.log("error: ", err)
            return;
        }
        console.log("Finished processing the genesis state!");
    });
    // console.log(execResult)
}

/// The original network may have unbonding delegations going on. These tokens reside in a module account. We need to copy this and modify the unbonding delegations in staking if we want to control the voting power.
const calculateTotalUnbondingDelegations = () => {
    const result = JSON.parse(Buffer.from(cp.execSync(`jq '.app_state.bank.balances[] | select(.address | contains("${notBondedTokenPoolsModuleName}"))' ${wantedGenesisStateJsonPath}`)).toString('ascii'));
    return result.coins[0].amount;
}

/// We generate new bank balances so that we dont have to re-calculate the total supply from the balance list. We need this because there's an inconsistency in total ORAI balances and ORAI supply
// const fixTotalSupply = (totalBalances) => {
//     // get the key that you have access to (also the validator key)
//     const genAccAddress = JSON.parse(Buffer.from(cp.execSync(`oraid keys list --output json`)).toString('ascii'))[0].address;
//     const wantedGenesisSupply = JSON.parse(Buffer.from(cp.execSync(`jq '.app_state.bank.supply' ${wantedGenesisStateJsonPath}`)).toString('ascii'));
//     const balance = { address: genAccAddress, coins: wantedGenesisSupply };
//     return JSON.stringify([balance]);
// }

const readLargeBalances = () => {
    const readStream = fs.createReadStream(wantedGenesisStateJsonPath);
    const parseStream = json.createParseStream();

    parseStream.on('data', function (data) {
        // => receive reconstructed POJO
        let totalBalances = 0;
        for (let balance of data.app_state.bank.balances) {
            const coin = balance.coins.find(coin => coin.denom === "orai");
            if (!coin) continue;
            totalBalances += parseInt(coin.amount);
        }
        readGenesis(totalBalances.toString());
    });

    readStream.pipe(parseStream);
}

readLargeBalances()