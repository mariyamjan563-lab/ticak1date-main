const fs = require("fs");
const path = require("path");

/* ===========================================================
   PREMIUM HELPER FUNCTIONS
=========================================================== */

function escapeHtml(text = "") {
   return String(text)

        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
/* ===========================================================
   MARKDOWN SUPPORT
=========================================================== */

function markdown(text = "") {

    text = escapeHtml(text);

    // Bold
    text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // Italic
    text = text.replace(/\*(.*?)\*/g, "<em>$1</em>");

    // Underline
    text = text.replace(/__(.*?)__/g, "<u>$1</u>");

    // Strike
    text = text.replace(/~~(.*?)~~/g, "<del>$1</del>");

    // Inline Code
    text = text.replace(/`(.*?)`/g, "<code>$1</code>");

    // Code Block
    text = text.replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>");

    // URL
    text = text.replace(
        /(https?:\/\/[^\s]+)/g,
        '<a href="$1" target="_blank">$1</a>'
    );

    // New Line
    text = text.replace(/\n/g, "<br>");

    return text;
}

/* ===========================================================
   USER AVATAR
=========================================================== */

function avatar(user){

    return user.displayAvatarURL({

        extension:"png",

        size:256

    });

}

/* ===========================================================
   USER INITIAL
=========================================================== */

function firstLetter(name){

    if(!name) return "?";

    return name.charAt(0).toUpperCase();

}

/* ===========================================================
   PREMIUM USER BADGES
=========================================================== */

function getBadge(member, msg, guild){

    let badges = "";

    // BOT
    if(msg.author.bot){
        badges += `<span class="badge botBadge">BOT</span>`;
    }

    // OWNER
    if(member && guild.ownerId === member.id){
        badges += `<span class="badge ownerBadge">OWNER</span>`;
    }

    // STAFF
    if(member && member.permissions.has("Administrator")){
        badges += `<span class="badge staffBadge">STAFF</span>`;
    }

    // PINNED
    if(msg.pinned){
        badges += `<span class="badge pinBadge">PINNED</span>`;
    }

    // EDITED
    if(msg.editedTimestamp){
        badges += `<span class="badge editBadge">EDITED</span>`;
    }

    return badges;
}
/* ===========================================================
   USERNAME COLOR
=========================================================== */

function getUsernameColor(member){

    if(!member)
        return "#ffffff";

    if(member.roles.highest && member.roles.highest.color){

        return "#" + member.roles.highest.color
            .toString(16)
            .padStart(6,"0");

    }

    return "#ffffff";

}

/* ===========================================================
   FILE SIZE
=========================================================== */

function formatBytes(bytes){

    if(bytes === 0) return "0 Bytes";

    const k = 1024;

    const sizes = [

        "Bytes",

        "KB",

        "MB",

        "GB"

    ];

    const i = Math.floor(

        Math.log(bytes) / Math.log(k)

    );

    return (

        parseFloat(

            (bytes / Math.pow(k,i)).toFixed(2)

        )

        + " " +

        sizes[i]

    );

}

/* ===========================================================
   FILE TYPE
=========================================================== */

function fileType(name=""){

    const ext = name.split(".").pop().toLowerCase();

    if(["png","jpg","jpeg","gif","webp"].includes(ext))

        return "image";

    if(["mp4","mov","webm","mkv"].includes(ext))

        return "video";

    if(["mp3","wav","ogg"].includes(ext))

        return "audio";

    if(ext==="pdf")

        return "pdf";

    return "file";

}
/* ===========================================================
   PREMIUM ATTACHMENT RENDERER
=========================================================== */

function renderAttachment(file) {

    const type = fileType(file.name);
    const size = formatBytes(file.size || 0);

    /* ==========================
       IMAGE
    ========================== */

    if (type === "image") {

        return `

<div class="attachment">

    <div class="fileIcon">🖼️</div>

    <div class="fileInfo">

        <div class="fileName">${escapeHtml(file.name)}</div>

        <div class="fileSize">${size}</div>

        <span class="fileTag">IMAGE</span>

        <div class="imagePreview">

            <a href="${file.url}" target="_blank">

                <img src="${file.url}" alt="${escapeHtml(file.name)}">

            </a>

        </div>

    </div>

</div>

`;

    }

    /* ==========================
       VIDEO
    ========================== */

    if (type === "video") {

        return `

<div class="attachment">

    <div class="fileIcon">🎥</div>

    <div class="fileInfo">

        <div class="fileName">${escapeHtml(file.name)}</div>

        <div class="fileSize">${size}</div>

        <span class="fileTag">VIDEO</span>

        <div class="videoPreview">

            <video controls>

                <source src="${file.url}">

            </video>

        </div>

    </div>

</div>

`;

    }

    /* ==========================
       AUDIO
    ========================== */

    if (type === "audio") {

        return `

<div class="attachment">

    <div class="fileIcon">🎵</div>

    <div class="fileInfo">

        <div class="fileName">${escapeHtml(file.name)}</div>

        <div class="fileSize">${size}</div>

        <span class="fileTag">AUDIO</span>

        <div class="audioPreview">

            <audio controls>

                <source src="${file.url}">

            </audio>

        </div>

    </div>

</div>

`;

    }

    /* ==========================
       PDF
    ========================== */

    if (type === "pdf") {

        return `

<div class="attachment">

    <div class="fileIcon">📄</div>

    <div class="fileInfo">

        <div class="fileName">${escapeHtml(file.name)}</div>

        <div class="fileSize">${size}</div>

        <span class="fileTag">PDF</span>

    </div>

</div>

`;

    }

/* ==========================
   DEFAULT FILE
========================== */

return `

<div class="attachment">

    <div class="fileIcon">📦</div>

    <div class="fileInfo">

        <div class="attachmentName">
            ${escapeHtml(file.name)}
        </div>

        <div class="fileSize">
            ${size}
        </div>

        <span class="fileTag">
            FILE
        </span>

    </div>

</div>

`;

}
/* ===========================================================
   GENERATE TRANSCRIPT
=========================================================== */

async function generateTranscript(channel) {

    const messages = await channel.messages.fetch({
        limit: 100
    });

    let htmlMessages = "";

    messages.reverse();

    for (const msg of messages.values()) {

        // Member
        const member = channel.guild.members.cache.get(msg.author.id);

        // Username
const username = escapeHtml(msg.author.username);

// Username Color
let usernameColor = "#ffffff";

if (member && member.displayHexColor && member.displayHexColor !== "#000000") {
    usernameColor = member.displayHexColor;
}

        // Avatar
        const avatarUrl = avatar(msg.author);

        // Badge
       const badge = getBadge(
    member,
    msg,
    channel.guild
);

        // Time
        const messageTime = msg.createdAt.toLocaleString();

        // Message
        const messageContent = markdown(
            msg.content || "*No text message*"
        );
// Reply
let reply = "";

if (msg.reference?.messageId) {

    try {

        const replied = await channel.messages.fetch(
            msg.reference.messageId
        );

        reply = `
<div class="replyBox">

    <span class="replyUser">
        ↪ ${escapeHtml(replied.author.username)}
    </span>

    <div class="replyText">
        ${markdown(replied.content || "*Attachment*")}
    </div>

</div>
`;

    } catch {

        reply = "";

    }

}
/* ==========================
   REACTIONS
========================== */

let reactions = "";

if (msg.reactions.cache.size > 0) {

    reactions += `<div class="reactionBar">`;

    msg.reactions.cache.forEach(reaction => {

        reactions += `
<div class="reaction">

    <span>${reaction.emoji.toString()}</span>

    <span>${reaction.count}</span>

</div>
`;

    });

    reactions += `</div>`;

}
        // Attachments
        let attachments = "";

        if (msg.attachments.size > 0) {

            for (const file of msg.attachments.values()) {

                attachments += renderAttachment(file);

            }

        }
        htmlMessages += `

<div class="messageBox">

    <img
        class="avatar"
        src="${avatarUrl}"
        alt="${username}"
    >

    <div class="messageContent">

        <div class="messageHeader">

           <div class="username"
style="color:${usernameColor};">

    ${username}

    ${badge}

</div>
            <div class="time">

                ${messageTime}

            </div>

        </div>

        ${reply}

<div class="messageText">

    ${messageContent}

</div>

      ${attachments}

${reactions}

    </div>

</div>

`;

    }

    return htmlMessages;

}
/* ===========================================================
   BUILD TRANSCRIPT
=========================================================== */

async function buildTranscript(channel) {

    const htmlTemplate = fs.readFileSync(

        path.join(
            __dirname,
            "templates",
            "transcript.html"
        ),

        "utf8"

    );

    const messages = await generateTranscript(channel);

    const ticketId = channel.id;

    const owner = channel.topic
        ? channel.topic.split(" ")[0]
        : "Unknown";

    const openTime = new Date(
        channel.createdTimestamp
    ).toLocaleString();

    const closeTime = new Date().toLocaleString();

    return htmlTemplate

        /* =========================
           SERVER
        ========================= */

        .replace(
            /{{SERVER_NAME}}/g,
            channel.guild.name
        )

        .replace(
            /{{SERVER_ICON}}/g,
            channel.guild.iconURL({
                extension: "png",
                size: 256
            }) || ""
        )

        /* =========================
           TICKET
        ========================= */

        .replace(
            /{{TICKET_ID}}/g,
            ticketId
        )

        .replace(
            /{{CHANNEL}}/g,
            channel.name
        )

        .replace(
            /{{USER}}/g,
            owner
        )

        .replace(
            /{{OPEN_TIME}}/g,
            openTime
        )

        .replace(
            /{{CLOSE_TIME}}/g,
            closeTime
        )

        /* =========================
           CONVERSATION
        ========================= */

        .replace(
            /{{MESSAGES}}/g,
            messages
        )

        /* =========================
           REMOVE UNUSED TAGS
        ========================= */

        .replace(/{{USER_FIRST}}/g, "")
        .replace(/{{MESSAGE_TIME}}/g, "")
        .replace(/{{MESSAGE}}/g, "")
        .replace(/{{BOT_TIME}}/g, "")
        .replace(/{{BOT_MESSAGE}}/g, "")
        .replace(/{{ATTACH_TIME}}/g, "")
        .replace(/{{FILE_NAME}}/g, "")
        .replace(/{{FILE_SIZE}}/g, "");

}
module.exports = buildTranscript;
