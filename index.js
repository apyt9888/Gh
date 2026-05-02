const {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionsBitField
} = require("discord.js");

const mongoose = require("mongoose");

// ================== ENV ==================
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const MONGO_URI = process.env.MONGO_URI;

// ================== IMPORT SYSTEMS ==================
const { buildReply } = require("./ai/ghazal");
const filterSystem = require("./systems/filter");
const warnSystem = require("./systems/warn");

// ================== MONGO CONNECT ==================
mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// ================== CLIENT ==================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// ================== SLASH COMMANDS ==================
const commands = [
  new SlashCommandBuilder()
    .setName("setfilter")
    .setDescription("تحديد لوق الفلتر")
    .addChannelOption(o =>
      o.setName("log")
        .setDescription("روم اللوق")
        .setRequired(true)
    )
    .addRoleOption(o =>
      o.setName("role")
        .setDescription("الرتبة")
        .setRequired(true)
    )
];

// ================== REGISTER COMMANDS ==================
const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );

  console.log("Commands Ready");
})();

// ================== INTERACTIONS ==================
client.on("interactionCreate", async (i) => {
  if (!i.isChatInputCommand()) return;

  if (!i.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return i.reply({ content: "Admin فقط", ephemeral: true });
  }

  if (i.commandName === "setfilter") {
    filterSystem.setConfig(
      i.options.getChannel("log").id,
      i.options.getRole("role").id
    );

    return i.reply("تم ضبط الفلتر");
  }
});

// ================== MESSAGE SYSTEM ==================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const content = message.content;

  // ================== FILTER ==================
  const filtered = await filterSystem.handle(message);
  if (filtered) return;

  // ================== WARN SYSTEM ==================
  const warned = await warnSystem.handle(message, client);
  if (warned) return;

  // ================== GHAZAL AI ==================
  if (content.includes("غزل")) {
    const reply = await buildReply(message);
    return message.reply(reply);
  }
});

// ================== REACTION SYSTEM ==================
client.on("messageReactionAdd", async (reaction, user) => {
  if (user.bot) return;

  await warnSystem.handleReaction(reaction, user);
});

// ================== LOGIN ==================
client.login(TOKEN);
