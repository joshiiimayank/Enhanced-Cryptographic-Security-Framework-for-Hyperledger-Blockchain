const fs = require("fs");

const ledgerFile = "ledger.json";

if(!fs.existsSync(ledgerFile)){
fs.writeFileSync(ledgerFile,JSON.stringify([]));
}

function addTransaction(hash){

const ledger = JSON.parse(
fs.readFileSync(ledgerFile)
);

const tx = {
txID:"TX-"+Date.now(),
hash:hash.toString("hex"),
timestamp:new Date()
};

ledger.push(tx);

fs.writeFileSync(
ledgerFile,
JSON.stringify(ledger,null,2)
);

return tx;

}

function verifyHash(hash){

const ledger = JSON.parse(
fs.readFileSync(ledgerFile)
);

return ledger.find(
t=>t.hash===hash.toString("hex")
);

}

module.exports={
addTransaction,
verifyHash
};