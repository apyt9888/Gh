require("dotenv").config();

const { Client, GatewayIntentBits, Partials, REST, Routes } = require("discord.js");
const mongoose = require("mongoose");

// ================== SYSTEMS ==================
const { buildReply } = require("./ai/ghazal");

const {
  handleFilterMessage,
  filterCommands,
  handleFilterInteraction
} = require("./systems/filter");

const {
  warnCommands,
  handleWarnInteraction,
  handleWarnReaction
} = require("./systems/warn");

// ================== ENV ==================
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const MONGO_URI = process.env.MONGO_URI;

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

// ================== MONGO ==================
mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ Mongo Connected"))
  .catch(err => console.log(err));

// ================== REGISTER SLASH COMMANDS ==================
const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  const commands = [
    ...filterCommands,
    ...warnCommands
  ];

  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log("✅ Slash Commands Ready");
  } catch (e) {
    console.log(e);
  }
})();

// ================== MESSAGE CREATE ==================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const content = message.content.toLowerCase();

  // ================== GHAZAL AI ==================
  if (content.includes("غزل")) {
    try {
      const reply = await buildReply(message);
      return message.reply(reply);
    } catch (e) {
      console.log(e);
    }
  }

  // ================== FILTER SYSTEM ==================
  await handleFilterMessage(message);
});

// ================== INTERACTIONS ==================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  // فلتر
  if (interaction.commandName === "setfilter") {
    return handleFilterInteraction(interaction);
  }

  // تحذيرات
  return handleWarnInteraction(interaction);
});

// ================== REACTIONS ==================
client.on("messageReactionAdd", async (reaction, user) => {
  await handleWarnReaction(reaction, user);
});

// ================== LOGIN ==================
client.login(TOKEN);
