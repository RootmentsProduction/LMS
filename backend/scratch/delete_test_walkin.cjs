const mongoose = require('mongoose');
const uri = "mongodb+srv://abhijithgkaimal0240_db_user:JrFuLL0YdZW0XCcK@cluster0.utxjdfx.mongodb.net/?appName=Cluster0";

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const db = mongoose.connection.db;
    const result = await db.collection('walkins').deleteMany({
      staff: "NIYAS",
      remarks: { $in: ["Test walkin 1 for Niyas", "Test walkin 2 for Niyas"] }
    });
    console.log(`Deleted ${result.deletedCount} test walkins.`);
    mongoose.connection.close();
  })
  .catch(err => console.error(err));
