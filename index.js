const { Client, GatewayIntentBits, Partials, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events, EmbedBuilder } = require("discord.js");

// ---------------- CONFIG ----------------
const TOKEN = "MTIxNjI0MDkxOTQzOTg3MjAzMA.G5tl0C.tlPSKuiFnAD9ngejgENXSv8OYxo3z4z9LWqaoQ";
const STAFF_CHANNEL_ID = "1465568835607462041";
const STAFF_ROLE_ID = "1235394165857325111";
const DIRECTIVE_ROLE_ID = "1235394165903462442";

let applicationsOpen = true;

const questions = [
  "Introduce yourself to the staff team. Include your Discord username, age, and how long you’ve been part of this server. Also, feel free to share anything about your hobbies or interests that might help us get to know you better.",
  "Explain why you want to be a staff member on this server. What motivates you to help the community and support other members? Make sure to give specific reasons instead of just saying 'I want to help.'",
  "Have you been a staff member or moderator on any other Discord servers or communities? If yes, explain your experience, including what kind of issues you handled. If not, explain why you think you could still succeed as a moderator.",
  "Tell us about your availability and activity on Discord. How many hours per week do you think you could dedicate to moderation tasks? Staff need to be reliable, so be honest about how active you can really be.",
  "Describe your approach to dealing with someone who breaks server rules. What steps would you take to handle the situation calmly and fairly? Include how you would balance being strict and being understanding.",
  "Explain why you think you would be a valuable addition to our staff team. What skills, qualities, or experiences do you bring that other applicants might not? Be detailed so we can see why we should pick you."
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

// ---------------- COMMANDS ----------------
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

  // /apply
  if (interaction.isChatInputCommand() && interaction.commandName === "apply") {
    if (!applicationsOpen) {
      return interaction.reply({ content: "❌ Staff applications are currently closed. Please check back later.", ephemeral: true });
    }

    await interaction.reply({ content: "📩 Check your DMs!", ephemeral: true });

    applications.set(interaction.user.id, { answers: [], step: 0 });

    const embed = new EmbedBuilder()
      .setTitle(`Question 1 of ${questions.length}`)
      .setDescription(questions[0])
      .setColor(0x00ff00)
      .setFooter({ text: "Reply with your answer to continue." });

    try {
      await interaction.user.send({ embeds: [embed] });
    } catch {
      return interaction.followUp({ content: "❌ I couldn't DM you. Check your privacy settings.", ephemeral: true });
    }
  }

  // /toggleapps
  if (interaction.isChatInputCommand() && interaction.commandName === "toggleapps") {
    if (!interaction.member.roles.cache.has(DIRECTIVE_ROLE_ID)) {
      return interaction.reply({ content: "❌ Only the Directive Team can toggle applications.", ephemeral: true });
    }

    applicationsOpen = !applicationsOpen;
    const status = applicationsOpen ? "open ✅" : "closed ❌";
    return interaction.reply({ content: `Staff applications are now ${status}.`, ephemeral: true });
  }

  // Staff buttons
  if (interaction.isButton()) {
    const [action, userId] = interaction.customId.split("_");
    const guild = interaction.guild;
    if (!guild) return;

    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return interaction.reply({ content: "User not found.", ephemeral: true });

    if (action === "accept") {
      const role = guild.roles.cache.get(STAFF_ROLE_ID);
      if (role) await member.roles.add(role).catch(console.error);
      member.send("✅ Congratulations! Your staff application has been **accepted**.");
      interaction.update({ content: `✅ Accepted ${member.user.tag}`, components: [] });
    } else if (action === "deny") {
      member.send("❌ Sorry, your staff application has been **denied**.");
      interaction.update({ content: `❌ Denied ${member.user.tag}`, components: [] });
    }
  }
});

// ---------------- DM FLOW ----------------
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
      .setFooter({ text: "Reply with your answer to continue." });

    try {
      await message.author.send({ embeds: [embed] });
    } catch {
      applications.delete(message.author.id);
    }
  } else {
    const staffChannel = await client.channels.fetch(STAFF_CHANNEL_ID);

    const text = data.answers
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
      content: `📋 New Application from ${message.author.tag}`,
      embeds: [{ description: text, color: 0x2f3136 }],
      components: [row]
    });

    const finalEmbed = new EmbedBuilder()
      .setTitle("✅ Application Submitted")
      .setDescription("Thank you for submitting your staff application! Please wait for staff to review.")
      .setColor(0x00ff00);

    await message.author.send({ embeds: [finalEmbed] });
    applications.delete(message.author.id);
  }
});

client.login(TOKEN);
