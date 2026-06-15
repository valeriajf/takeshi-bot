/**
 * stickerHandler.js
 * Sistema de figurinhas de comando — DeadBoT (Takeshi 8.4.0 / ESM)
 *
 * @path src/middlewares/stickerHandler.js
 * @author Val (DeadBoT)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { BOT_LID, BOT_NAME, OWNER_LID } from "../config.js";
import { addWarn, getWarnLimit } from "../utils/warnSystem.js";
import {
  muteMember,
  unmuteMember,
  checkIfMemberIsMuted,
  activateGroup,
  deactivateGroup,
} from "../utils/database.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── PATHS ────────────────────────────────────────────────────────────────────

const blacklistFile = path.join(__dirname, "../../database/blacklist.json");
const advDbPath     = path.join(__dirname, "../../database/fig-adv.json");
const banDbPath     = path.join(__dirname, "../../database/fig-ban.json");

// ─── IDs HARDCODED ────────────────────────────────────────────────────────────

const STICKER_TRIGGER_IDS = [
  "237,240,88,140,212,171,71,87,143,170,31,4,161,59,231,26,145,206,63,43,179,14,239,118,100,145,78,161,21,50,181,188",
  "227,2,178,16,230,157,98,114,129,2,96,110,160,98,30,56,152,65,8,32,147,236,62,49,147,235,170,116,161,151,222,127",
  "74,136,209,171,160,196,81,112,218,236,146,215,180,206,153,154,238,90,73,46,43,22,97,156,64,34,55,66,155,253,26,70",
  "111,114,242,97,190,202,138,117,213,118,3,3,160,121,2,8,92,174,94,210,95,54,226,143,137,89,80,83,26,175,14,170",
  "94,56,48,29,255,50,84,160,147,9,172,89,31,121,64,210,141,132,169,93,154,142,72,98,123,66,236,72,93,230,82,5",
  "180,180,242,20,183,14,175,1,53,168,75,232,67,123,92,178,164,54,236,34,14,165,171,247,20,179,31,122,58,170,25,70",
  "221,105,182,59,3,144,85,146,50,40,147,208,134,131,31,37,30,44,24,227,2,141,125,165,6,20,204,36,56,215,19,241",
];

const STICKER_DELETE_IDS = [
  "116,213,61,242,230,38,197,223,181,198,112,103,52,199,114,255,136,240,128,68,156,176,53,156,58,169,52,220,3,16,244,130",
];

const STICKER_MUTE_IDS = [
  "197,16,197,210,171,39,84,66,25,238,253,42,123,45,107,202,143,85,218,213,72,98,119,132,2,139,53,124,81,153,65,225",
];

const STICKER_UNMUTE_IDS = [
  "192,200,27,99,228,0,224,77,234,138,111,147,50,168,141,210,157,108,36,139,147,192,196,24,17,34,22,239,200,243,222,70",
];

const STICKER_BLACKLIST_IDS = [
  "202,161,227,121,90,112,118,71,65,255,221,224,86,159,175,233,43,3,12,254,6,115,24,79,246,236,101,120,129,162,83,238",
];

const STICKER_PROMOTE_IDS = [
  "214,102,92,226,93,178,166,88,148,196,81,59,156,74,21,139,130,182,161,227,238,124,65,186,213,196,129,125,184,47,165,54",
  "171,103,104,183,109,1,141,190,14,207,143,27,184,65,8,25,225,114,40,45,4,114,173,218,189,26,60,159,235,12,104,83",
];

const STICKER_DEMOTE_IDS = [
  "180,64,241,130,90,132,158,242,136,19,105,92,191,105,159,174,219,56,75,52,134,97,71,102,116,7,204,48,34,117,190,46",
  "159,82,7,144,107,246,248,42,175,118,45,169,92,78,104,151,104,43,126,148,74,72,48,84,166,215,18,242,99,163,149,144",
];

const STICKER_ADMIN_ONLY_IDS = [
  "23,137,241,95,114,252,174,111,25,18,169,230,67,164,217,102,189,205,255,20,20,117,51,56,206,200,98,151,211,71,212,147",
  "186,37,108,2,149,216,249,69,122,5,199,119,118,67,124,230,81,29,181,185,84,152,209,61,81,44,218,148,80,83,13,222",
];

const STICKER_TAG_ADM_IDS = [
  "112,107,65,166,188,40,75,146,149,18,253,243,9,25,138,29,5,66,159,22,151,139,98,143,40,228,194,171,72,81,237,176",
  "182,10,14,66,170,139,57,225,109,166,106,176,223,131,179,138,134,173,130,82,85,175,119,41,150,125,210,135,226,14,118,212",
  "214,153,62,119,41,205,21,107,209,181,154,50,73,82,205,55,27,186,15,166,152,195,252,145,224,105,153,39,217,36,88,24",
  "115,133,61,19,40,119,139,146,26,249,121,173,234,107,122,195,5,24,117,49,18,132,230,189,191,60,49,105,176,21,200,16",
  "173,16,123,218,32,130,214,68,166,153,108,58,225,93,226,35,214,160,13,231,64,89,1,158,185,136,224,59,120,233,0,50",
  "171,189,187,2,5,115,59,25,90,249,4,108,215,150,78,124,4,149,37,127,189,61,239,174,164,104,186,143,199,188,247,163",
];

const STICKER_BIRTHDAY_IDS = [
  "139,215,18,180,251,46,208,76,103,43,59,13,96,20,150,233,156,171,39,165,17,196,251,34,213,73,237,64,52,16,128,182",
  "66,228,32,154,83,211,7,23,143,60,78,70,80,112,219,28,170,7,208,161,252,205,92,58,148,27,202,245,224,76,86,97",
  "237,196,168,72,218,80,192,75,250,40,231,150,244,120,252,246,132,83,193,66,143,135,40,235,11,74,201,143,41,79,1,252",
  "60,148,244,101,224,55,217,57,247,251,126,186,245,204,142,146,107,218,37,100,242,202,153,247,100,42,73,91,127,123,107,193",
];

const STICKER_BOT_OFF_IDS = [
  "118,250,142,253,205,182,58,159,140,165,75,135,170,63,158,225,23,15,231,86,109,17,32,134,48,8,160,0,26,87,9,11",
  "187,9,213,187,251,135,224,184,60,155,169,190,253,126,210,239,148,44,135,252,21,137,130,119,183,230,174,170,214,27,186,183",
];

const STICKER_BOT_ON_IDS = [
  "149,109,80,11,143,218,167,105,200,143,190,152,82,14,130,190,33,232,244,193,3,252,98,149,143,11,36,172,122,230,237,43",
  "128,191,244,4,132,192,197,210,40,255,52,241,224,159,97,226,48,126,92,113,114,153,171,134,98,85,220,186,8,77,206,250",
];

const STICKER_GROUP_LINK_IDS = [
  "49,89,77,98,153,216,193,8,246,54,39,184,201,25,118,55,162,77,163,108,73,176,232,149,215,47,55,228,73,75,106,56",
];

const STICKER_GROUP_DESCRIPTION_IDS = [
  "187,223,188,200,46,231,131,168,44,24,74,108,36,14,200,247,229,232,146,8,190,143,2,102,152,215,114,75,233,175,210,254",
];

const STICKER_BAN_INATIVO_IDS = [
  "93,25,187,92,10,180,167,232,215,181,250,180,72,91,59,113,86,195,88,189,26,19,151,176,41,208,138,117,24,65,72,181",
  "132,44,74,127,7,225,79,202,183,103,247,222,215,173,84,74,21,19,182,226,16,225,215,225,178,196,59,68,254,173,166,44",
];

  const STICKER_GROUP_OPEN_IDS = [
  "97,62,124,11,59,129,95,121,20,118,54,129,110,122,217,31,67,84,40,72,191,59,28,197,58,21,123,174,226,168,211,199",
];

  const STICKER_GROUP_CLOSE_IDS = [
  "179,95,110,30,41,141,71,132,14,66,76,35,70,70,35,160,166,127,211,229,107,149,71,46,225,1,4,154,102,233,174,21",
];

const STICKER_SMART_MESSAGES = {
  "156,130,78,142,242,52,231,110,173,104,35,67,188,39,112,22,228,78,19,58,131,234,43,164,203,133,34,4,18,142,35,167": [
    "🌞 *Bom dia! Eu já estou online, agora só falta o restante do grupo acordar* 🤖",
  ],
  "45,219,249,218,38,56,63,197,201,200,75,179,142,166,35,215,224,160,33,232,57,177,209,193,113,232,69,126,139,221,139,202": [
    "🌞 *Boa tarde. O DeadBoT segue funcionando normalmente. Já alguns membros do grupo... tenho minhas dúvidas* 🤖",
  ],
  "75,43,5,214,77,68,223,148,190,66,86,148,91,233,82,127,0,217,13,179,183,50,49,173,211,232,135,67,141,40,247,157": [
    "🌙 *Boa noite, sobreviventes. Mais um dia concluído com sucesso. Ou algo próximo disso* 🤖",
  ],
  "73,150,131,182,10,144,110,215,205,147,67,56,58,153,244,108,110,113,222,138,9,36,80,218,124,213,137,86,29,180,106,176": [
    "💪 *O dia hoje foi tão divertido quanto um consolo com cerol! Hashtag peidei e saí* 🤖",
  ],
  "112,177,9,226,185,240,67,5,11,183,199,59,210,4,41,144,161,47,165,250,134,22,255,104,231,48,194,181,166,76,0,139": [
    "💀 *Olha quem apareceu... Eu mesmo. O anti-herói favorito do grupo* 😎",
  ],
  "187,128,160,139,113,124,243,215,155,168,218,210,144,38,124,24,157,71,171,146,234,104,2,34,72,169,43,212,93,118,99,124": [
    "📢 *Gostou do DeadBoT? Entre em contato para alugar e transformar seu grupo*",
  ],
};

const BIRTHDAY_MESSAGES = [
  "🎂 Parabéns, {nome}! Que seu dia seja repleto de alegria e felicidade! 🎉",
  "🥳 Feliz aniversário, {nome}! Que todos os seus sonhos se realizem! 🌟",
  "🎈 Hoje é dia de {nome}! Parabéns! Que venham muitos anos mais! 🎊",
  "🎁 Muitas felicidades pra você, {nome}! Hoje é o seu dia especial! 💛",
  "🎉 Parabéns, {nome}! Que Deus abençoe cada passo da sua vida! 🙏",
  "🌟 Feliz aniversário, {nome}! Saúde, paz e muito sucesso! 🚀",
  "🥂 Hoje é aniversário de {nome}! O grupo inteiro celebra com você! 🎂",
  "🎊 Parabéns, {nome}! Que este novo ano de vida seja incrível! ✨",
  "💫 Feliz aniversário, {nome}! Que a vida te reserve coisas lindas! 🌻",
  "🎂 O DeadBoT deseja um feliz aniversário pra {nome}! Viva! 🎉",
];

// ─── CACHE ROTATIVO ───────────────────────────────────────────────────────────
const stickerMessageCache = new Map();

// ─── UTILITÁRIOS ──────────────────────────────────────────────────────────────

function getStickerNumericId(stickerMessage) {
  const buf = stickerMessage?.fileSha256;
  if (!buf || buf.length === 0) return null;
  return Array.from(Buffer.from(buf)).join(",");
}

/** Extrai o número do LID para usar no texto da mention: "125542581964922@lid" → "125542581964922" */
function lidToMention(lid) {
  return lid ? lid.split("@")[0] : "";
}

