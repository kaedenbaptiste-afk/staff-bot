require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

const QUESTIONS = [
  "What is your **Roblox username**?",
  "Why do you want to join the Atlanta Roleplay Staff Team?",
  "How long have you been a member of Atlanta Roleplay?",
  "What experience do you have with moderation or staffing?",
  "How would you handle a rule-breaking situation?",
  "Can you remain professional in stressful situations?",
  "What timezone are you in and how active can you be?"
];

const applications = new Map();

client.once('ready', async () => {
  console.log(`${client.user.tag} is online`);

  const channel = await client.channels.fetch(process.env.APPLICATION_CHANNEL_ID);

  const embed = new EmbedBuilder()
    .setTitle("📋 Atlanta Roleplay Staff Applications")
    .setDescription(
      "**Requirements:**\n" +
      "• Must be in the server for at least 1 day\n" +
      "• Must play on PC only\n" +
      "• Must use the ARP tag on Discord\n" +
      "• Must have a clean moderation record\n\n" +
      "*Asking for your application to be read will result in denial.*"
    )
    .setColor(0x2f3136);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("apply")
      .setLabel("Apply Now")
      .setStyle(ButtonStyle.Primary)
  );

  await channel.send({ embeds: [embed], components: [row] });
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  // APPLY BUTTON
  if (interaction.customId === "apply") {
    await interaction.reply({
      content: "📬 Check your DMs to begin the application.",
      ephemeral: true
    });

    applications.set(interaction.user.id, {
      step: 0,
      answers: []
    });

    const questionEmbed = new EmbedBuilder()
      .setTitle("📝 Staff Application")
      .setDescription(`**Question 1:**\n${QUESTIONS[0]}`)
      .setColor(0x5865f2);

    await interaction.user.send({ embeds: [questionEmbed] });

    const log = await client.channels.fetch(process.env.STAFF_REVIEW_CHANNEL_ID);
    log.send(`📝 **Application started** by ${interaction.user.tag}`);
  }

  // ACCEPT / DENY
  if (interaction.customId.startsWith("decision_")) {
    const [, userId, decision] = interaction.customId.split("_");
    const member = await interaction.guild.members.fetch(userId);

    if (decision === "accept") {
      await member.roles.add([
        process.env.ACCEPT_ROLE_1,
        process.env.ACCEPT_ROLE_2
      ]);
      await member.send(
        "✅ **Congratulations! You have been accepted onto the Atlanta Roleplay Staff Team.**"
      );
    } else {
      await member.send(
        "❌ **Your staff application was reviewed and denied. Thank you for applying.**"
      );
    }

    const disabledRow = new ActionRowBuilder().addComponents(
      interaction.message.components[0].components.map(btn =>
        ButtonBuilder.from(btn).setDisabled(true)
      )
    );

    await interaction.update({ components: [disabledRow] });
  }
});

client.on('messageCreate', async message => {
  if (message.guild) return;
  if (!applications.has(message.author.id)) return;

  const data = applications.get(message.author.id);
  data.answers.push(message.content);
  data.step++;

  if (data.step < QUESTIONS.length) {
    const embed = new EmbedBuilder()
      .setTitle("📝 Staff Application")
      .setDescription(`**Question ${data.step + 1}:**\n${QUESTIONS[data.step]}`)
      .setColor(0x5865f2);

    await message.author.send({ embeds: [embed] });
  } else {
    applications.delete(message.author.id);

    await message.author.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("📨 Application Submitted")
          .setDescription(
            "Your application has been submitted.\nStaff will review it shortly."
          )
          .setColor(0x57f287)
      ]
    });

    const logChannel = await client.channels.fetch(
      process.env.STAFF_REVIEW_CHANNEL_ID
    );

    const robloxUser = data.answers[0];

    const reviewEmbed = new EmbedBuilder()
      .setTitle("📋 New Staff Application")
      .setColor(0xe67e22)
      .setDescription(
        `**Applicant:** ${message.author.tag}\n` +
        `**Roblox Username:** ${robloxUser}`
      )
      .addFields(
        QUESTIONS.slice(1).map((q, i) => ({
          name: q,
          value: data.answers[i + 1]
        }))
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`decision_${message.author.id}_accept`)
        .setLabel("Accept")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`decision_${message.author.id}_deny`)
        .setLabel("Deny")
        .setStyle(ButtonStyle.Danger)
    );

    await logChannel.send({ embeds: [reviewEmbed], components: [row] });
  }
});

client.login(process.env.TOKEN);
