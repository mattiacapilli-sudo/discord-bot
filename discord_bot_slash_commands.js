const http = require('http');

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const FEEDBACK_FILE = path.join(__dirname, 'feedback.json');

if (!fs.existsSync(FEEDBACK_FILE)) {
  fs.writeFileSync(FEEDBACK_FILE, '[]', 'utf8');
}

function loadFeedback() {
  try {
    return JSON.parse(fs.readFileSync(FEEDBACK_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveFeedback(data) {
  fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function stars(num) {
  return '⭐'.repeat(num);
}

const commands = [
  new SlashCommandBuilder()
    .setName('grafica')
    .setDescription('Pubblica una grafica con fino a 5 immagini')
    .addChannelOption(option =>
      option
        .setName('canale')
        .setDescription('Canale dove pubblicare')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('titolo').setDescription('Titolo del post').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('testo').setDescription('Descrizione / caption').setRequired(true)
    )
    .addAttachmentOption(option =>
      option.setName('immagine1').setDescription('Prima immagine').setRequired(true)
    )
    .addAttachmentOption(option =>
      option.setName('immagine2').setDescription('Seconda immagine').setRequired(false)
    )
    .addAttachmentOption(option =>
      option.setName('immagine3').setDescription('Terza immagine').setRequired(false)
    )
    .addAttachmentOption(option =>
      option.setName('immagine4').setDescription('Quarta immagine').setRequired(false)
    )
    .addAttachmentOption(option =>
      option.setName('immagine5').setDescription('Quinta immagine').setRequired(false)
    )
    .addRoleOption(option =>
      option.setName('ruolo_notifica').setDescription('Ruolo da menzionare in modo visibile').setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('partner')
    .setDescription('Pubblica un messaggio partnership')
    .addChannelOption(option =>
      option
        .setName('canale')
        .setDescription('Canale dove pubblicare')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('nome_server').setDescription('Nome del server partner').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('descrizione').setDescription('Descrizione del partner').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('invito').setDescription('Link invito Discord').setRequired(true)
    )
    .addAttachmentOption(option =>
      option.setName('logo').setDescription('Logo/banner partner').setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('annuncio')
    .setDescription('Pubblica un annuncio')
    .addChannelOption(option =>
      option
        .setName('canale')
        .setDescription('Canale dove pubblicare')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('titolo').setDescription('Titolo annuncio').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('testo').setDescription('Testo annuncio').setRequired(true)
    )
    .addRoleOption(option =>
      option.setName('ruolo_notifica').setDescription('Ruolo da menzionare').setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('feedback')
    .setDescription('Lascia un feedback con stelline e descrizione')
    .addIntegerOption(option =>
      option
        .setName('stelle')
        .setDescription('Da 1 a 5')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(5)
    )
    .addStringOption(option =>
      option.setName('descrizione').setDescription('Testo del feedback').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('feedbacklista')
    .setDescription('Mostra le statistiche dei feedback salvati'),

  new SlashCommandBuilder()
    .setName('notifica')
    .setDescription('Menziona un ruolo in modo visibile e pulito')
    .addChannelOption(option =>
      option
        .setName('canale')
        .setDescription('Canale dove pubblicare')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('messaggio').setDescription('Messaggio da inviare').setRequired(true)
    )
    .addRoleOption(option =>
      option.setName('ruolo').setDescription('Ruolo da menzionare').setRequired(true)
    ),
].map(cmd => cmd.toJSON());

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commands }
  );
}

client.once('clientReady', () => {
  console.log(`Bot online come ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  try {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        content: 'Non hai i permessi per usare questo comando.',
        ephemeral: true,
      });
    }

    if (interaction.commandName === 'grafica') {
      const canale = interaction.options.getChannel('canale');
      const titolo = interaction.options.getString('titolo');
      const testo = interaction.options.getString('testo');
      const ruolo = interaction.options.getRole('ruolo_notifica');
      const immagini = [1, 2, 3, 4, 5]
        .map(i => interaction.options.getAttachment(`immagine${i}`))
        .filter(Boolean);

      const embed = new EmbedBuilder()
        .setTitle(titolo)
        .setDescription(testo)
        .setColor(0x8a2be2)
        .setFooter({ text: `Pubblicato da ${interaction.user.username}` })
        .setTimestamp();

      if (immagini[0]) embed.setImage(immagini[0].url);

      const extraEmbeds = immagini.slice(1).map(img =>
        new EmbedBuilder().setImage(img.url).setColor(0x8a2be2)
      );

      const content = ruolo ? `${ruolo}` : undefined;

      await canale.send({
        content,
        embeds: [embed, ...extraEmbeds],
        allowedMentions: ruolo ? { roles: [ruolo.id] } : { parse: [] },
      });

      await interaction.reply({ content: 'Grafica pubblicata.', ephemeral: true });
      return;
    }

    if (interaction.commandName === 'partner') {
      const canale = interaction.options.getChannel('canale');
      const nomeServer = interaction.options.getString('nome_server');
      const descrizione = interaction.options.getString('descrizione');
      const invito = interaction.options.getString('invito');
      const logo = interaction.options.getAttachment('logo');

      const embed = new EmbedBuilder()
        .setTitle(`🤝 Partner • ${nomeServer}`)
        .setDescription(`${descrizione}

**Invito:** ${invito}`)
        .setColor(0x00b0f4)
        .setFooter({ text: `Partnership pubblicata da ${interaction.user.username}` })
        .setTimestamp();

      if (logo) embed.setThumbnail(logo.url);

      await canale.send({ embeds: [embed], allowedMentions: { parse: [] } });
      await interaction.reply({ content: 'Messaggio partner pubblicato.', ephemeral: true });
      return;
    }

    if (interaction.commandName === 'annuncio') {
      const canale = interaction.options.getChannel('canale');
      const titolo = interaction.options.getString('titolo');
      const testo = interaction.options.getString('testo');
      const ruolo = interaction.options.getRole('ruolo_notifica');

      const embed = new EmbedBuilder()
        .setTitle(`📢 ${titolo}`)
        .setDescription(testo)
        .setColor(0xffa500)
        .setFooter({ text: `Annuncio di ${interaction.user.username}` })
        .setTimestamp();

      const content = ruolo ? `${ruolo}` : undefined;

      await canale.send({
        content,
        embeds: [embed],
        allowedMentions: ruolo ? { roles: [ruolo.id] } : { parse: [] },
      });

      await interaction.reply({ content: 'Annuncio pubblicato.', ephemeral: true });
      return;
    }

    if (interaction.commandName === 'feedback') {
      const stelle = interaction.options.getInteger('stelle');
      const descrizione = interaction.options.getString('descrizione');
      const canale = interaction.guild.channels.cache.get(process.env.FEEDBACK_CHANNEL_ID);

      if (!canale) {
        return interaction.reply({
          content: 'Canale feedback non trovato. Controlla FEEDBACK_CHANNEL_ID nel file .env',
          ephemeral: true,
        });
      }

      const item = {
        userId: interaction.user.id,
        username: interaction.user.tag,
        stelle,
        descrizione,
        createdAt: new Date().toISOString(),
      };

      const all = loadFeedback();
      all.push(item);
      saveFeedback(all);

      const embed = new EmbedBuilder()
        .setTitle('⭐ Nuovo feedback')
        .addFields(
          { name: 'Utente', value: `${interaction.user}`, inline: true },
          { name: 'Valutazione', value: stars(stelle), inline: true },
          { name: 'Descrizione', value: descrizione, inline: false },
        )
        .setColor(0x2ecc71)
        .setTimestamp();

      await canale.send({ embeds: [embed], allowedMentions: { parse: [] } });
      await interaction.reply({ content: 'Feedback inviato e salvato.', ephemeral: true });
      return;
    }

    if (interaction.commandName === 'feedbacklista') {
  const all = loadFeedback();

  if (!all.length) {
    return interaction.reply({
      content: 'Nessun feedback salvato.',
      ephemeral: true,
    });
  }

  const avg = all.reduce((sum, x) => sum + x.stelle, 0) / all.length;

  const ultimi = all
    .slice(-5)
    .reverse()
    .map(x => `• ${x.username}: ${stars(x.stelle)} — ${x.descrizione}`)
    .join('\n');

  const embed = new EmbedBuilder()
    .setTitle('📊 Statistiche feedback')
    .addFields(
      { name: 'Totale feedback', value: `${all.length}`, inline: true },
      { name: 'Media', value: `${avg.toFixed(2)} / 5`, inline: true },
      { name: 'Ultimi 5', value: ultimi || 'Nessuno', inline: false },
    )
    .setColor(0x3498db)
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
  return;
}

    if (interaction.commandName === 'notifica') {
      const canale = interaction.options.getChannel('canale');
      const messaggio = interaction.options.getString('messaggio');
      const ruolo = interaction.options.getRole('ruolo');

      await canale.send({
        content: `${ruolo} ${messaggio}`,
        allowedMentions: { roles: [ruolo.id] },
      });

      await interaction.reply({
        content: 'Notifica inviata. Le menzioni invisibili a @everyone non sono supportate.',
        ephemeral: true,
      });
      return;
    }
  } catch (error) {
    console.error(error);
    const payload = { content: 'Errore durante l’esecuzione del comando.', ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
});

const PORT = process.env.PORT || 10000;

console.log('PRIMA DI APRIRE LA PORTA', PORT);

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot online');
}).listen(PORT, '0.0.0.0', () => {
  console.log(`SERVER HTTP ATTIVO SULLA PORTA ${PORT}`);
});

(async () => {
  try {
    await registerCommands();
    await client.login(process.env.BOT_TOKEN);
  } catch (error) {
    console.error('Errore avvio bot:', error);
  }
})();