/** Verifica se o participante é o dono do bot pelo LID */
function isOwner(participantLid) {
  if (!participantLid) return false;
  return participantLid === OWNER_LID;
}

/** Verifica se o participante é o próprio bot pelo LID */
function isBot(participantLid) {
  if (!participantLid) return false;
  return participantLid === BOT_LID;
}

/**
 * Retorna o LID do remetente a partir da mensagem.
 * Na Takeshi 8.4.0 o LID vem em key.participant (grupos).
 */
function getSenderLid(webMessage) {
  return webMessage.key?.participant || webMessage.key?.remoteJid || null;
}

/**
 * Busca o participante no metadata pelo LID e retorna seu objeto.
 * Compara p.lid pois a nova base usa LID como identificador principal.
 */
function findParticipant(participants, lid) {
  return participants.find((p) => p.lid === lid || p.id === lid);
}

function senderIsAdminOrOwner(senderLid, participants) {
  if (isOwner(senderLid)) return true;
  const p = findParticipant(participants, senderLid);
  return !!p?.admin;
}

function readAdvStickers() {
  if (!fs.existsSync(advDbPath)) return [];
  try {
    const db = JSON.parse(fs.readFileSync(advDbPath, "utf8"));
    return Array.isArray(db.stickers) ? db.stickers : [];
  } catch { return []; }
}

