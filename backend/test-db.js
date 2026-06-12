import mongoose from 'mongoose';
const uri = "mongodb+srv://abhijithgkaimal0240_db_user:JrFuLL0YdZW0XCcK@cluster0.utxjdfx.mongodb.net/?appName=Cluster0";
mongoose.connect(uri).then(async () => {
  const admins = mongoose.connection.collection('admins');
  const allAdmins = await admins.find({}).toArray();
  console.log("Admins:", allAdmins);
  process.exit(0);
});
