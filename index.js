require("dotenv").config();
const { Client, GatewayIntentBits, Partials, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events, EmbedBuilder } = require("discord.js");

const TOKEN = process.env.TOKEN;
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

// Handle DM messages from applicants
client.on(Events.MessageCreate, async (message) => {
  if (message.guild) return;
  if (!applications.has(message.author.id)) return;

  const data = applications.get(message.author.id);
  data.answers.push(message.content);
  data.step++;

  if (data.step < questions.length) {
    const embed = new EmbedBuilder()
      .setColor("Blue")
      .setTitle(`Question ${data.step + 1}`)
      .setDescription(questions[data.step]);
    return message.author.send({ embeds: [embed] });
  }

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

  message.author.send("✅ Your application has been submitted! Please wait for staff to review.");
  applications.delete(message.author.id);
});

client.login(TOKEN);

