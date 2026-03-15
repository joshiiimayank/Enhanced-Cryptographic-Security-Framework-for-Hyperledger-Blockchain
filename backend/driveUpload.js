const fs = require("fs");
const { google } = require("googleapis");

const credentials = require("./credentials.json");

const { client_secret, client_id, redirect_uris } = credentials.installed;

const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);

const TOKEN_PATH = "token.json";

async function authorize(){

  if(!fs.existsSync(TOKEN_PATH)){
    throw new Error("Run OAuth once to create token.json");
  }

  const token = fs.readFileSync(TOKEN_PATH);
  oAuth2Client.setCredentials(JSON.parse(token));

  return oAuth2Client;

}


async function uploadFile(data){

  const auth = await authorize();

  const drive = google.drive({
    version:"v3",
    auth
  });

  const fileName = "upload-"+Date.now()+".bin";

  fs.writeFileSync(fileName,data);

  const res = await drive.files.create({

    requestBody:{
      name:fileName,
      parents:["1tPqQMbXma9GduJQxD7zLkMeDxT8RQU4B"]
    },

    media:{
      mimeType:"application/octet-stream",
      body:fs.createReadStream(fileName)
    }

  });

  return res.data.id;

}


async function listFiles(){

  const auth = await authorize();

  const drive = google.drive({
    version:"v3",
    auth
  });

  const res = await drive.files.list({

    q:"'1tPqQMbXma9GduJQxD7zLkMeDxT8RQU4B' in parents",
    fields:"files(id,name)"

  });

  return res.data.files;

}


async function downloadFile(fileId){

  const auth = await authorize();

  const drive = google.drive({
    version:"v3",
    auth
  });

  const res = await drive.files.get(
    {
      fileId,
      alt:"media"
    },
    {responseType:"stream"}
  );

  return res.data;

}

module.exports={
  uploadFile,
  listFiles,
  downloadFile
};