function readBanStickers() {
  if (!fs.existsSync(banDbPath)) return [];
  try {
    const db = JSON.parse(fs.readFileSync(banDbPath, "utf8"));
    return Array.isArray(db.stickers) ? db.stickers : [];
  } catch { return []; }
}

// ─── BLACKLIST ────────────────────────────────────────────────────────────────

function readBlacklist() {
  if (!fs.existsSync(blacklistFile)) return {};
  try { return JSON.parse(fs.readFileSync(blacklistFile, "utf8")); } catch { return {}; }
}

function saveBlacklist(bl) {
  fs.writeFileSync(blacklistFile, JSON.stringify(bl, null, 2));
}

function isBlacklisted(targetLid) {
  const bl = readBlacklist();
  return !!bl[targetLid];
}

function addToBlacklist(targetLid) {
  const bl = readBlacklist();
  bl[targetLid] = { addedAt: new Date().toISOString() };
  saveBlacklist(bl);
}

// ─── HANDLERS ─────────────────────────────────────────────────────────────────

async function handleStickerTrigger(socket, webMessage, numericId, remoteJid, senderLid) {
  if (!STICKER_TRIGGER_IDS.includes(numericId)) return;

  await socket.sendMessage(remoteJid, { react: { text: "⏳", key: webMessage.key } });

  let metadata;
  try {
    metadata = await socket.groupMetadata(remoteJid);
  } catch {
    await socket.sendMessage(remoteJid, { react: { text: "❌", key: webMessage.key } });
    return;
  }

  if (!senderIsAdminOrOwner(senderLid, metadata.participants)) {
    await socket.sendMessage(remoteJid, { react: { text: "❌", key: webMessage.key } });
    return;
  }

  // Menciona todos exceto o bot
  const participants = metadata.participants
    .filter((p) => p.lid !== BOT_LID && p.id !== BOT_LID)
    .map((p) => p.lid || p.id);

  if (!participants.length) {
    await socket.sendMessage(remoteJid, { react: { text: "❌", key: webMessage.key } });
    return;
  }

  await socket.sendMessage(
    remoteJid,
    {
      text: `👥 *${metadata.subject || "Grupo"}*\n\n📢 *Figurinha chamando todos do grupo*`,
      mentions: participants,
    },
    { quoted: webMessage }
  );

  await socket.sendMessage(remoteJid, { react: { text: "✅", key: webMessage.key } });
}

async function handleStickerDelete(socket, webMessage, numericId, remoteJid, senderLid) {
  if (!STICKER_DELETE_IDS.includes(numericId)) return;

  const contextInfo = webMessage.message.stickerMessage.contextInfo;
  if (!contextInfo?.stanzaId || !contextInfo?.participant) {
    await socket.sendMessage(remoteJid, { text: "🎯 *Marque a mensagem do usuário para apagar*" });
    return;
  }

  const metadata = await socket.groupMetadata(remoteJid);
  if (!senderIsAdminOrOwner(senderLid, metadata.participants)) return;

  await socket.sendMessage(remoteJid, {
    delete: {
      remoteJid,
      fromMe: false,
      id: contextInfo.stanzaId,
      participant: contextInfo.participant,
    },
  });
}

