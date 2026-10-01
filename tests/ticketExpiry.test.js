const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");

const {
    TICKET_LIFETIME_MS,
    createTicketExpiryManager,
    createTicketExpiryScheduler,
    getTicketExpiry,
    isTicketExpired
} = require("../ticketExpiry");

function createFakeClock(startTime) {
    let currentTime = startTime;
    const jobs = new Set();

    function setTimeoutFn(callback, delay) {
        const job = {
            callback,
            deadline: currentTime + delay,
            cancelled: false
        };
        jobs.add(job);
        return job;
    }

    function clearTimeoutFn(job) {
        job.cancelled = true;
        jobs.delete(job);
    }

    async function advanceBy(milliseconds) {
        currentTime += milliseconds;

        while (true) {
            const dueJobs = [...jobs]
                .filter(job => !job.cancelled && job.deadline <= currentTime)
                .sort((left, right) => left.deadline - right.deadline);
            if (dueJobs.length === 0) break;

            for (const job of dueJobs) {
                jobs.delete(job);
                job.cancelled = true;
                job.callback();
            }
        }

        await new Promise(resolve => setImmediate(resolve));
    }

    return {
        now: () => currentTime,
        setTimeoutFn,
        clearTimeoutFn,
        advanceBy
    };
}

test("ticket is not expired before 48 hours and expires at the exact deadline", () => {
    const createdAt = 1_000_000;
    const ticket = { createdAt };

    assert.equal(getTicketExpiry(ticket), createdAt + TICKET_LIFETIME_MS);
    assert.equal(isTicketExpired(ticket, createdAt + TICKET_LIFETIME_MS - 1), false);
    assert.equal(isTicketExpired(ticket, createdAt + TICKET_LIFETIME_MS), true);
});

test("expiry scheduler fires at the exact 48-hour deadline", async () => {
    const clock = createFakeClock(2_000_000);
    const expiredTickets = [];
    const scheduler = createTicketExpiryScheduler(
        ticket => expiredTickets.push(ticket.channelId),
        {
            now: clock.now,
            setTimeoutFn: clock.setTimeoutFn,
            clearTimeoutFn: clock.clearTimeoutFn
        }
    );
    scheduler.schedule({ channelId: "ticket-1", createdAt: clock.now() });

    await clock.advanceBy(TICKET_LIFETIME_MS - 1);
    assert.deepEqual(expiredTickets, []);

    await clock.advanceBy(1);
    assert.deepEqual(expiredTickets, ["ticket-1"]);
});

test("manager restores legacy tickets and deletes their channel at the deadline", async () => {
    const clock = createFakeClock(3_000_000);
    const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "ticket-expiry-test-"));
    const ticketsFile = path.join(tempDirectory, "tickets.json");
    const createdAt = clock.now();
    fs.writeFileSync(ticketsFile, JSON.stringify([{
        channelId: "ticket-2",
        guildId: "guild-1",
        userId: "user-1",
        createdAt
    }]));

    let deletedChannels = 0;
    let transcriptDms = 0;
    const channel = {
        id: "ticket-2",
        name: "ticket-customer",
        delete: async () => { deletedChannels += 1; }
    };
    const guild = {
        channels: { cache: new Map([[channel.id, channel]]) }
    };
    const client = {
        guilds: { cache: new Map([["guild-1", guild]]) },
        users: {
            fetch: async () => ({
                send: async () => { transcriptDms += 1; }
            })
        }
    };

    try {
        const manager = createTicketExpiryManager(client, {
            ticketsFile,
            now: clock.now,
            setTimeoutFn: clock.setTimeoutFn,
            clearTimeoutFn: clock.clearTimeoutFn,
            buildTranscript: async () => "<html>ticket transcript</html>",
            logger: { error() {} }
        });
        manager.start();

        const restoredTicket = JSON.parse(fs.readFileSync(ticketsFile, "utf8"))[0];
        assert.equal(restoredTicket.expiresAt, createdAt + TICKET_LIFETIME_MS);

        await clock.advanceBy(TICKET_LIFETIME_MS - 1);
        assert.equal(deletedChannels, 0);

        await clock.advanceBy(1);
        assert.equal(deletedChannels, 1);
        assert.equal(transcriptDms, 1);
        assert.deepEqual(JSON.parse(fs.readFileSync(ticketsFile, "utf8")), []);
    } finally {
        fs.rmSync(tempDirectory, { recursive: true, force: true });
    }
});
