const { REST, Routes, SlashCommandBuilder } = require("discord.js");
require("dotenv").config();

const commands = [
  new SlashCommandBuilder()
    .setName("apply")
    .setDescription("Apply for staff"),

  new SlashCommandBuilder()
    .setName("toggleapps")
    .setDescription("Open or close staff applications")
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("⏳ Registering commands...");

    await rest.put(
      Routes.applicationCommands("YOUR_BOT_CLIENT_ID"),
      { body: commands }
    );

    console.log("✅ Commands registered successfully.");
  } catch (err) {
    console.error(err);
  }
})();
