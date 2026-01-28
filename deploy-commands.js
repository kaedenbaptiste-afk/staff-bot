// deploy-commands.js
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

// ---------------- PLACEHOLDERS ----------------
const TOKEN = "MTIxNjI0MDkxOTQzOTg3MjAzMA.G5tl0C.tlPSKuiFnAD9ngejgENXSv8OYxo3z4z9LWqaoQ";       // Bot token from Developer Portal → Bot
const CLIENT_ID = "1216240919439872030";   // Application (bot) ID
const GUILD_ID = "1235394165597274153";     // Your server ID
// ----------------------------------------------

const commands = [
  new SlashCommandBuilder()
    .setName("apply")
    .setDescription("Start your staff application"),

  new SlashCommandBuilder()
    .setName("toggleapps")
    .setDescription("Open or close staff applications (staff only)")
].map(command => command.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    console.log("⏳ Started refreshing application commands...");

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log("✅ Successfully reloaded application commands.");
  } catch (error) {
    console.error(error);
  }
})();
