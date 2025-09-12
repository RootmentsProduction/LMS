import mongoose from 'mongoose';

const connectMongoDB = async () => {
    try {
        // Clear any existing connections
        if (mongoose.connection.readyState === 1) {
            console.log('🔄 Disconnecting from existing connection...');
            await mongoose.disconnect();
        }

        const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://abhirambca2021_db_user:Root@cluster0.5rf3i8g.mongodb.net/Rootments?retryWrites=true&w=majority&appName=Cluster0';
        
        console.log('🔗 Connecting to MongoDB...');
        console.log('📍 URI (first 50 chars):', mongoUri.substring(0, 50) + '...');
        
        await mongoose.connect(mongoUri, {
            maxPoolSize: 10, // Maintain up to 10 socket connections
            serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
            bufferCommands: false // Disable mongoose buffering
        });
        
        console.log('✅ Connected to MongoDB successfully');
        console.log('📊 Database name:', mongoose.connection.db.databaseName);
        console.log('🌐 Host:', mongoose.connection.host);
        console.log('🔌 Port:', mongoose.connection.port);
        
        // Log connection events
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err);
        });
        
        mongoose.connection.on('disconnected', () => {
            console.log('⚠️ MongoDB disconnected');
        });
        
        mongoose.connection.on('reconnected', () => {
            console.log('🔄 MongoDB reconnected');
        });
        
    } catch (error) {
        console.error('❌ Error connecting to MongoDB:', error);
        console.error('❌ Connection string used:', process.env.MONGODB_URI ? 'Environment variable' : 'Fallback string');
        process.exit(1);
    }
}

export default connectMongoDB;