async function handleStickerWarn(socket, webMessage, numericId, remoteJid, senderLid) {
  const STICKER_WARN_IDS = readAdvStickers();
  if (!STICKER_WARN_IDS.includes(numericId)) return;

  const contextInfo = webMessage.message.stickerMessage.contextInfo;
  if (!contextInfo?.stanzaId || !contextInfo?.participant) {
    await socket.sendMessage(remoteJid, { text: "🎯 *Marque a mensagem do usuário para advertir*" });
    return;
  }

  const metadata = await socket.groupMetadata(remoteJid);
  if (!senderIsAdminOrOwner(senderLid, metadata.participants)) return;

  const targetLid = contextInfo.participant;
  const targetParticipant = findParticipant(metadata.participants, targetLid);
  const isProtected =
    isOwner(targetLid) ||
    isBot(targetLid) ||
    !!targetParticipant?.admin;

  if (isProtected) {
    await socket.sendMessage(remoteJid, {
      text: "❌ Você não pode usar esta figurinha contra ADMs",
      mentions: [targetLid],
    });
    return;
  }

  const count = addWarn(remoteJid, targetLid, "Advertência por figurinha");
  const limit = getWarnLimit(remoteJid);

  if (count >= limit) {
    await socket.sendMessage(remoteJid, {
      text: `🚫 @${lidToMention(targetLid)} atingiu ${limit} advertências e será removido.`,
      mentions: [targetLid],
    });
    try {
      await socket.groupParticipantsUpdate(remoteJid, [targetLid], "remove");
    } catch {
      await socket.sendMessage(remoteJid, { text: "❌ Erro ao remover o usuário. O bot é administrador?" });
    }
  } else {
    await socket.sendMessage(remoteJid, {
      text: `⚠️ @${lidToMention(targetLid)} recebeu uma advertência.\n🔢 Total: ${count}/${limit}`,
      mentions: [targetLid],
    });
  }
}

async function handleStickerMute(socket, webMessage, numericId, remoteJid, senderLid) {
  if (!STICKER_MUTE_IDS.includes(numericId)) return;

  const contextInfo = webMessage.message.stickerMessage.contextInfo;
  if (!contextInfo?.stanzaId || !contextInfo?.participant) {
    await socket.sendMessage(remoteJid, { text: "🎯 *Marque a mensagem do usuário para mutar*" });
    return;
  }

  const metadata = await socket.groupMetadata(remoteJid);
  if (!senderIsAdminOrOwner(senderLid, metadata.participants)) return;

  const targetLid = contextInfo.participant;
  const targetParticipant = findParticipant(metadata.participants, targetLid);

  if (isOwner(targetLid)) {
    await socket.sendMessage(remoteJid, { text: "❌ Você não pode mutar o dono do bot!" });
    return;
  }
  if (isBot(targetLid)) {
    await socket.sendMessage(remoteJid, { text: "❌ Você não pode mutar o bot." });
    return;
  }
  if (targetParticipant?.admin) {
    await socket.sendMessage(remoteJid, { text: "❌ Você não pode mutar um administrador." });
    return;
  }
  if (checkIfMemberIsMuted(remoteJid, targetLid)) {
    await socket.sendMessage(remoteJid, {
      text: `⚠️ @${lidToMention(targetLid)} já está mutado neste grupo.`,
      mentions: [targetLid],
    });
    return;
  }

  muteMember(remoteJid, targetLid);
  await socket.sendMessage(remoteJid, {
    text: `🔇 @${lidToMention(targetLid)} foi mutado com sucesso!\n\n_Suas mensagens serão deletadas automaticamente._`,
    mentions: [targetLid],
  });
}

async function handleStickerUnmute(socket, webMessage, numericId, remoteJid, senderLid) {
  if (!STICKER_UNMUTE_IDS.includes(numericId)) return;

  const contextInfo = webMessage.message.stickerMessage.contextInfo;
  if (!contextInfo?.stanzaId || !contextInfo?.participant) {
    await socket.sendMessage(remoteJid, { text: "🎯 *Marque a mensagem do usuário para desmutar*" });
    return;
  }

  const metadata = await socket.groupMetadata(remoteJid);
  if (!senderIsAdminOrOwner(senderLid, metadata.participants)) return;

  const targetLid = contextInfo.participant;

  if (!checkIfMemberIsMuted(remoteJid, targetLid)) {
    await socket.sendMessage(remoteJid, {
      text: `⚠️ @${lidToMention(targetLid)} não está mutado!`,
      mentions: [targetLid],
    });
    return;
  }

  unmuteMember(remoteJid, targetLid);
  await socket.sendMessage(remoteJid, {
    text: `🔊 @${lidToMention(targetLid)} foi desmutado com sucesso!\n\n_Agora pode enviar mensagens normalmente._`,
    mentions: [targetLid],
  });
}

