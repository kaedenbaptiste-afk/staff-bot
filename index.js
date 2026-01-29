require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionsBitField
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

const STAFF_ROLE_ID = "1235394165903462442"; // role that can toggle apps
let applicationsOpen = true;
const questions = [
  "What is your Discord username?",
  "How old are you?",
  "Why do you want to join staff?",
  "What experience do you have?",
  "How active can you be per day?",
  "Why should we pick you?"
];

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;

  // APPLY BUTTON
  if (interaction.customId === "apply") {
    if (!applicationsOpen) {
      return interaction.reply({
        content: "❌ Staff applications are currently **closed**.",
        ephemeral: true
      });
    }

    await interaction.reply({
      content: "📩 Check your DMs to begin your application!",
      ephemeral: true
    });

    const user = interaction.user;
    let answers = [];

    try {
      for (let i = 0; i < questions.length; i++) {
        const qEmbed = new EmbedBuilder()
          .setTitle(`Staff Application (${i + 1}/${questions.length})`)
          .setDescription(questions[i])
          .setColor("Blue");

        await user.send({ embeds: [qEmbed] });

        const filter = msg => msg.author.id === user.id;
        const collected = await user.dmChannel.awaitMessages({
          filter,
          max: 1,
          time: 600000,
          errors: ["time"]
        });

        answers.push(collected.first().content);
      }

      const resultEmbed = new EmbedBuilder()
        .setTitle("📋 New Staff Application")
        .setColor("Green")
        .setDescription(
          questions.map((q, i) => `**${q}**\n${answers[i]}`).join("\n\n")
        )
        .setFooter({ text: `Applicant: ${user.tag}` });

      const channel = await client.channels.fetch("PUT_CHANNEL_ID_HERE");
      channel.send({ embeds: [resultEmbed] });

      await user.send("✅ Your application has been submitted!");

    } catch (err) {
      await user.send("❌ Application timed out or failed.");
    }
  }

  // TOGGLE APPLICATIONS
  if (interaction.customId === "toggle_apps") {
    if (
      !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
      !interaction.member.roles.cache.has(STAFF_ROLE_ID)
    ) {
      return interaction.reply({
        content: "❌ You don’t have permission to do that.",
        ephemeral: true
      });
    }

    applicationsOpen = !applicationsOpen;

    interaction.reply({
      content: `📢 Applications are now **${applicationsOpen ? "OPEN" : "CLOSED"}**.`,
      ephemeral: false
    });
  }
});

client.on("ready", async () => {
  const channel = await client.channels.fetch("PUT_CHANNEL_ID_HERE");

  const embed = new EmbedBuilder()
    .setTitle("📋 Staff Applications")
    .setDescription(
      "Click the button below to apply for staff.\n\n⚠️ Applications may be closed at any time."
    )
    .setColor("Purple");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("apply")
      .setLabel("Apply")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("toggle_apps")
      .setLabel("Toggle Applications")
      .setStyle(ButtonStyle.Danger)
  );

  await channel.send({ embeds: [embed], components: [row] });
});

client.login(process.env.TOKEN);
