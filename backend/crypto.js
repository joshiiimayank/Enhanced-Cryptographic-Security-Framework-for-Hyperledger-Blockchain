const crypto = require("crypto");
const nacl = require("tweetnacl");

const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);

function encryptAES(data){

const cipher = crypto.createCipheriv(
"aes-256-cbc",
key,
iv
);

return Buffer.concat([
cipher.update(data),
cipher.final()
]);

}

function decryptAES(data){

const decipher = crypto.createDecipheriv(
"aes-256-cbc",
key,
iv
);

return Buffer.concat([
decipher.update(data),
decipher.final()
]);

}

function hashData(data){

return crypto
.createHash("sha256")
.update(data)
.digest();

}

function signEdDSA(hash){

const keypair = nacl.sign.keyPair();

return nacl.sign.detached(
hash,
keypair.secretKey
);

}

module.exports={
encryptAES,
decryptAES,
hashData,
signEdDSA
};