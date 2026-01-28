const {
  Client,
  GatewayIntentBits,
  Partials,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  EmbedBuilder
} = require("discord.js");

// ===== CONFIG =====
const TOKEN = process.env.TOKEN;
const STAFF_CHANNEL_ID = "1465568835607462041";
const STAFF_ROLE_ID = "1235394165857325111";
const DIRECTIVE_ROLE_ID = "1235394165903462442";

let applicationsOpen = true;

const questions = [
  "Introduce yourself. Include your age, timezone, and how long you’ve been in the server.",
  "Why do you want to be a staff member on this server?",
  "Do you have any past moderation experience? Explain.",
  "How active are you daily or weekly?",
  "How would you handle a rule breaker calmly and fairly?",
  "Why should we choose you over other applicants?"
];

const applications = new Map();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

client.once(Events.ClientReady, () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// ================== SLASH COMMANDS ==================
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

  // /apply
  if (interaction.isChatInputCommand() && interaction.commandName === "apply") {
    if (!applicationsOpen) {
      return interaction.reply({
        content: "❌ Staff applications are currently closed.",
        ephemeral: true
      });
    }

    applications.set(interaction.user.id, {
      answers: [],
      step: 0
    });

    await interaction.reply({
      content: "📩 Check your DMs to begin the application.",
      ephemeral: true
    });

    const embed = new EmbedBuilder()
      .setTitle(`Question 1 of ${questions.length}`)
      .setDescription(questions[0])
      .setColor(0x00ff00)
      .setFooter({ text: "Reply to continue." });

    return interaction.user.send({ embeds: [embed] });
  }

  // /toggleapps
  if (interaction.isChatInputCommand() && interaction.commandName === "toggleapps") {
    if (!interaction.member.roles.cache.has(DIRECTIVE_ROLE_ID)) {
      return interaction.reply({
        content: "❌ Only Directive members can do this.",
        ephemeral: true
      });
    }

    applicationsOpen = !applicationsOpen;
    return interaction.reply({
      content: `✅ Applications are now **${applicationsOpen ? "OPEN" : "CLOSED"}**.`,
      ephemeral: true
    });
  }

  // Buttons
  if (interaction.isButton()) {
    const [action, userId] = interaction.customId.split("_");
    const member = await interaction.guild.members.fetch(userId).catch(() => null);

    if (!member) return;

    if (action === "accept") {
      const role = interaction.guild.roles.cache.get(STAFF_ROLE_ID);
      if (role) await member.roles.add(role);

      await member.send("✅ You have been **accepted** as staff!");
      return interaction.update({ content: `✅ Accepted ${member.user.tag}`, components: [] });
    }

    if (action === "deny") {
      await member.send("❌ Your staff application was denied.");
      return interaction.update({ content: `❌ Denied ${member.user.tag}`, components: [] });
    }
  }
});

// ================== DM FLOW ==================
client.on(Events.MessageCreate, async (message) => {
  if (message.guild) return;
  if (!applications.has(message.author.id)) return;

  const data = applications.get(message.author.id);
  data.answers.push(message.content);
  data.step++;

  if (data.step < questions.length) {
    const embed = new EmbedBuilder()
      .setTitle(`Question ${data.step + 1} of ${questions.length}`)
      .setDescription(questions[data.step])
      .setColor(0x00ff00)
      .setFooter({ text: "Reply to continue." });

    return message.author.send({ embeds: [embed] });
  }

  const staffChannel = await client.channels.fetch(STAFF_CHANNEL_ID);

  const applicationText = data.answers
    .map((a, i) => `**Q${i + 1}:** ${questions[i]}\n**A:** ${a}`)
    .join("\n\n");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`accept_${message.author.id}`)
      .setLabel("Accept")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`deny_${message.author.id}`)
      .setLabel("Deny")
      .setStyle(ButtonStyle.Danger)
  );

  await staffChannel.send({
    content: `📋 **New Application — ${message.author.tag}**`,
    embeds: [{ description: applicationText, color: 0x2f3136 }],
    components: [row]
  });

  await message.author.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("✅ Application Submitted")
        .setDescription("Your application has been sent to staff for review.")
        .setColor(0x00ff00)
    ]
  });

  applications.delete(message.author.id);
});

client.login(TOKEN);

