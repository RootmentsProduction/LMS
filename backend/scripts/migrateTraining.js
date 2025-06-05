import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function migrateTraining() {
  try {
    await client.connect();
    const db = client.db("LMS");
    const trainingprogresses = db.collection("trainingprogresses");
    const trainings = db.collection("trainings");

    const assignedCompleted = await trainingprogresses.find({
      status: { $regex: /^completed$/i } // Case-insensitive match
    }).toArray();

    console.log(`🔍 Found ${assignedCompleted.length} completed trainings`);

    for (const record of assignedCompleted) {
      const training = await trainings.findOne({ _id: record.trainingId });
      if (!training) {
        console.warn(`⚠️ Skipping: Training ID not found for ${record.trainingId}`);
        continue;
      }

      if (training.Trainingtype !== "Assigned") {
        // Skip if not "Assigned" training type
        continue;
      }

      const alreadyExists = await trainingprogresses.findOne({
        userId: record.userId,
        trainingId: record.trainingId,
        // we only want to migrate if Mandatory version doesn't exist
      });

      // Check if corresponding training is also listed under Mandatory type
      const isMandatoryDefined = await trainings.findOne({
        trainingName: training.trainingName,
        Trainingtype: "Mandatory"
      });

      if (!alreadyExists && isMandatoryDefined) {
        const mandatoryCopy = {
          ...record,
          _id: new ObjectId(),
          trainingId: isMandatoryDefined._id, // use the "Mandatory" training ID
        };

        await trainingprogresses.insertOne(mandatoryCopy);
        console.log(`✅ Migrated '${training.trainingName}' for user ${record.userId}`);
      }

      // Delete the assigned record
      await trainingprogresses.deleteOne({ _id: record._id });
    }

    console.log("🎉 Migration complete.");
  } catch (err) {
    console.error("❌ Migration error:", err);
  } finally {
    await client.close();
  }
}

migrateTraining();
