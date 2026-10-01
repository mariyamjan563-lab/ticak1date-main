const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
    ChannelType,
    ActionRowBuilder,
    StringSelectMenuBuilder
} = require('discord.js');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Setup support system')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('Channel where support system will be created')
                .setRequired(true)
        )

        .addRoleOption(option =>
            option
                .setName('role')
                .setDescription('Staff role for tickets')
                .setRequired(true)
        )

        .addChannelOption(option =>
            option
                .setName('support')
                .setDescription('Support Ticket Category')
                .setRequired(true)
        )

        .addChannelOption(option =>
            option
                .setName('buy')
                .setDescription('Buy Ticket Category')
                .setRequired(true)
        )

        .addChannelOption(option =>
            option
                .setName('close')
                .setDescription('Closed Ticket Category')
                .setRequired(true)
        ),

    async execute(interaction, client) {

        const channel = interaction.options.getChannel('channel');
        const role = interaction.options.getRole('role');
        const support = interaction.options.getChannel('support');
        const buy = interaction.options.getChannel('buy');
        const close = interaction.options.getChannel('close');

        if (channel.type !== ChannelType.GuildText) {
            return interaction.reply({
                content: "⚠️ Channel must be a text channel.",
                ephemeral: true
            });
        }

        if (support.type !== ChannelType.GuildCategory) {
            return interaction.reply({
                content: "⚠️ Support must be a category.",
                ephemeral: true
            });
        }

        if (buy.type !== ChannelType.GuildCategory) {
            return interaction.reply({
                content: "⚠️ Buy must be a category.",
                ephemeral: true
            });
        }

        if (close.type !== ChannelType.GuildCategory) {
            return interaction.reply({
                content: "⚠️ Close must be a category.",
                ephemeral: true
            });
        }

        const data = {
            channel: channel.id,
            role: role.id,
            support: support.id,
            buy: buy.id,
            close: close.id
        };

        fs.writeFileSync(
            `./database/${interaction.guildId}.json`,
            JSON.stringify(data, null, 4)
        );

       const embed = new EmbedBuilder()
    .setTitle('🎫 Purchase Support Center')
    .setDescription(`
Welcome to **Roman XP Cheat Store**

Please choose an option below.

🛒 Buy Product
Purchase any product.

🛠️ Support
Need help from staff.

⚠️ Do not spam tickets.
`)
    .setImage("https://files.catbox.moe/za65ls.gif")
    .setColor('#6104b9')
    .setFooter({
        text: client.user.username,
        iconURL: client.user.avatarURL({ dynamic: true })
    })
    .setTimestamp();

const row = new ActionRowBuilder()
    .addComponents(
        new StringSelectMenuBuilder()
            .setCustomId("ticket_menu")
            .setPlaceholder("🛒 Select an option")
            .addOptions(
                {
                    label: "🛒 Buy Product",
                    description: "Open a purchase ticket",
                    value: "buy"
                },
                {
                    label: "🛠️ Support",
                    description: "Open a support ticket",
                    value: "support"
                }
            )
    );

await channel.send({
    embeds: [embed],
    components: [row]
});

await interaction.reply({
    content: "✅ Support system configured successfully.",
    ephemeral: true
});

    }
};
