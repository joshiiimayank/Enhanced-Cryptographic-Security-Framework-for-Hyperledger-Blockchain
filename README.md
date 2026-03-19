README.md
# 🔐 Enhanced Cryptographic Security Framework for Hyperledger Blockchain

A secure cloud-based file storage system that integrates **AES encryption, SHA hashing, EdDSA signatures, Hyperledger blockchain verification, and Google Drive storage**.

---

## 🚀 Features

- 🔒 AES Encryption (Data Confidentiality)
- 🔑 SHA-256 Hashing (Integrity Check)
- ✍️ EdDSA Digital Signature (Authentication)
- ⛓ Blockchain Ledger (Tamper-proof verification)
- ☁ Google Drive Integration (Cloud Storage)
- 📊 Interactive UI Dashboard with animation
- 🔄 Upload → Encrypt → Store → Verify → Decrypt flow

---

## 🏗️ Project Architecture
Frontend (React)
↓
Backend (Node.js + Express)
↓
Encryption + Hash + Signature
↓
Hyperledger Ledger 
↓
Google Drive Storage


---

## 📂 Project Structure
secure-cloud-upload-app/
│
├── backend/
│ ├── server.js
│ ├── crypto.js
│ ├── blockchainLedger.js
│ ├── driveUpload.js
│ ├── credentials.json ❌ (ignored)
│ ├── token.json ❌ (ignored)
│
├── frontend/
│ ├── src/
│ ├── public/
│
├── README.md
├── .gitignore


---

## ⚙️ Setup Instructions

### 1️⃣ Clone Repository

```bash
git clone https://github.com/joshiiimayank/Enhanced-Cryptographic-Security-Framework-for-Hyperledger-Blockchain.git
cd Enhanced-Cryptographic-Security-Framework-for-Hyperledger-Blockchain
🔧 Backend Setup
cd backend
npm install
🔐 Add Google Drive Credentials
Go to Google Cloud Console

Enable Google Drive API

Create OAuth credentials

Download and place inside backend/:

credentials.json
Run backend once:

node server.js
👉 It will generate:

token.json
🌐 Frontend Setup
cd frontend
npm install
npm start
▶️ Run Application
Start Backend
cd backend
node server.js
Start Frontend
cd frontend
npm start
Open:

http://localhost:3000
🔄 Application Flow
Upload File

AES Encryption

Hash Generation

Digital Signature

Blockchain Transaction

Upload to Google Drive

Retrieve & Decrypt

Verify Integrity

📦 API Endpoints
Method	Endpoint	Description
POST	/upload	Upload & secure file
GET	/files	List stored files
GET	/download/:id	Download encrypted file
GET	/decrypt/:id	Decrypt & verify file
🔐 Security Notes
Sensitive files are ignored using .gitignore

Credentials are NOT pushed to GitHub

Encryption ensures confidentiality

Blockchain ensures integrity

⚠️ Important Configuration
Update Google Drive Folder ID
In driveUpload.js:

parents: ["YOUR_FOLDER_ID"]
🧪 Testing
Upload any file → check console logs

Verify:

Encryption ✔

Hash ✔

Blockchain ✔

Cloud upload ✔

🎨 UI Features
Glassmorphism design

Animated security pipeline

Real-time processing steps

Blockchain transaction display

🏆 Future Enhancements
Real Hyperledger Fabric integration

Multi-user authentication

File sharing system

Audit logging dashboard

👨‍💻 Author
Mayank Joshi

📜 License
This project is for academic and educational purposes.


---

# 🔥 EXTRA (what to edit before pushing)

Before uploading README:

### ✏️ Replace this:
YOUR_FOLDER_ID


With your actual Google Drive folder ID.

---


<img width="1710" height="974" alt="Screenshot 2026-03-19 at 8 33 24 PM" src="https://github.com/user-attachments/assets/6bc1a537-7a79-40a5-b25a-750f7b4524fc" />

---
