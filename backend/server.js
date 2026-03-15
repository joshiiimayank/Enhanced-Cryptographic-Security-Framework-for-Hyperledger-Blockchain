const express = require("express");
const multer = require("multer");
const cors = require("cors");

const { encryptAES, decryptAES, hashData, signEdDSA } = require("./crypto");
const { addTransaction, verifyHash } = require("./blockchainLedger");
const { uploadFile, listFiles, downloadFile } = require("./driveUpload");

const app = express();
const upload = multer();

app.use(cors());
app.use(express.json());

app.get("/", (req,res)=>{
res.send("Backend running");
});


app.post("/upload", upload.single("file"), async (req,res)=>{

try{

const fileBuffer = req.file.buffer;

console.log("Step 1: File received");

const encrypted = encryptAES(fileBuffer);
console.log("Step 2: AES encryption complete");

const hash = hashData(encrypted);
console.log("Step 3: Hash generated");

const signature = signEdDSA(hash);
console.log("Step 4: EdDSA signature created");

const tx = addTransaction(hash);
console.log("Step 5: Hyperledger transaction stored");

const fileId = await uploadFile(encrypted);
console.log("Step 6: Uploaded to Google Drive");

res.json({
message:"Upload successful",
fileId,
tx
});

}catch(err){

console.error(err);
res.status(500).json({error:"Upload failed"});

}

});


app.get("/files", async(req,res)=>{

try{

const files = await listFiles();
res.json(files);

}catch(err){

res.status(500).json({error:"File list error"});

}

});


app.get("/download/:id", async(req,res)=>{

try{

const stream = await downloadFile(req.params.id);
stream.pipe(res);

}catch(err){

res.status(500).json({error:"Download error"});

}

});


app.get("/decrypt/:id", async(req,res)=>{

try{

const stream = await downloadFile(req.params.id);

const chunks=[];

stream.on("data",chunk=>chunks.push(chunk));

stream.on("end",()=>{

const encryptedBuffer = Buffer.concat(chunks);

const decrypted = decryptAES(encryptedBuffer);

const hash = hashData(encryptedBuffer);

const verified = verifyHash(hash);

if(verified){
console.log("Blockchain verification successful");
}else{
console.log("Blockchain verification failed");
}

res.send(decrypted);

});

}catch(err){

res.status(500).json({error:"Decrypt error"});

}

});


app.listen(5001,()=>{
console.log("Server running on port 5001");
});