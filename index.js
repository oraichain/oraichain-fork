const fs = require('fs');
const cp = require('child_process');
const json = require('big-json');

const exportGenesisJsonPath = './export-genesis.json';
const wantedGenesisStateJsonPath = './genesis.json';
const genesisJsonPath = '.oraid/config/genesis.json';
const notBondedTokenPoolsModuleName = "orai1tygms3xhhs3yv487phx3dw4a95jn7t7ljgraws";
const devSharedHexBytes = "ACE2B31E144AC57F99807BA85D299A7B1A755E2F" // can convert online using: https://slowli.github.io/bech32-buffer/ or bech32 lib. Encoding: orai. Last mnemonic keyword: harbor
const adminMultiSigInBase64 = Buffer.from(`"${Buffer.from(devSharedHexBytes, 'hex').toString('base64')}"`).toString('base64');
const groupAddress = "orai18s0fxs2f3jhxxe7pkezh8dzd5pm44qt4ht5pv5";

const readGenesis = async () => {
    if (!fs.existsSync(exportGenesisJsonPath)) {
        console.log("You need to export the genesis state of your newly created node first before running this script.");
        return;
    }
    const [result, totalUnbondingDelegations, totalBalances, supplyLength] = await Promise.all([
        readFilePromise(exportGenesisJsonPath).then(data => JSON.parse(Buffer.from(data).toString('ascii'))), // read genesis.json file
        calculateTotalUnbondingDelegations(),
        readLargeBalances(), // collect large balances so we can apply it to the new supply value
        execPromise(`jq '.app_state.bank.supply | length' ${wantedGenesisStateJsonPath}`).then(data => Buffer.from(data).toString('ascii') - 1) // supply length
    ]);

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
    const jq = `'.app_state.slashing = ${slashing} | .app_state.staking = ${staking} | .validators = ${validators} | .app_state.staking.params.unbonding_time = "10s" | .app_state.gov.voting_params.voting_period = "60s" | .app_state.gov.deposit_params.min_deposit[0].amount = "1" | .app_state.gov.tally_params.quorum = "0.000000000000000000" | .app_state.gov.tally_params.threshold = "0.000000000000000000" | .app_state.mint.params.inflation_min = "0.500000000000000000" | .app_state.bank.supply[${supplyLength}].amount = "${totalBalances}" | .chain_id = "Oraichain-fork" | ${jqUpdateContractStateGroupMultisigData()}'` // the supply[supplyLength] is used to fix bank invariant problem of Oraichain. Somehow there's a difference between total supply & the total balances

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
    return execPromise(`jq '.app_state.bank.balances[] | select(.address | contains("${notBondedTokenPoolsModuleName}"))' ${wantedGenesisStateJsonPath}`).then(data => JSON.parse(Buffer.from(data).toString('ascii')).coins[0].amount);
}

const readLargeJsonFile = async () => {
    const readStream = fs.createReadStream(wantedGenesisStateJsonPath);
    const parseStream = json.createParseStream();

    return new Promise((resolve) => {
        parseStream.on('data', function (data) {
            resolve(data);
        });

        readStream.pipe(parseStream);
    })
}

const readLargeBalances = async () => {
    const data = await readLargeJsonFile();
    let totalBalances = 0;
    for (let balance of data.app_state.bank.balances) {
        const coin = balance.coins.find(coin => coin.denom === "orai");
        if (!coin) continue;
        totalBalances += parseInt(coin.amount);
    }
    console.log("Finished collecting the real total supply of the orai token with total balances: ", totalBalances);
    return totalBalances.toString();
}

const jqUpdateContractStateGroupMultisigData = () => {
    // 00076D656D62657273 is 'members' in hex
    return `.app_state.wasm.contracts[.app_state.wasm.contracts| map(.contract_address == "${groupAddress}") | index(true)].contract_state = [{"key":"00076D656D62657273${devSharedHexBytes}","value":"Mw=="},{"key":"746F74616C","value":"Mw=="},{"key":"61646D696E","value":"${adminMultiSigInBase64}"}]`;
}

function execPromise(command) {
    return new Promise((resolve, reject) => {
        cp.exec(command, (err, data) => {
            if (err) return reject(err)
            resolve(data)
        })
    })
}

function readFilePromise(filePath) {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, (err, data) => {
            if (err) return reject(err)
            resolve(data)
        })
    })
}

readGenesis()