async function handleStickerBlacklist(socket, webMessage, numericId, remoteJid, senderLid) {
  if (!STICKER_BLACKLIST_IDS.includes(numericId)) return;

  const contextInfo = webMessage.message.stickerMessage.contextInfo;
  if (!contextInfo?.stanzaId || !contextInfo?.participant) {
    await socket.sendMessage(remoteJid, { text: "🎯 *Marque o alvo para enviar à lista negra*" });
    return;
  }

  const metadata = await socket.groupMetadata(remoteJid);
  if (!senderIsAdminOrOwner(senderLid, metadata.participants)) return;

  const targetLid = contextInfo.participant;
  const targetParticipant = findParticipant(metadata.participants, targetLid);

  if (isOwner(targetLid)) {
    await socket.sendMessage(remoteJid, { text: "❌ Você não pode adicionar o dono do bot à lista negra!" });
    return;
  }
  if (isBot(targetLid)) {
    await socket.sendMessage(remoteJid, { text: "❌ Você não pode adicionar o bot à lista negra." });
    return;
  }
  if (targetParticipant?.admin) {
    await socket.sendMessage(remoteJid, { text: "❌ Você não pode adicionar um administrador à lista negra." });
    return;
  }
  if (isBlacklisted(targetLid)) {
    await socket.sendMessage(remoteJid, {
      text: `⚠️ @${lidToMention(targetLid)} já está na lista negra!`,
      mentions: [targetLid],
    });
    return;
  }

  addToBlacklist(targetLid);
  await socket.sendMessage(remoteJid, {
    text: `🚫 @${lidToMention(targetLid)} foi adicionado à lista negra e será removido!`,
    mentions: [targetLid],
  });
  try {
    await socket.groupParticipantsUpdate(remoteJid, [targetLid], "remove");
  } catch {
    await socket.sendMessage(remoteJid, { text: "❌ Erro ao remover o usuário. O bot é administrador?" });
  }
}

async function handleStickerPromote(socket, webMessage, numericId, remoteJid, senderLid) {
  if (!STICKER_PROMOTE_IDS.includes(numericId)) return;

  const contextInfo = webMessage.message.stickerMessage.contextInfo;
  if (!contextInfo?.stanzaId || !contextInfo?.participant) {
    await socket.sendMessage(remoteJid, { text: "🎯 *Marque a mensagem do usuário que deseja promover*" });
    return;
  }

  const metadata = await socket.groupMetadata(remoteJid);
  if (!senderIsAdminOrOwner(senderLid, metadata.participants)) return;

  const targetLid = contextInfo.participant;
  const targetParticipant = findParticipant(metadata.participants, targetLid);

  if (isBot(targetLid)) {
    await socket.sendMessage(remoteJid, { text: "❌ Não faz sentido me promover, eu já mando aqui 😎" });
    return;
  }
  if (targetParticipant?.admin) {
    await socket.sendMessage(remoteJid, {
      text: `⚠️ @${lidToMention(targetLid)} já é administrador.`,
      mentions: [targetLid],
    });
    return;
  }

  try {
    await socket.groupParticipantsUpdate(remoteJid, [targetLid], "promote");
    await socket.sendMessage(remoteJid, {
      text: `👑 @${lidToMention(targetLid)} agora é administrador!`,
      mentions: [targetLid],
    });
  } catch {
    await socket.sendMessage(remoteJid, { text: "❌ Não consegui promover. O bot precisa ser administrador." });
  }
}

async function handleStickerDemote(socket, webMessage, numericId, remoteJid, senderLid) {
  if (!STICKER_DEMOTE_IDS.includes(numericId)) return;

  const contextInfo = webMessage.message.stickerMessage.contextInfo;
  if (!contextInfo?.stanzaId || !contextInfo?.participant) {
    await socket.sendMessage(remoteJid, { text: "🎯 *Marque a mensagem do administrador que deseja rebaixar*" });
    return;
  }

  const metadata = await socket.groupMetadata(remoteJid);
  if (!senderIsAdminOrOwner(senderLid, metadata.participants)) return;

  const targetLid = contextInfo.participant;
  const targetParticipant = findParticipant(metadata.participants, targetLid);

  if (isOwner(targetLid)) {
    await socket.sendMessage(remoteJid, { text: "❌ Você não pode rebaixar o dono do bot!" });
    return;
  }
  if (isBot(targetLid)) {
    await socket.sendMessage(remoteJid, { text: "❌ Não posso me auto rebaixar 😎" });
    return;
  }
  if (!targetParticipant?.admin) {
    await socket.sendMessage(remoteJid, {
      text: `⚠️ @${lidToMention(targetLid)} não é administrador.`,
      mentions: [targetLid],
    });
    return;
  }

  try {
    await socket.groupParticipantsUpdate(remoteJid, [targetLid], "demote");
    await socket.sendMessage(remoteJid, {
      text: `📉 @${lidToMention(targetLid)} deixou de ser administrador.`,
      mentions: [targetLid],
    });
  } catch {
    await socket.sendMessage(remoteJid, { text: "❌ Não consegui rebaixar. O bot precisa ser administrador." });
  }
}

