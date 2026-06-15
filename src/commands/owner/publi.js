import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { downloadMediaMessage } from "baileys";
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

function lerGrupo(jid) {
  const db = lerDB();
  return db[jid] || { ativo: false, intervalo: 60, indice: 0, ultimoDisparo: 0, publicacoes: [] };
}

function salvarGrupo(jid, dados) {
  const db = lerDB();
  db[jid] = dados;
  salvarDB(db);
}

function formatIntervalo(minutos) {
  const m = parseInt(minutos) || 60;
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  if (m < 60) return `${hh}:${mm} (${m} minutos)`;
  if (m === 60) return `${hh}:${mm} (1 hora)`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return `${hh}:${mm} (${h}h${r > 0 ? " " + r + "min" : ""})`;
}

async function getNomeGrupoAlvo(socket, jid) {
  const db = lerDB();
  if (db[jid]?.nome && db[jid].nome !== "Nome não disponível") return db[jid].nome;
  try {
    const meta = await socket.groupMetadata(jid);
    const nome = meta?.subject || jid;
    const db2 = lerDB();
    if (db2[jid]) { db2[jid].nome = nome; salvarDB(db2); }
    return nome;
  } catch {
    return jid;
  }
}

export default {
  name: "publi",
  description: "Gerencia publicações automáticas por grupo",
  commands: ["publi"],
  usage: `${PREFIX}publi <jid_completo> <subcomando>`,

  handle: async ({
    socket,
    webMessage,
    remoteJid,
    fullArgs,
    sendReply,
    sendSuccessReply,
    sendWaitReact,
    sendSuccessReact,
  }) => {
    const partes = (fullArgs || "").trim().split(/\s+/);
    const grupoAlvoJid = partes[0] || "";
    const subComando = partes[1] || "";

    // ── SEM ARGUMENTOS — ajuda ───────────────────────────────
    if (!grupoAlvoJid) {
      await sendReply(
        `📢 *Sistema de Publicações — DeadBoT*\n\n` +
          `*Uso:* ${PREFIX}publi <jid_completo> <subcomando>\n\n` +
          `*Subcomandos:*\n` +
          `• *1* — Ativa publicações no grupo\n` +
          `• *0* — Desativa publicações\n` +
          `• *add* — Adiciona publicação (junto com a imagem e o texto da publicação)\n` +
          `• *del <n>* — Remove publicação pelo número\n` +
          `• *remover* — Remove todas as publicações\n` +
          `• *lista* — Lista todas as publicações\n` +
          `• *intervalo <m>* — Define intervalo em minutos\n` +
          `• *status* — Status do grupo\n` +
          `• *test* — Dispara próxima publicação agora\n\n` +
          `💡 Use *${PREFIX}get-id* no grupo alvo para obter o JID`
      );
      return;
    }

    // ── VALIDA JID ───────────────────────────────────────────
    if (!grupoAlvoJid.endsWith("@g.us")) {
      throw new InvalidParameterError(
        `JID inválido: *${grupoAlvoJid}*\n\nUse o JID completo (termina com @g.us)\nEx: *${PREFIX}publi 120363406027458811@g.us add*`
      );
    }

    // ── VERIFICA CADASTRO ────────────────────────────────────
    const db = lerDB();
    if (!db[grupoAlvoJid]) {
      throw new WarningError(
        `Grupo não cadastrado: *${grupoAlvoJid}*\n\nCadastre primeiro:\n*${PREFIX}publi-id add ${grupoAlvoJid}*`
      );
    }

    const grupo = lerGrupo(grupoAlvoJid);

    // ── ATIVAR ───────────────────────────────────────────────
    if (subComando === "1") {
      if (grupo.publicacoes.length === 0) {
        throw new WarningError(
          `Nenhuma publicação cadastrada!\n\nEnvie uma imagem com legenda usando:\n*${PREFIX}publi ${grupoAlvoJid} add*`
        );
      }
      if (grupo.ativo) {
        await sendReply("⚠️ Publicações já estão *ativas* neste grupo.");
        return;
      }
      grupo.ativo = true;
      salvarGrupo(grupoAlvoJid, grupo);
      await sendSuccessReply(
        `✅ *Publicações ativadas!*\n\n` +
          `🪀 ${await getNomeGrupoAlvo(socket, grupoAlvoJid)}\n` +
          `🔗 ${grupoAlvoJid}\n` +
          `📋 ${grupo.publicacoes.length} publicação(ões)\n` +
          `⏱️ Intervalo: ${formatIntervalo(grupo.intervalo)}`
      );
      return;
    }

    // ── DESATIVAR ────────────────────────────────────────────
    if (subComando === "0") {
      if (!grupo.ativo) {
        await sendReply("⚠️ Publicações já estão *desativadas* neste grupo.");
        return;
      }
      grupo.ativo = false;
      salvarGrupo(grupoAlvoJid, grupo);
      await sendSuccessReply(
        `🔴 Publicações *desativadas*.\n🪀 ${await getNomeGrupoAlvo(socket, grupoAlvoJid)}\n🔗 ${grupoAlvoJid}`
      );
      return;
    }

    // ── ADD — imagem com legenda na mesma mensagem ───────────
    if (subComando === "add") {
      const msg = webMessage.message;
      const imagemMsg = msg?.imageMessage;

      if (!imagemMsg) {
        throw new InvalidParameterError(
          `Para adicionar uma publicação, envie a imagem *junto com o comando*.\n\n` +
            `Como fazer:\n` +
            `1. Clique no clipe 📎\n` +
            `2. Selecione a imagem\n` +
            `3. Na legenda da imagem, escreva:\n` +
            `*${PREFIX}publi ${grupoAlvoJid} add*\n\n` +
            `Ou para publicação só texto:\n` +
            `*${PREFIX}publi ${grupoAlvoJid} add-texto Seu texto aqui*`
        );
      }

      const legendaCompleta = imagemMsg.caption || "";
      const legendaLimpa = legendaCompleta
        .replace(new RegExp(`\\${PREFIX}publi\\s+\\S+@g\\.us\\s+add\\s*`, "i"), "")
        .trim();

      if (!legendaLimpa) {
        throw new InvalidParameterError(
          `A legenda da imagem não pode estar vazia — ela é o texto da publicação.\n\nEnvie a imagem com o texto da oferta na legenda.`
        );
      }

      await sendWaitReact();

      try {
        const buffer = await downloadMediaMessage(webMessage, "buffer", {});
        const base64 = buffer.toString("base64");

        const db2 = lerDB();
        if (!db2[grupoAlvoJid].publicacoes) db2[grupoAlvoJid].publicacoes = [];
        db2[grupoAlvoJid].publicacoes.push({
          texto: legendaLimpa,
          imagemBase64: base64,
          mimetype: imagemMsg.mimetype || "image/jpeg",
          criadoEm: new Date().toISOString(),
        });
        salvarDB(db2);

        const total = db2[grupoAlvoJid].publicacoes.length;
        await sendSuccessReact();
        await sendSuccessReply(
          `✅ *Publicação #${total} cadastrada!*\n\n` +
            `🖼️ Com imagem\n` +
            `📝 _${legendaLimpa.substring(0, 100)}${legendaLimpa.length > 100 ? "..." : ""}_\n` +
            `🎯 ${await getNomeGrupoAlvo(socket, grupoAlvoJid)}\n` +
            `🔗 ${grupoAlvoJid}`
        );
      } catch (err) {
        throw new WarningError(`Erro ao salvar imagem: ${err.message}`);
      }
      return;
    }

    // ── ADD-TEXTO ────────────────────────────────────────────
    if (subComando === "add-texto") {
      const texto = partes.slice(2).join(" ").trim();
      if (!texto) {
        throw new InvalidParameterError(
          `Informe o texto da publicação.\nEx: *${PREFIX}publi ${grupoAlvoJid} add-texto Promoção do dia!*`
        );
      }
      const db2 = lerDB();
      if (!db2[grupoAlvoJid].publicacoes) db2[grupoAlvoJid].publicacoes = [];
      db2[grupoAlvoJid].publicacoes.push({
        texto,
        imagemBase64: null,
        criadoEm: new Date().toISOString(),
      });
      salvarDB(db2);
      const total = db2[grupoAlvoJid].publicacoes.length;
      await sendSuccessReply(
        `✅ *Publicação #${total} cadastrada!*\n\n` +
          `📝 _${texto.substring(0, 100)}${texto.length > 100 ? "..." : ""}_\n` +
          `🎯 ${await getNomeGrupoAlvo(socket, grupoAlvoJid)}\n` +
          `🔗 ${grupoAlvoJid}`
      );
      return;
    }

    // ── DEL ──────────────────────────────────────────────────
    if (subComando === "del") {
      const num = parseInt(partes[2]);
      if (isNaN(num) || num < 1 || num > grupo.publicacoes.length) {
        throw new InvalidParameterError(`Número inválido. Use entre 1 e ${grupo.publicacoes.length}.`);
      }
      const removida = grupo.publicacoes.splice(num - 1, 1)[0];
      if (grupo.indice >= grupo.publicacoes.length) grupo.indice = 0;
      salvarGrupo(grupoAlvoJid, grupo);
      await sendSuccessReply(
        `🗑️ Publicação *#${num}* removida!\n\n_"${(removida.texto || "").substring(0, 60)}..."_`
      );
      return;
    }

    // ── REMOVER TODAS ────────────────────────────────────────
    if (subComando === "remover") {
      if (grupo.publicacoes.length === 0) {
        await sendReply("⚠️ Não há publicações para remover.");
        return;
      }
      const total = grupo.publicacoes.length;
      grupo.publicacoes = [];
      grupo.indice = 0;
      grupo.ativo = false;
      grupo.ultimoDisparo = 0;
      salvarGrupo(grupoAlvoJid, grupo);
      await sendSuccessReply(
        `🗑️ *Todas as publicações removidas!*\n\n` +
          `📋 ${total} publicação(ões) deletada(s)\n` +
          `🔴 Sistema desativado automaticamente\n` +
          `🪀 ${await getNomeGrupoAlvo(socket, grupoAlvoJid)}\n` +
          `🔗 ${grupoAlvoJid}`
      );
      return;
    }

    // ── LISTA ────────────────────────────────────────────────
    if (subComando === "lista") {
      if (grupo.publicacoes.length === 0) {
        await sendReply("📋 Nenhuma publicação cadastrada.");
        return;
      }
      const nomeAtual = await getNomeGrupoAlvo(socket, grupoAlvoJid);
      const lista = grupo.publicacoes
        .map((p, i) => {
          const icone = p.imagemBase64 ? "🖼️" : "📝";
          const textoCompleto = p.texto || "(sem texto)";
          const atual = i === grupo.indice ? "\n   ⬆️ *próxima a ser enviada*" : "";
          return `${icone} *Publicação #${i + 1}*${atual}\n${textoCompleto}`;
        })
        .join("\n\n─────────────────────\n\n");

      await sendReply(
        `📋 *Publicações cadastradas*\n` +
          `🪀 *${nomeAtual}*\n` +
          `🔗 ${grupoAlvoJid}\n` +
          `⏱️ Intervalo: ${formatIntervalo(grupo.intervalo)} | Status: ${grupo.ativo ? "🟢 Ativo" : "🔴 Inativo"}\n` +
          `📊 Total: ${grupo.publicacoes.length} publicação(ões)\n\n` +
          `─────────────────────\n\n` +
          `${lista}`
      );
      return;
    }

    // ── INTERVALO ────────────────────────────────────────────
    if (subComando === "intervalo") {
      const minutos = parseInt(partes[2]);
      if (isNaN(minutos) || minutos < 1 || minutos > 1440) {
        throw new InvalidParameterError(
          `Intervalo inválido. Use entre 1 e 1440 minutos (24h).\n\n` +
            `Exemplos:\n` +
            `• *${PREFIX}publi ${grupoAlvoJid} intervalo 15* → a cada 15 min\n` +
            `• *${PREFIX}publi ${grupoAlvoJid} intervalo 30* → a cada 30 min\n` +
            `• *${PREFIX}publi ${grupoAlvoJid} intervalo 60* → a cada 1 hora\n` +
            `• *${PREFIX}publi ${grupoAlvoJid} intervalo 120* → a cada 2 horas`
        );
      }
      grupo.intervalo = minutos;
      salvarGrupo(grupoAlvoJid, grupo);
      await sendSuccessReply(
        `⏱️ Intervalo atualizado para *${formatIntervalo(minutos)}*\n` +
          `🪀 ${await getNomeGrupoAlvo(socket, grupoAlvoJid)}\n` +
          `🔗 ${grupoAlvoJid}`
      );
      return;
    }

    // ── STATUS ───────────────────────────────────────────────
    if (subComando === "status") {
      const proxima = grupo.publicacoes[grupo.indice];
      const previewProxima = proxima ? (proxima.texto || "").substring(0, 80) + "..." : "—";
      await sendReply(
        `📊 *Status das Publicações*\n\n` +
          `🪀 *Grupo:* ${await getNomeGrupoAlvo(socket, grupoAlvoJid)}\n` +
          `🔗 *JID:* ${grupoAlvoJid}\n` +
          `🔘 *Status:* ${grupo.ativo ? "🟢 Ativo" : "🔴 Inativo"}\n` +
          `⏱️ *Intervalo:* ${formatIntervalo(grupo.intervalo)}\n` +
          `📋 *Total:* ${grupo.publicacoes.length} publicação(ões)\n` +
          `🔢 *Próxima:* #${grupo.indice + 1}/${grupo.publicacoes.length}\n\n` +
          `*Preview:*\n_${previewProxima}_`
      );
      return;
    }

    // ── TEST ─────────────────────────────────────────────────
    if (subComando === "test") {
      if (grupo.publicacoes.length === 0) {
        throw new WarningError("Nenhuma publicação cadastrada!");
      }
      await sendWaitReact();
      const { publiScheduler } = await import("../../services/publiScheduler.js");
      publiScheduler.updateSocket(socket);
      await publiScheduler.dispararGrupo(grupoAlvoJid);
      await sendSuccessReact();
      await sendSuccessReply(
        `✅ Publicação disparada!\n🪀 ${await getNomeGrupoAlvo(socket, grupoAlvoJid)}\n🔗 ${grupoAlvoJid}`
      );
      return;
    }

    throw new InvalidParameterError(
      `Subcomando inválido.\nUse: 1, 0, add, add-texto, del, remover, lista, intervalo, status, test`
    );
  },
};
