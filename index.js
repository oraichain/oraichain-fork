const fs = require('fs');
const cp = require('child_process');

const exportGenesisJsonPath = './export-genesis.json';
const wantedGenesisStateJsonPath = './genesis.json';
const genesisJsonPath = '.oraid/config/genesis.json';

const readGenesis = () => {
    if (!fs.existsSync(exportGenesisJsonPath)) {
        console.log("You need to export the genesis state of your newly created node first before running this script.");
        return;
    }
    const result = JSON.parse(Buffer.from(fs.readFileSync(exportGenesisJsonPath)).toString('ascii'));
    const slashing = JSON.stringify(result.app_state.slashing);
    result.app_state.staking.unbonding_delegations = [{
        delegator_address: result.app_state.staking.delegations[0].delegator_address,
        validator_address: result.app_state.staking.delegations[0].validator_address,

        // TODO: How to read the actual unbonded amount from the genesis state? Should we just accumulate all from the original genesis state?
        entries: [
            {
                balance: "2831584564713",
                completion_time: "2022-12-23T18:34:26.180326050Z",
                creation_height: "9305417",
                initial_balance: "2831584564712",
            }
        ]
    }]
    const staking = JSON.stringify(result.app_state.staking);
    const validators = JSON.stringify(result.validators);

    // TODO: How to calculate actual total amount of orai supply? Accumulate all from the original genesis state?
    const jq = `'.app_state.slashing = ${slashing} | .app_state.staking = ${staking} | .validators = ${validators} | .app_state.staking.params.unbonding_time = "10s" | .app_state.gov.voting_params.voting_period = "60s" | .app_state.gov.deposit_params.min_deposit[0].amount = "1" | .app_state.gov.tally_params.quorum = "0.000000000000000000" | .app_state.gov.tally_params.threshold = "0.000000000000000000" | .app_state.mint.params.inflation_min = "0.500000000000000000" | .app_state.bank.supply[31].amount = "17743477819647" | .chain_id = "Oraichain-fork"'` // the supply[31] is used to fix bank invariant problem of Oraichain. Somehow there's a difference between total supply & the total balances

    cp.exec(`jq ${jq} ${wantedGenesisStateJsonPath} > ${genesisJsonPath}`, (err, stdout, stderr) => {
        if (err) {
            console.log("error: ", err)
            return;
        }
        console.log("Finished processing the genesis state!");
    });
    // console.log(execResult)
}

readGenesis()