async function handleStickerAdminOnly(socket, webMessage, numericId, remoteJid, senderLid) {
  if (!STICKER_ADMIN_ONLY_IDS.includes(numericId)) return;

  const metadata = await socket.groupMetadata(remoteJid);
  if (!senderIsAdminOrOwner(senderLid, metadata.participants)) return;

  const isAdminOnly = metadata.announce === true;
  try {
    if (isAdminOnly) {
      await socket.groupSettingUpdate(remoteJid, "not_announcement");
      await socket.sendMessage(remoteJid, { text: "🔓 Grupo aberto! Todos podem enviar mensagens." });
    } else {
      await socket.groupSettingUpdate(remoteJid, "announcement");
      await socket.sendMessage(remoteJid, { text: "🔒 Modo admin ativado! Apenas administradores podem falar." });
    }
  } catch {
    await socket.sendMessage(remoteJid, { text: "❌ Não consegui alterar o modo do grupo. O bot precisa ser administrador." });
  }
}

async function handleStickerTagAdmins(socket, webMessage, numericId, remoteJid) {
  if (!STICKER_TAG_ADM_IDS.includes(numericId)) return;

  const metadata = await socket.groupMetadata(remoteJid);
  const admins = metadata.participants
    .filter((p) => p.admin)
    .map((p) => p.lid || p.id);

  if (!admins.length) {
    await socket.sendMessage(remoteJid, { text: "❌ Não encontrei administradores neste grupo." });
    return;
  }

  const mentionsText = admins.map((lid) => `@${lidToMention(lid)}`).join(" ");
  await socket.sendMessage(
    remoteJid,
    {
      text: `👮 *Chamando os ADMs*\n🪀 Grupo: *${metadata.subject || "este grupo"}*\n\n${mentionsText}`,
      mentions: admins,
    },
    { quoted: webMessage }
  );
}

async function handleSmartStickers(socket, webMessage, numericId, remoteJid, senderLid) {
  const messages = STICKER_SMART_MESSAGES[numericId];
  if (!messages) return;

  const metadata = await socket.groupMetadata(remoteJid);
  if (!senderIsAdminOrOwner(senderLid, metadata.participants)) return;

  const cacheKey = `${remoteJid}_${numericId}`;
  const index = stickerMessageCache.get(cacheKey) || 0;
  const text = messages[index];
  stickerMessageCache.set(cacheKey, (index + 1) % messages.length);

  await socket.sendMessage(remoteJid, { text }, { quoted: webMessage });
}

async function handleStickerBirthday(socket, webMessage, numericId, remoteJid, senderLid) {
  if (!STICKER_BIRTHDAY_IDS.includes(numericId)) return;

  const contextInfo = webMessage.message.stickerMessage.contextInfo;
  if (!contextInfo?.stanzaId || !contextInfo?.participant) {
    await socket.sendMessage(remoteJid, { text: "🎯 *Marque a mensagem do aniversariante para parabenizá-lo!*" });
    return;
  }

  const metadata = await socket.groupMetadata(remoteJid);
  if (!senderIsAdminOrOwner(senderLid, metadata.participants)) return;

  const targetLid = contextInfo.participant;

  const cacheKey = `birthday_${remoteJid}`;
  const index = stickerMessageCache.get(cacheKey) || 0;
  const template = BIRTHDAY_MESSAGES[index];
  stickerMessageCache.set(cacheKey, (index + 1) % BIRTHDAY_MESSAGES.length);

  const finalMessage = template.replace("{nome}", `@${lidToMention(targetLid)}`);
  await socket.sendMessage(
    remoteJid,
    { text: finalMessage, mentions: [targetLid] },
    { quoted: webMessage }
  );
}

async function handleStickerBotOff(socket, webMessage, numericId, remoteJid, senderLid) {
  if (!STICKER_BOT_OFF_IDS.includes(numericId)) return;

  if (!isOwner(senderLid)) {
    await socket.sendMessage(remoteJid, { text: "⛔ Apenas o dono do bot pode usar esta figurinha." });
    return;
  }

  deactivateGroup(remoteJid);
  await socket.sendMessage(remoteJid, { text: "🔴 DeadBoT desativado neste grupo!" }, { quoted: webMessage });
}

async function handleStickerBotOn(socket, webMessage, numericId, remoteJid, senderLid) {
  if (!STICKER_BOT_ON_IDS.includes(numericId)) return;

  if (!isOwner(senderLid)) {
    await socket.sendMessage(remoteJid, { text: "⛔ Apenas o dono do bot pode usar esta figurinha." });
    return;
  }

  activateGroup(remoteJid);
  await socket.sendMessage(remoteJid, { text: "🟢 DeadBoT ativado neste grupo!" }, { quoted: webMessage });
}

async function handleStickerGroupLink(socket, webMessage, numericId, remoteJid, senderLid) {
  if (!STICKER_GROUP_LINK_IDS.includes(numericId)) return;

  const metadata = await socket.groupMetadata(remoteJid);
  if (!senderIsAdminOrOwner(senderLid, metadata.participants)) {
    await socket.sendMessage(remoteJid, { text: "❌ Apenas administradores podem gerar o link do grupo." });
    return;
  }

  await socket.sendMessage(remoteJid, { react: { text: "⏳", key: webMessage.key } });

  let inviteCode;
  try {
    inviteCode = await socket.groupInviteCode(remoteJid);
  } catch {
    await socket.sendMessage(remoteJid, { text: "❌ Preciso ser administrador para obter o link." });
    await socket.sendMessage(remoteJid, { react: { text: "❌", key: webMessage.key } });
    return;
  }

  const link = `https://chat.whatsapp.com/${inviteCode}`;
  const text = `╭━━━〔 🔗 *LINK DO GRUPO* 〕━━━⬣\n┃\n┃ 🪀 *Grupo:* ${metadata.subject}\n┃\n┃ 🔓 *Acesso liberado*\n┃ 👇 Entre pelo link abaixo:\n┃\n┃ 🌐 ${link}\n┃\n╰━━━〔 🤖 ${BOT_NAME} 〕━━━⬣`.trim();

  const picUrl = await socket.profilePictureUrl(remoteJid, "image").catch(() => null);
  if (picUrl) {
    await socket.sendMessage(remoteJid, { image: { url: picUrl }, caption: text });
  } else {
    await socket.sendMessage(remoteJid, { text });
  }

  await socket.sendMessage(remoteJid, { react: { text: "✅", key: webMessage.key } });
}

