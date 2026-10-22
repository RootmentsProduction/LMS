const mongoose = require('mongoose');
const uri = "mongodb+srv://abhijithgkaimal0240_db_user:JrFuLL0YdZW0XCcK@cluster0.utxjdfx.mongodb.net/?appName=Cluster0";

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const db = mongoose.connection.db;
    const employees = await db.collection('employees').find({
      $or: [
        { displayName: /niyas/i },
        { staffName: /niyas/i },
        { rawNames: /niyas/i }
      ]
    }).toArray();
    console.log("Employees:", JSON.stringify(employees, null, 2));

    const walkins = await db.collection('walkins').find({
      $or: [
        { staff: /niyas/i },
        { staffName: /niyas/i },
        { "createdBy.name": /niyas/i }
      ]
    }).limit(3).toArray();
    console.log("Walkins:", JSON.stringify(walkins, null, 2));

    mongoose.connection.close();
  })
  .catch(err => console.error(err));
