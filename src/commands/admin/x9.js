import { PREFIX } from "../../config.js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Caminhos dos arquivos (database/ na raiz do projeto)
const LOGS_FILE = join(__dirname, "../../../database/x9_logs.json");
const CONFIG_FILE = join(__dirname, "../../../database/x9_config.json");

// Inicializar arquivos se não existirem
export const initFiles = () => {
  if (!existsSync(LOGS_FILE)) {
    writeFileSync(LOGS_FILE, JSON.stringify([], null, 2));
  }
  if (!existsSync(CONFIG_FILE)) {
    writeFileSync(CONFIG_FILE, JSON.stringify({}, null, 2));
  }
};

// Carregar logs
const loadLogs = () => {
  try {
    return JSON.parse(readFileSync(LOGS_FILE, "utf8"));
  } catch {
    return [];
  }
};

// Salvar logs
const saveLogs = (logs) => {
  writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2));
};

// Carregar configuração
const loadConfig = () => {
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, "utf8"));
  } catch {
    return {};
  }
};

// Salvar configuração
const saveConfig = (config) => {
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
};

// Verificar se x9 está ativo no grupo
export const isX9Active = (groupId) => {
  const config = loadConfig();
  return config[groupId] === true;
};

// Ativar/desativar x9 em um grupo
export const toggleX9 = (groupId, active) => {
  const config = loadConfig();
  config[groupId] = active;
  saveConfig(config);
};

// Adicionar um novo log
export const addLog = (action, adminId, adminName, groupId, groupName, target = null, details = "") => {
  const logs = loadLogs();
  const newLog = {
    id: logs.length + 1,
    timestamp: new Date().toISOString(),
    date: new Date().toLocaleString("pt-BR"),
    action,
    admin: { id: adminId, name: adminName },
    group: { id: groupId, name: groupName },
    target,
    details,
  };

  logs.push(newLog);

  if (logs.length > 500) logs.shift();

  saveLogs(logs);
  return newLog;
};

export default {
  name: "x9",
  description: "🕵️ Ativa/desativa monitoramento de admins",
  commands: ["x9"],
  usage: `${PREFIX}x9 1 - Ativar\n${PREFIX}x9 0 - Desativar\n${PREFIX}x9 status - Ver status`,
  handle: async ({ socket, remoteJid, args, isGroup, isGroupAdmin, isOwner, userLid, webMessage, sendReply }) => {

    initFiles();

    if (!isGroup) {
      return await sendReply("❌ Este comando só funciona em grupos!");
    }

    if (args.length === 0 || args[0].toLowerCase() === "status") {
      const isActive = isX9Active(remoteJid);
      return await sendReply(
        isActive
          ? "✅ *X9 ATIVO* 🕵️\n\nO monitoramento está em funcionamento!"
          : "⚠️ *X9 INATIVO*\n\nUse `" + PREFIX + "x9 1` para ativar o monitoramento."
      );
    }

    const subCommand = args[0].toLowerCase();

    if (subCommand === "1" || subCommand === "0") {
      let isAdmin = isGroupAdmin || isOwner;

      if (!isAdmin && isGroup) {
        try {
          const groupMetadata = await socket.groupMetadata(remoteJid);
          const participant = groupMetadata.participants.find(
            (p) => p.id === userLid || p.lid === userLid
          );
          isAdmin = participant && (participant.admin === "admin" || participant.admin === "superadmin");
        } catch {
          // silencioso
        }
      }

      if (!isAdmin) {
        return await sendReply("❌ Apenas admins podem ativar/desativar o X9!");
      }

      const activate = subCommand === "1";
      toggleX9(remoteJid, activate);

      try {
        if (webMessage?.key) {
          await socket.sendMessage(remoteJid, {
            react: { text: activate ? "🕵️" : "⚠️", key: webMessage.key },
          });
        }
      } catch {
        // silencioso
      }

      return await sendReply(
        activate
          ? "✅ *X9 ATIVADO!* 🕵️\n\nTodas as ações dos admins serão monitoradas a partir de agora."
          : "⚠️ *X9 DESATIVADO!*\n\nO monitoramento foi desativado. Use `" + PREFIX + "x9 1` para reativar."
      );
    }

    if (subCommand === "ajuda" || subCommand === "help") {
      return await sendReply(`🕵️ *COMANDO X9 - AJUDA* 🕵️

*Comandos disponíveis (apenas admins):*
• *${PREFIX}x9 1* - Ativar monitoramento
• *${PREFIX}x9 0* - Desativar monitoramento
• *${PREFIX}x9 status* - Ver se está ativo
• *${PREFIX}x9 ajuda* - Exibir esta ajuda

*Ações monitoradas:*
✓ Adicionar membros
✓ Remover membros
✓ Promover a admin
✓ Rebaixar admin
✓ Alterar nome do grupo
✓ Alterar descrição
✓ Alterar foto do grupo
✓ Alterar configurações

_Use ${PREFIX}x9 1 para ativar!_ 🕵️`);
    }

    return await sendReply("❌ Comando inválido! Use *" + PREFIX + "x9 ajuda* para ver os comandos disponíveis.");
  },
};
