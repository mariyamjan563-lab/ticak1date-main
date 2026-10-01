const { REST } = require('@discordjs/rest');
const { Routes } = require('discord.js');
const fs = require('fs');
const { token, clientID } = require('./config.json');

async function DeployCommands() {

    const commands = [];
    const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const command = require(`./commands/${file}`);
        commands.push(command.data.toJSON());
    }

    const rest = new REST({ version: '10' }).setToken(token);

    try {
        console.log("Deploying commands...");
        await rest.put(
            Routes.applicationCommands(clientID),
            { body: commands }
        );
        console.log("✅ Commands deployed!");
    } catch (err) {
        console.error(err);
    }
}

module.exports = { DeployCommands };

// Agar file direct run karo (node deploy-commands.js)
if (require.main === module) {
    DeployCommands();
}