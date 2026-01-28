require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Events
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

// ===== CONFIG =====
const STAFF_CHANNEL_ID = "1465568835607462041";
const STAFF_ROLE_ID = "1235394165857325111";
const DIRECTIVE_ROLE_ID = "1235394165903462442";

let applicationsOpen = true;

const questions = [
  "Tell us about yourself. Include your age, timezone, and how long you’ve been in the server.",
  "Why do you want to become a staff member?",
  "Do you have any past moderation experience? Explain.",
  "How active are you daily and what times are you usually online?",
  "How would you handle a rule-breaker respectfully?",
  "Why should we choose you over other applicants?"
];

const applications = new Map();

// ===== READY =====
client.once(Events.ClientReady, () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// ===== SLASH COMMANDS =====
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

  // /apply
  if (interaction.commandName === "apply") {
    if (!applicationsOpen)
      return interaction.reply({ content: "❌ Applications are closed.", ephemeral: true });

    applications.set(interaction.user.id, { step: 0, answers: [] });

    await interaction.reply({ content: "📩 Check your DMs!", ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle("Staff Application")
      .setDescription(questions[0])
      .setColor("Blue");

    return interaction.user.send({ embeds: [embed] });
  }

  // /toggleapps
  if (interaction.commandName === "toggleapps") {
    if (!interaction.member.roles.cache.has(DIRECTIVE_ROLE_ID)) {
      return interaction.reply({ content: "❌ You don’t have permission.", ephemeral: true });
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
      await member.roles.add(STAFF_ROLE_ID);
      await member.send("✅ You have been **accepted**!");
      return interaction.update({ content: "✅ Accepted", components: [] });
    }

    if (action === "deny") {
      await member.send("❌ Your application was denied.");
      return interaction.update({ content: "❌ Denied", components: [] });
    }
  }
});

// ===== DM HANDLER =====
client.on(Events.MessageCreate, async message => {
  if (message.guild) return;
  if (!applications.has(message.author.id)) return;

  const data = applications.get(message.author.id);
  data.answers.push(message.content);
  data.step++;

  if (data.step < questions.length) {
    const embed = new EmbedBuilder()
      .setTitle(`Question ${data.step + 1}`)
      .setDescription(questions[data.step])
      .setColor("Blue");

    return message.author.send({ embeds: [embed] });
  }

  // Send to staff channel
  const channel = await client.channels.fetch(STAFF_CHANNEL_ID);

  const appEmbed = new EmbedBuilder()
    .setTitle("📋 New Staff Application")
    .setDescription(
      data.answers.map((a, i) => `**Q${i + 1}:** ${questions[i]}\n${a}`).join("\n\n")
    )
    .setColor("Green");

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

  await channel.send({ embeds: [appEmbed], components: [row] });

  await message.author.send("✅ Your application has been submitted!");
  applications.delete(message.author.id);
});

client.login(process.env.TOKEN);


