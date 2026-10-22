const mongoose = require('mongoose');
const uri = "mongodb+srv://abhijithgkaimal0240_db_user:JrFuLL0YdZW0XCcK@cluster0.utxjdfx.mongodb.net/?appName=Cluster0";

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const db = mongoose.connection.db;
    const now = new Date();
    
    const walkin1 = {
        "customerName": "Test Customer 1",
        "contact": "9999999991",
        "category": "TEST",
        "subCategory": "TEST SUB",
        "remarks": "Test walkin 1 for Niyas",
        "repeatCount": 1,
        "staff": "NIYAS",
        "status": "New Walkin",
        "store": "G.Perinthalmanna",
        "storeId": "6a158244cb0a54bf2ec3b7b8", 
        "createdAt": now,
        "updatedAt": now,
        "date": now.toISOString().split('T')[0] + " 10:00:00"
    };

    const walkin2 = {
        "customerName": "Test Customer 2",
        "contact": "9999999992",
        "category": "TEST",
        "subCategory": "TEST SUB",
        "remarks": "Test walkin 2 for Niyas",
        "repeatCount": 1,
        "staff": "NIYAS",
        "status": "Loss",
        "store": "G.Perinthalmanna",
        "storeId": "6a158244cb0a54bf2ec3b7b8",
        "createdAt": now,
        "updatedAt": now,
        "date": now.toISOString().split('T')[0] + " 11:00:00"
    };

    await db.collection('walkins').insertMany([walkin1, walkin2]);
    console.log("Successfully inserted 2 test walkins for NIYAS today.");
    
    mongoose.connection.close();
  })
  .catch(err => console.error(err));