async function handleStickerGroupDescription(socket, webMessage, numericId, remoteJid, senderLid) {
  if (!STICKER_GROUP_DESCRIPTION_IDS.includes(numericId)) return;

  const metadata = await socket.groupMetadata(remoteJid);
  if (!senderIsAdminOrOwner(senderLid, metadata.participants)) return;

  const descricao = metadata?.desc?.trim();
  if (!descricao) {
    await socket.sendMessage(remoteJid, { text: "⚠️ Este grupo não possui descrição definida." });
    return;
  }

  const caption = `🚨 *Regras do grupo 🚨*\n\n${descricao}`;
  const picUrl = await socket.profilePictureUrl(remoteJid, "image").catch(() => null);
  if (picUrl) {
    await socket.sendMessage(remoteJid, { image: { url: picUrl }, caption });
  } else {
    await socket.sendMessage(remoteJid, { text: caption });
  }
}

async function handleStickerBanDinamico(socket, webMessage, numericId, remoteJid, senderLid) {
  const BAN_IDS = readBanStickers();
  if (!BAN_IDS.includes(numericId)) return;

  const contextInfo = webMessage.message.stickerMessage.contextInfo;
  if (!contextInfo?.stanzaId || !contextInfo?.participant) {
    await socket.sendMessage(remoteJid, { text: "🎯 *Marque a mensagem do alvo para banir*" });
    return;
  }

  const metadata = await socket.groupMetadata(remoteJid);
  if (!senderIsAdminOrOwner(senderLid, metadata.participants)) return;

  const targetLid = contextInfo.participant;
  const targetParticipant = findParticipant(metadata.participants, targetLid);

  if (isOwner(targetLid)) {
    await socket.sendMessage(remoteJid, { text: "❌ Você não pode banir o dono do bot!" });
    return;
  }
  if (isBot(targetLid)) {
    await socket.sendMessage(remoteJid, { text: "❌ Você não pode banir o bot." });
    return;
  }
  if (targetParticipant?.admin) {
    await socket.sendMessage(remoteJid, { text: "❌ Você não pode banir um administrador." });
    return;
  }

  try {
    await socket.groupParticipantsUpdate(remoteJid, [targetLid], "remove");
    await socket.sendMessage(remoteJid, {
      text: `☠️ @${lidToMention(targetLid)} foi banido com sucesso. Reclamações? Fale com o Wolverine.`,
      mentions: [targetLid],
    });
  } catch {
    await socket.sendMessage(remoteJid, { text: "⚠️ Não consegui remover o usuário. O bot é administrador?" });
  }
}

  async function handleStickerGroupOpen(
  socket,
  webMessage,
  numericId,
  remoteJid,
  senderLid
) {
  if (!STICKER_GROUP_OPEN_IDS.includes(numericId)) return;

  const metadata = await socket.groupMetadata(remoteJid);

  if (!senderIsAdminOrOwner(senderLid, metadata.participants)) {
    return;
  }

  try {
    await socket.groupSettingUpdate(
      remoteJid,
      "not_announcement"
    );

    await socket.sendMessage(
      remoteJid,
      {
        text: "🔓 *Grupo aberto!* Agora todos podem enviar mensagens.",
      },
      { quoted: webMessage }
    );
  } catch (error) {
    console.error("[handleStickerGroupOpen]", error);

    await socket.sendMessage(
      remoteJid,
      {
        text: "❌ Não consegui abrir o grupo. O bot é administrador?",
      },
      { quoted: webMessage }
    );
  }
}

   async function handleStickerGroupClose(
  socket,
  webMessage,
  numericId,
  remoteJid,
  senderLid
) {
  if (!STICKER_GROUP_CLOSE_IDS.includes(numericId)) return;

  const metadata = await socket.groupMetadata(remoteJid);

  if (!senderIsAdminOrOwner(senderLid, metadata.participants)) {
    return;
  }

  try {
    await socket.groupSettingUpdate(
      remoteJid,
      "announcement"
    );

    await socket.sendMessage(
      remoteJid,
      {
        text: "🔒 *Grupo fechado!* Apenas administradores podem enviar mensagens.",
      },
      { quoted: webMessage }
    );
  } catch (error) {
    console.error("[handleStickerGroupClose]", error);

    await socket.sendMessage(
      remoteJid,
      {
        text: "❌ Não consegui fechar o grupo. O bot é administrador?",
      },
      { quoted: webMessage }
    );
  }
}

