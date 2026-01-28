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
const STAFF_CHANNEL_ID = "YOUR_STAFF_CHANNEL_ID";       // Where applications are sent
const STAFF_ROLE_ID = "YOUR_STAFF_ROLE_ID";           // Role to give on acceptance
const DIRECTIVE_ROLE_ID = "YOUR_DIRECTIVE_ROLE_ID";   // Role allowed to toggle apps
let applicationsOpen = true;

// ===== QUESTIONS =====
const questions = [
  "Tell us about yourself. Include your age, timezone, and how long you’ve been in the server.",
  "Why do you want to become a staff member?",
  "Do you have any past moderation experience? Explain.",
  "How active are you daily and what times are usually online?",
  "How would you handle a rule-breaker respectfully?",
  "Why should we choose you over other applicants?"
];

const applications = new Map();

// ===== READY =====
client.once(Events.ClientReady, () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// ===== INTERACTIONS =====
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

  // ---- /toggleapps ----
  if (interaction.isChatInputCommand() && interaction.commandName === "toggleapps") {
    if (!interaction.member.roles.cache.has(DIRECTIVE_ROLE_ID))
      return interaction.reply({ content: "❌ Only the directive team can toggle applications.", ephemeral: true });

    applicationsOpen = !applicationsOpen;
    return interaction.reply({ content: `✅ Applications are now **${applicationsOpen ? "OPEN" : "CLOSED"}**.`, ephemeral: true });
  }

  // ---- /postapply ----
  if (interaction.isChatInputCommand() && interaction.commandName === "postapply") {
    if (!interaction.member.roles.cache.has(DIRECTIVE_ROLE_ID))
      return interaction.reply({ content: "❌ Only the directive team can post the application embed.", ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle("📋 Staff Applications Open!")
      .setDescription("Click the button below to start your staff application in your DMs!")
      .setColor("Blue");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("start_app")
        .setLabel("Apply Now")
        .setStyle(ButtonStyle.Primary)
    );

    return interaction.reply({ embeds: [embed], components: [row], ephemeral: false });
  }

  // ---- BUTTON: Start Application ----
  if (interaction.isButton() && interaction.customId === "start_app") {
    if (!applicationsOpen)
      return interaction.reply({ content: "❌ Applications are currently closed.", ephemeral: true });

    applications.set(interaction.user.id, { step: 0, answers: [] });

    await interaction.reply({ content: "📩 Check your DMs to start your application!", ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle("Staff Application: Question 1")
      .setDescription(questions[0])
      .setColor("Blue");

    interaction.user.send({ embeds: [embed] }).catch(() => {
      interaction.followUp({ content: "❌ I can't DM you. Check your privacy settings.", ephemeral: true });
    });
  }

  // ---- BUTTON: Accept / Deny ----
  if (interaction.isButton()) {
    const [action, userId] = interaction.customId.split("_");
    const member = await interaction.guild.members.fetch(userId).catch(() => null);
    if (!member) return;

    if (action === "accept") {
      await member.roles.add(STAFF_ROLE_ID);
      await member.send("✅ Congratulations! Your staff application has been accepted!");
      return interaction.update({ content: `✅ Accepted ${member.user.tag}`, components: [] });
    }

    if (action === "deny") {
      await member.send("❌ Sorry, your staff application has been denied.");
      return interaction.update({ content: `❌ Denied ${member.user.tag}`, components: [] });
    }
  }
});

// ===== DM MESSAGE HANDLER =====
client.on(Events.MessageCreate, async message => {
  if (message.guild) return; // Only DM
  if (!applications.has(message.author.id)) return;

  const data = applications.get(message.author.id);
  data.answers.push(message.content);
  data.step++;

  // Next question or finish
  if (data.step < questions.length) {
    const embed = new EmbedBuilder()
      .setTitle(`Staff Application: Question ${data.step + 1}`)
      .setDescription(questions[data.step])
      .setColor("Blue");

    return message.author.send({ embeds: [embed] });
  }

  // Send to staff channel
  const staffChannel = await client.channels.fetch(STAFF_CHANNEL_ID);

  const appEmbed = new EmbedBuilder()
    .setTitle("📋 New Staff Application")
    .setDescription(
      data.answers.map((a, i) => `**Q${i + 1}:** ${questions[i]}\n**A:** ${a}`).join("\n\n")
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

  await staffChannel.send({ embeds: [appEmbed], components: [row] });

  await message.author.send("✅ Your application has been submitted! Please wait for staff review.");
  applications.delete(message.author.id);
});

// ===== LOGIN =====
client.login(process.env.TOKEN);
