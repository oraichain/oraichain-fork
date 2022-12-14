const fs = require('fs');
const cp = require('child_process');

const exportGenesisJsonPath = './export-genesis.json';
const wantedGenesisStateJsonPath = './genesis.json';
const genesisJsonPath = '.oraid/config/genesis.json';
const genesisJsonUrl = 'https://orai.s3.us-east-2.amazonaws.com/export-genesis.json';

const readGenesis = () => {
    const result = JSON.parse(Buffer.from(fs.readFileSync(exportGenesisJsonPath)).toString('ascii'));
    const slashing = JSON.stringify(result.app_state.slashing);
    const staking = JSON.stringify(result.app_state.staking);
    const distribution = JSON.stringify(result.app_state.distribution);
    const validators = JSON.stringify(result.validators);

    const jq = `'.app_state.slashing = ${slashing} | .app_state.staking = ${staking} | .app_state.distribution = ${distribution} | .validators = ${validators} | .app_state.staking.params.unbonding_time = "10s" | .app_state.gov.voting_params.voting_period = "60s" | .app_state.gov.deposit_params.min_deposit[0].amount = "1" | .app_state.gov.tally_params.quorum = "0.000000000000000000" | .app_state.gov.tally_params.threshold = "0.000000000000000000" | .app_state.mint.params.inflation_min = "0.500000000000000000" | .chain_id = "Oraichain-fork"'`

    // if genesis.json does not exist, then we download it
    if (!fs.existsSync(wantedGenesisStateJsonPath)) {
        cp.execSync(`wget -O ${wantedGenesisStateJsonPath} ${genesisJsonUrl}`);
    }

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