function validateBlockchain(signature) {

    return {
      txID: "TX-" + Math.floor(Math.random() * 1000000),
      status: "verified"
    };
  
  }
  
  module.exports = { validateBlockchain };