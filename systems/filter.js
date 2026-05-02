const { SlashCommandBuilder } = require("discord.js");

// ================== BAD WORDS ==================
const badWords = [
  "مص","كس","زب","امك","خواتك","قحبه","خالاتك",
  "شرموط","شرمطه","قواد","كواد",
  "كسمك","كسختك","يبن القحبه","القحبه",
  "نياجك","سكس","انيك","الكحبه","كحبه",
  "عير","بلاعه","نيجك","العريض",
  "مناويج","بيدوفيلي","قاصر","قاصره",
  "اعرض","كسي","كسك"
];

// ================== CONFIG ==================
let config = {
  logChannel: null,
  mentionRole: null
};

// ================== SLASH COMMAND ==================
const filterCommands = [
  new SlashCommandBuilder()
    .setName('setfilter')
    .setDescription('تحديد لوق الفلتر والرتبة')
    .addChannelOption(o =>
      o.setName('log')
       .setDescription('روم اللوق')
       .setRequired(true)
    )
    .addRoleOption(o =>
      o.setName('role')
       .setDescription('الرتبة اللي تنمنشن')
       .setRequired(true)
    )
];

// ================== HANDLE INTERACTION ==================
async function handleFilterInteraction(interaction) {
  if (interaction.commandName !== "setfilter") return;

  config.logChannel = interaction.options.getChannel("log").id;
  config.mentionRole = interaction.options.getRole("role").id;

  return interaction.reply("تم ضبط فلتر الكلمات");
}

// ================== NORMALIZE (ANTI BYPASS) ==================
function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, "")
    .replace(/(.)\1+/g, "$1");
}

// ================== MESSAGE HANDLER ==================
async function handleFilterMessage(message) {
  if (message.author.bot) return;

  const clean = normalize(message.content);

  const found = badWords.some(word =>
    clean.includes(normalize(word))
  );

  if (!found) return;

  try {
    await message.delete();

    const member = await message.member;

    await member.timeout(5 * 60 * 1000, "Bad word detected");

    const guild = message.guild;

    // ===== LOG EMBED =====
    if (config.logChannel) {
      const log = guild.channels.cache.get(config.logChannel);

      if (log) {
        log.send({
          content: `<@&${config.mentionRole}>`,
          embeds: [{
            title: "تم رصد كلمة مسيئة",
            description:
              `**العضو:** <@${message.author.id}>\n` +
              `**الرسالة:** ${message.content}\n` +
              `**العقوبة:** تايم 5 دقائق`,
            color: 0xff0000
          }]
        });
      }
    }

  } catch (e) {
    console.log(e);
  }
}

module.exports = {
  filterCommands,
  handleFilterInteraction,
  handleFilterMessage
};
