const { ActivityType } = require('discord.js');
const RPC = require('discord-rpc');
const { createTicketExpiryManager } = require("../ticketExpiry");
module.exports = {
    name: 'ready',
    once: true,

    async execute(client) {
        console.log(`[EVENT] Logged in as ${client.user.tag}`);

        // Discord RPC başlatma
        const rpc = new RPC.Client({ transport: 'ipc' });

        rpc.on('ready', () => {
            // Burada botunuzun Discord RPC içeriğini ayarlıyorsunuz
            rpc.setActivity({
                details: 'ROMAN XP CHEAT TICKET SYSTEM', // Discord'da görünen açıklama
                state: 'Helping users!',    // Discord'da görünen durum
                startTimestamp: new Date(),
                largeImageKey: 'bot_logo',      // Discord uygulamanızdaki büyük resim anahtarı
                smallImageKey: 'small_logo',    // Küçük resim
                instance: true
            });

            console.log('Discord RPC enabled!');
        });

        // Discord RPC girişini başlatın
        rpc.login({ clientId: 'YOUR_DISCORD_CLIENT_ID' }).catch(console.error);

        // Discord'da botun mevcut durumunu ayarlama
        client.user.setPresence({

            
            activities: [
                { 
                    name: 'ROMAN XP CHEAT',
                    type: ActivityType.Watching // Oyun durumu (Watching, Playing, etc.)
                }
            ],
            status: 'idle' // Botun durumu (idle, online, dnd, invisible)
        });
        


        client.ticketExpiry = createTicketExpiryManager(client);
        client.ticketExpiry.start();
    }
};
