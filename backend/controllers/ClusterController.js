import Cluster from '../model/Cluster.js';
import Branch from '../model/Branch.js';

export const createCluster = async (req, res) => {
    try {
        const { clusterName } = req.body;
        
        if (!clusterName) {
            return res.status(400).json({ message: "Cluster name is required" });
        }

        const existingCluster = await Cluster.findOne({ clusterName });
        if (existingCluster) {
            return res.status(400).json({ message: "Cluster already exists" });
        }

        const newCluster = new Cluster({
            clusterName,
            createdBy: req.admin ? req.admin.userId : null
        });

        await newCluster.save();
        res.status(201).json({ message: "Cluster created successfully", cluster: newCluster });
    } catch (error) {
        console.error("Error creating cluster:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const getClusters = async (req, res) => {
    try {
        const clusters = await Cluster.find({ isActive: true });
        res.status(200).json({ clusters });
    } catch (error) {
        console.error("Error fetching clusters:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
