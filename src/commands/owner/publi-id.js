import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PREFIX } from "../../config.js";
import { InvalidParameterError, WarningError } from "../../errors/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, "..", "..", "..", "database", "publi.json");

function lerDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 2), "utf-8");
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function salvarDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

async function getNomeGrupo(socket, jid) {
  try {
    const meta = await socket.groupMetadata(jid);
    return meta?.subject || jid;
  } catch {
    return "Nome não disponível";
  }
}

export default {
  name: "publi-id",
  description: "Gerencia os grupos alvo do sistema de publicações automáticas",
  commands: ["publi-id"],
  usage: `${PREFIX}publi-id add <jid> | remove <jid> | lista`,

  handle: async ({ socket, fullArgs, sendReply, sendSuccessReply }) => {
    const partes = (fullArgs || "").trim().split(/\s+/);
    const sub = partes[0] || "";
    const jidArg = partes[1] || "";

    if (!sub || sub === "lista") {
      const db = lerDB();
      const grupos = Object.entries(db);

      if (grupos.length === 0) {
        await sendReply(`📋 Nenhum grupo cadastrado.\n\nUse *${PREFIX}publi-id add <jid>* para adicionar.`);
        return;
      }

      const lista = grupos
        .map(([jid, dados], i) => {
          const status = dados.ativo ? "🟢" : "🔴";
          const total = dados.publicacoes?.length || 0;
          const nome = dados.nome || jid;
          const intervalo = dados.intervalo || 60;
          const hh = String(Math.floor(intervalo / 60)).padStart(2, "0");
          const mm = String(intervalo % 60).padStart(2, "0");
          return (
            `${status} *${i + 1}.* ${nome}\n` +
            `   📋 ${total} publicação(ões) | ⏱️ ${hh}:${mm}\n` +
            `   🔗 ${jid}`
          );
        })
        .join("\n\n");

      await sendReply(
        `📋 *Grupos alvo cadastrados*\n\n${lista}\n\n` +
          `💡 Gerencie com:\n*${PREFIX}publi <jid_completo> <subcomando>*`
      );
      return;
    }

    if (sub === "add") {
      if (!jidArg || !jidArg.endsWith("@g.us")) {
        throw new InvalidParameterError(
          `JID inválido!\n\nUse *${PREFIX}get-id* no grupo alvo para obter o ID:\n*${PREFIX}publi-id add 120363xxxxxxx@g.us*`
        );
      }

      const db = lerDB();

      if (db[jidArg]) {
        await sendReply(`⚠️ Este grupo já está cadastrado!\n🔗 *${jidArg}*`);
        return;
      }

      const nome = await getNomeGrupo(socket, jidArg);

      db[jidArg] = {
        ativo: false,
        intervalo: 60,
        indice: 0,
        ultimoDisparo: 0,
        nome,
        publicacoes: [],
      };
      salvarDB(db);

      await sendSuccessReply(
        `✅ *Grupo alvo cadastrado!*\n\n` +
          `🪀 *Nome:* ${nome}\n` +
          `🔗 *JID:* ${jidArg}\n\n` +
          `Agora adicione publicações:\n*${PREFIX}publi ${jidArg} add*`
      );
      return;
    }

    if (sub === "remove") {
      if (!jidArg || !jidArg.endsWith("@g.us")) {
        throw new InvalidParameterError(
          `Informe o JID completo do grupo.\nEx: *${PREFIX}publi-id remove 120363xxxxxxx@g.us*`
        );
      }

      const db = lerDB();

      if (!db[jidArg]) {
        throw new WarningError(`Grupo não encontrado: *${jidArg}*`);
      }

      const totalPubli = db[jidArg].publicacoes?.length || 0;
      const nome = db[jidArg].nome || jidArg;
      delete db[jidArg];
      salvarDB(db);

      await sendSuccessReply(
        `🗑️ *Grupo removido!*\n\n` +
          `🪀 ${nome}\n` +
          `🔗 ${jidArg}\n` +
          `📋 ${totalPubli} publicação(ões) removida(s).`
      );
      return;
    }

    throw new InvalidParameterError(`Subcomando inválido. Use: add, remove, lista`);
  },
};