async function handleStickerBanInativo(socket, webMessage, numericId, remoteJid, senderLid) {
  if (!STICKER_BAN_INATIVO_IDS.includes(numericId)) return;

  const metadata = await socket.groupMetadata(remoteJid);
  if (!senderIsAdminOrOwner(senderLid, metadata.participants)) return;

  await socket.sendMessage(remoteJid, { react: { text: "🎲", key: webMessage.key } });

  const { default: activityTracker } = await import("../utils/activityTracker.js");
  const groupData = activityTracker.getGroupStats(remoteJid);

  const protectedLids = new Set([BOT_LID, OWNER_LID]);
  metadata.participants.forEach((p) => { if (p.admin) protectedLids.add(p.lid || p.id); });

  const members = metadata.participants
    .map((p) => p.lid || p.id)
    .filter((lid) => !protectedLids.has(lid));

  if (!members.length) {
    await socket.sendMessage(remoteJid, { text: "⚠️ Nenhum membro elegível encontrado no grupo." });
    return;
  }

  const withCounts = members.map((lid) => {
    const d = groupData[lid] || {};
    return {
      lid,
      total: (d.messages || 0) + (d.stickers || 0) + (d.commands || 0) + (d.audios || 0),
    };
  });

  const minCount = Math.min(...withCounts.map((m) => m.total));
  const candidatos = withCounts.filter((m) => m.total === minCount);
  const sorteado = candidatos[Math.floor(Math.random() * candidatos.length)];

  const msgs = [
    `💀 O destino escolheu @${lidToMention(sorteado.lid)}!\n\n📊 Mensagens enviadas: *${sorteado.total}*\n\n_A inatividade tem um preço no DeadBoT_ 😈`,
    `🎲 A roleta girou e parou em @${lidToMention(sorteado.lid)}!\n\n📊 Mensagens enviadas: *${sorteado.total}*\n\n_Tchau, inativo!_ 👋`,
    `🔫 Boom! @${lidToMention(sorteado.lid)} foi o escolhido pelas estatísticas!\n\n📊 Mensagens enviadas: *${sorteado.total}*\n\n_Quem não aparece, é esquecido._ 💀`,
    `😈 O DeadBoT sorteou @${lidToMention(sorteado.lid)}!\n\n📊 Mensagens enviadas: *${sorteado.total}*\n\n_Atividade é sobrevivência por aqui._ 🎯`,
  ];

  await socket.sendMessage(remoteJid, {
    text: msgs[Math.floor(Math.random() * msgs.length)],
    mentions: [sorteado.lid],
  });

  try {
    await socket.groupParticipantsUpdate(remoteJid, [sorteado.lid], "remove");
    await socket.sendMessage(remoteJid, { react: { text: "✅", key: webMessage.key } });
  } catch {
    await socket.sendMessage(remoteJid, { text: "❌ Não consegui remover. O bot é administrador do grupo?" });
    await socket.sendMessage(remoteJid, { react: { text: "❌", key: webMessage.key } });
  }
}

// ─── ENTRY POINT ──────────────────────────────────────────────────────────────

export async function stickerHandler(socket, webMessage) {
  try {
    if (!webMessage?.key) return;
    if (webMessage.key.fromMe) return;
    if (!webMessage.message?.stickerMessage) return;

    const remoteJid = webMessage.key.remoteJid;
    if (!remoteJid?.endsWith("@g.us")) return;

    const senderLid = getSenderLid(webMessage);
    if (!senderLid) return;

    const numericId = getStickerNumericId(webMessage.message.stickerMessage);
    if (!numericId) return;

    await handleStickerTrigger(socket, webMessage, numericId, remoteJid, senderLid);
    await handleStickerDelete(socket, webMessage, numericId, remoteJid, senderLid);
    await handleStickerWarn(socket, webMessage, numericId, remoteJid, senderLid);
    await handleStickerMute(socket, webMessage, numericId, remoteJid, senderLid);
    await handleStickerUnmute(socket, webMessage, numericId, remoteJid, senderLid);
    await handleStickerBlacklist(socket, webMessage, numericId, remoteJid, senderLid);
    await handleStickerPromote(socket, webMessage, numericId, remoteJid, senderLid);
    await handleStickerDemote(socket, webMessage, numericId, remoteJid, senderLid);
    await handleStickerAdminOnly(socket, webMessage, numericId, remoteJid, senderLid);
    await handleStickerTagAdmins(socket, webMessage, numericId, remoteJid, senderLid);
    await handleSmartStickers(socket, webMessage, numericId, remoteJid, senderLid);
    await handleStickerBirthday(socket, webMessage, numericId, remoteJid, senderLid);
    await handleStickerBotOff(socket, webMessage, numericId, remoteJid, senderLid);
    await handleStickerBotOn(socket, webMessage, numericId, remoteJid, senderLid);
    await handleStickerGroupLink(socket, webMessage, numericId, remoteJid, senderLid);
    await handleStickerGroupDescription(socket, webMessage, numericId, remoteJid, senderLid);
    await handleStickerBanDinamico(socket, webMessage, numericId, remoteJid, senderLid);
    await handleStickerBanInativo(socket, webMessage, numericId, remoteJid, senderLid);
    await handleStickerGroupOpen(socket, webMessage,numericId,remoteJid, senderLid);
     await handleStickerGroupClose(
  socket, webMessage, numericId, remoteJid, senderLid);
  } catch (error) {
    console.error("[stickerHandler] Erro:", error.message);
  }
}
