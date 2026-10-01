const fs = require("fs");
const path = require("path");
const { AttachmentBuilder } = require("discord.js");
const buildTranscript = require("./transcriptGenerator");

const TICKET_LIFETIME_MS = 48 * 60 * 60 * 1000;
const RETRY_DELAY_MS = 60 * 1000;
const MAX_TIMEOUT_MS = 2_147_000_000;
const DEFAULT_TICKETS_FILE = path.join(__dirname, "database", "tickets.json");

function getTicketExpiry(ticket) {
    const storedExpiry = Number(ticket.expiresAt);
    if (Number.isFinite(storedExpiry) && storedExpiry > 0) return storedExpiry;

    const createdAt = Number(ticket.createdAt);
    const baseTime = Number.isFinite(createdAt) && createdAt > 0 ? createdAt : Date.now();
    return baseTime + TICKET_LIFETIME_MS;
}

function isTicketExpired(ticket, now = Date.now()) {
    return getTicketExpiry(ticket) <= now;
}

function createTicketExpiryScheduler(onExpiry, options = {}) {
    const timers = new Map();
    const now = options.now || Date.now;
    const setTimeoutFn = options.setTimeoutFn || setTimeout;
    const clearTimeoutFn = options.clearTimeoutFn || clearTimeout;
    const onError = options.onError || ((error) => console.error("Ticket expiry failed:", error));

    function cancel(channelId) {
        const timer = timers.get(channelId);
        if (!timer) return;
        clearTimeoutFn(timer);
        timers.delete(channelId);
    }

    function schedule(ticket, delayOverride) {
        cancel(ticket.channelId);

        const requestedDelay = delayOverride === undefined
            ? getTicketExpiry(ticket) - now()
            : delayOverride;
        const delay = Math.min(MAX_TIMEOUT_MS, Math.max(0, requestedDelay));
        let timer;
        timer = setTimeoutFn(() => {
            if (timers.get(ticket.channelId) !== timer) return;
            timers.delete(ticket.channelId);
            Promise.resolve(onExpiry(ticket)).catch(onError);
        }, delay);
        timer.unref?.();
        timers.set(ticket.channelId, timer);
        return timer;
    }

    return { schedule, cancel, timers };
}

function createTicketExpiryManager(client, options = {}) {
    const ticketsFile = options.ticketsFile || DEFAULT_TICKETS_FILE;
    const now = options.now || Date.now;
    const transcriptBuilder = options.buildTranscript || buildTranscript;
    const logger = options.logger || console;

    function readTickets() {
        if (!fs.existsSync(ticketsFile)) return [];
        const tickets = JSON.parse(fs.readFileSync(ticketsFile, "utf8"));
        return Array.isArray(tickets) ? tickets : [];
    }

    function writeTickets(tickets) {
        fs.writeFileSync(ticketsFile, JSON.stringify(tickets, null, 2));
    }

    function removeTicket(channelId) {
        const tickets = readTickets();
        const remaining = tickets.filter(ticket => ticket.channelId !== channelId);
        if (remaining.length !== tickets.length) writeTickets(remaining);
    }

    let scheduler;

    async function expireTicket(ticketSnapshot) {
        const ticket = readTickets().find(item =>
            item.channelId === ticketSnapshot.channelId && item.guildId === ticketSnapshot.guildId
        );
        if (!ticket) return;

        const expiresAt = getTicketExpiry(ticket);
        if (expiresAt > now()) {
            scheduler.schedule({ ...ticket, expiresAt });
            return;
        }

        const guild = client.guilds.cache.get(ticket.guildId);
        const channel = guild?.channels.cache.get(ticket.channelId);
        if (!guild || !channel) {
            removeTicket(ticket.channelId);
            return;
        }

        let transcript;
        try {
            const html = await transcriptBuilder(channel);
            transcript = new AttachmentBuilder(Buffer.from(html, "utf8"), {
                name: `transcript-${channel.name}.html`
            });
        } catch (error) {
            logger.error("Could not prepare the ticket transcript:", error);
        }

        try {
            await channel.delete("Ticket expired after 48 hours");
            removeTicket(ticket.channelId);
        } catch (error) {
            if (String(error.code) === "10003") {
                removeTicket(ticket.channelId);
                return;
            }

            logger.error(`Could not delete expired ticket ${ticket.channelId}:`, error);
            scheduler.schedule({ ...ticket, expiresAt }, RETRY_DELAY_MS);
            return;
        }

        if (transcript) {
            const user = await client.users.fetch(ticket.userId).catch(() => null);
            if (user) {
                await user.send({
                    content: "⏰ Your ticket has been automatically closed and deleted after 48 hours.",
                    files: [transcript]
                }).catch(() => {});
            }
        }
    }

    scheduler = createTicketExpiryScheduler(expireTicket, {
        now,
        setTimeoutFn: options.setTimeoutFn,
        clearTimeoutFn: options.clearTimeoutFn,
        onError: error => logger.error("Ticket expiry task failed:", error)
    });

    function start() {
        const tickets = readTickets();
        let changed = false;
        const normalizedTickets = tickets.map(ticket => {
            const expiresAt = getTicketExpiry(ticket);
            if (Number(ticket.expiresAt) === expiresAt) return ticket;
            changed = true;
            return { ...ticket, expiresAt };
        });

        if (changed) writeTickets(normalizedTickets);
        for (const ticket of normalizedTickets) scheduler.schedule(ticket);
    }

    return {
        start,
        schedule: ticket => scheduler.schedule(ticket),
        cancel: channelId => scheduler.cancel(channelId),
        timers: scheduler.timers
    };
}

module.exports = {
    TICKET_LIFETIME_MS,
    createTicketExpiryManager,
    createTicketExpiryScheduler,
    getTicketExpiry,
    isTicketExpired
};
