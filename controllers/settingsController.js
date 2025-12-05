import Settings from "../models/Settings.js";

export const getSettings = async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) settings = await Settings.create({});
        res.json({ settings });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updateSettings = async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) settings = await Settings.create({});

        settings.name = req.body.name;
        settings.description = req.body.description;
        settings.logo = req.body.logo;

        await settings.save();

        res.json({ message: "Updated successfully", settings });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
