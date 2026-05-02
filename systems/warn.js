const {
  SlashCommandBuilder,
  PermissionsBitField,
  EmbedBuilder
} = require('discord.js');

const fs = require('fs');

// ================== DATABASE ==================
let data = {
  warnEmoji: "🍥",
  modRoles: [],
  logChannel: null,
  messages: [],
  warns: {},
  usedMessages: {}
};

if (fs.existsSync('./data.json')) {
  data = JSON.parse(fs.readFileSync('./data.json'));
}

function save() {
  fs.writeFileSync('./data.json', JSON.stringify(data, null, 2));
}

// ================== SLASH COMMANDS ==================
const warnCommands = [

  new SlashCommandBuilder()
    .setName('setwarnemoji')
    .setDescription('تحديد ايموجي التحذير')
    .addStringOption(o =>
      o.setName('emoji').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('setmodroles')
    .setDescription('تحديد 6 رتب')
    .addRoleOption(o => o.setName('role1').setRequired(true))
    .addRoleOption(o => o.setName('role2'))
    .addRoleOption(o => o.setName('role3'))
    .addRoleOption(o => o.setName('role4'))
    .addRoleOption(o => o.setName('role5'))
    .addRoleOption(o => o.setName('role6')),

  new SlashCommandBuilder()
    .setName('setlogchannel')
    .setDescription('تحديد روم اللوق')
    .addChannelOption(o =>
      o.setName('channel').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('setmessages')
    .setDescription('تحديد 5 رسائل')
    .addStringOption(o => o.setName('m1').setRequired(true))
    .addStringOption(o => o.setName('m2').setRequired(true))
    .addStringOption(o => o.setName('m3').setRequired(true))
    .addStringOption(o => o.setName('m4').setRequired(true))
    .addStringOption(o => o.setName('m5').setRequired(true)),

  new SlashCommandBuilder()
    .setName('clearwarns')
    .setDescription('حذف تحذيرات شخص')
    .addUserOption(o =>
      o.setName('user').setRequired(true)
    )
];

// ================== INTERACTION ==================
async function handleWarnInteraction(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: 'Admin فقط', ephemeral: true });
  }

  if (interaction.commandName === 'setwarnemoji') {
    data.warnEmoji = interaction.options.getString('emoji');
    save();
    return interaction.reply('تم');
  }

  if (interaction.commandName === 'setmodroles') {
    data.modRoles = [];
    for (let i = 1; i <= 6; i++) {
      const role = interaction.options.getRole(`role${i}`);
      if (role) data.modRoles.push(role.id);
    }
    save();
    return interaction.reply('تم حفظ الرتب');
  }

  if (interaction.commandName === 'setlogchannel') {
    data.logChannel = interaction.options.getChannel('channel').id;
    save();
    return interaction.reply('تم');
  }

  if (interaction.commandName === 'setmessages') {
    data.messages = [
      interaction.options.getString('m1'),
      interaction.options.getString('m2'),
      interaction.options.getString('m3'),
      interaction.options.getString('m4'),
      interaction.options.getString('m5')
    ];
    save();
    return interaction.reply('تم حفظ الرسائل');
  }

  if (interaction.commandName === 'clearwarns') {
    const user = interaction.options.getUser('user');
    data.warns[user.id] = 0;
    save();
    return interaction.reply(`تم تصفير تحذيرات ${user}`);
  }
}

// ================== REACTION ==================
async function handleWarnReaction(reaction, user) {
  if (user.bot) return;

  try {
    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch();

    if (reaction.emoji.name !== data.warnEmoji) return;

    const guild = reaction.message.guild;
    const member = await guild.members.fetch(user.id);

    const hasPermission =
      member.permissions.has(PermissionsBitField.Flags.Administrator) ||
      data.modRoles.some(r => member.roles.cache.has(r));

    if (!hasPermission) {
      await reaction.users.remove(user.id);
      return;
    }

    const msg = reaction.message;

    if (!data.usedMessages[msg.id]) data.usedMessages[msg.id] = [];
    if (data.usedMessages[msg.id].includes(user.id)) return;

    data.usedMessages[msg.id].push(user.id);

    const target = msg.author;
    const deletedContent = msg.content;

    await msg.delete();

    if (!data.warns[target.id]) data.warns[target.id] = 0;
    data.warns[target.id]++;

    const count = data.warns[target.id];
    const remaining = 3 - count;

    const randomMsg = data.messages[Math.floor(Math.random() * data.messages.length)];

    msg.channel.send(`<@${target.id}> ${randomMsg} (${count}/3) باقي ${remaining}`);

    // ===== LOG =====
    if (data.logChannel) {
      const ch = guild.channels.cache.get(data.logChannel);
      if (ch) {
        const embed = new EmbedBuilder()
          .setColor('Red')
          .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
          .setThumbnail(target.displayAvatarURL())
          .addFields(
            { name: 'المخالف', value: `<@${target.id}>`, inline: true },
            { name: 'المحذر', value: `<@${user.id}>`, inline: true },
            { name: 'التحذيرات', value: `${count}/3`, inline: true },
            { name: 'الرسالة', value: deletedContent || 'بدون نص' }
          )
          .setTimestamp();

        ch.send({ embeds: [embed] });
      }
    }

    if (count >= 3) {
      const targetMember = await guild.members.fetch(target.id);
      await targetMember.timeout(2 * 60 * 60 * 1000, '3 warns');

      msg.channel.send(`<@${target.id}> تم إعطاؤه تايم أوت ساعتين`);

      data.warns[target.id] = 0;
    }

    save();

  } catch (e) {
    console.log(e);
  }
}

module.exports = {
  warnCommands,
  handleWarnInteraction,
  handleWarnReaction
};
