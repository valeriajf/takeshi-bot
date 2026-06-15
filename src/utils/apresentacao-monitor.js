/**
 * Monitor do sistema de apresentação obrigatória
 * Gerencia timers em memória + persistência para sobreviver a reinicializações
 *
 * @author Dev VaL (DeadBoT)
 */
import {
  isAtivo,
  getMinutos,
  addPendente,
  removePendente,
  clearPendentesDoGrupo,
  getPendentes,
} from "./apresentacao-database.js";

// Mapa de timers em memória: chave = `${groupJid}||${prefixo}`
const timers = new Map();

let _socket = null;

// ── SOCKET ─────────────────────────────────────────

export function updateApresentacaoSocket(socket) {
  _socket = socket;
}

// ── TIPOS DE MENSAGEM VÁLIDOS ──────────────────────

const TIPOS_VALIDOS = new Set([
  "conversation",
  "extendedTextMessage",
  "stickerMessage",
  "audioMessage",
  "imageMessage",
  "videoMessage",
  "documentMessage",
  "viewOnceMessage",
  "viewOnceMessageV2",
  "reactionMessage",
  "liveLocationMessage",
  "contactMessage",
  "contactsArrayMessage",
]);

function isMensagemValida(webMessage) {
  if (!webMessage?.message) return false;
  return Object.keys(webMessage.message).some((tipo) => TIPOS_VALIDOS.has(tipo));
}

// ── REMOÇÃO ────────────────────────────────────────

async function removerMembro(groupJid, membroJid, minutos) {
  if (!_socket) return;
  if (!isAtivo(groupJid)) return;

  try {
    const metadata = await _socket.groupMetadata(groupJid);
    const prefixo = membroJid.split(":")[0];

    const participante = metadata.participants.find(
      (p) => p.jid?.startsWith(prefixo) || p.id?.startsWith(prefixo)
    );
    if (!participante) return;

    const jidReal = participante.lid || participante.id;

    await _socket.sendMessage(groupJid, {
      text:
        `🤖 @${jidReal.split("@")[0]} você foi removido(a)\n` +
        `por não se manifestar no prazo estabelecido de ${minutos} minuto(s)!`,
      mentions: [jidReal],
    });

    global.removedByPresentation ??= new Set();

global.removedByPresentation.add(jidReal);

setTimeout(() => {
  global.removedByPresentation.delete(jidReal);
}, 15000);

await _socket.groupParticipantsUpdate(
  groupJid,
  [jidReal],
  "remove"
);
  } catch (err) {
    console.error("[ApresentacaoMonitor] Erro ao remover membro:", err.message);
  }
}

// ── TIMER ──────────────────────────────────────────

function iniciarTimer(chave, groupJid, membroJid, minutos, msRestantes) {
  if (timers.has(chave)) clearTimeout(timers.get(chave));

  const timer = setTimeout(async () => {
    if (!timers.has(chave)) return;
    timers.delete(chave);
    removePendente(chave);
    await removerMembro(groupJid, membroJid, minutos);
  }, msRestantes);

  timers.set(chave, timer);
}

// ── RECUPERAÇÃO AO REINICIAR ───────────────────────

export function recuperarPendentes() {
  const dados = getPendentes();
  const agora = Date.now();
  let expirados = 0;

  for (const [chave, entry] of Object.entries(dados)) {
    const { groupJid, membroJid, entradaTimestamp, minutos } = entry;
    const restante = minutos * 60 * 1000 - (agora - entradaTimestamp);

    if (restante <= 0) {
      expirados++;
      const delay = expirados * 2000;
      setTimeout(async () => {
        removePendente(chave);
        await removerMembro(groupJid, membroJid, minutos);
      }, delay);
    } else {
      iniciarTimer(chave, groupJid, membroJid, minutos, restante);
    }
  }
}

// ── API PÚBLICA ────────────────────────────────────

export async function onMembroEntrou({ groupJid, membroJid }) {
  if (!_socket) return;
  if (!isAtivo(groupJid)) return;

  const minutos = getMinutos(groupJid);
  const prefixo = membroJid.split(":")[0];
  const chave = `${groupJid}||${prefixo}`;
  const entradaTimestamp = Date.now();

  addPendente(chave, { groupJid, membroJid, entradaTimestamp, minutos });
  iniciarTimer(chave, groupJid, membroJid, minutos, minutos * 60 * 1000);
}

export function onMensagemRecebida({ groupJid, autorJid, webMessage }) {
  if (!groupJid || !autorJid) return;
  if (!isAtivo(groupJid)) return;
  if (!isMensagemValida(webMessage)) return;

  const prefixo = autorJid.split(":")[0];
  const chave = `${groupJid}||${prefixo}`;

  if (timers.has(chave)) {
    clearTimeout(timers.get(chave));
    timers.delete(chave);
    removePendente(chave);
  }
}

export function onMembroSaiu({ groupJid, membroJid }) {
  const prefixo = membroJid.split(":")[0];
  const chave = `${groupJid}||${prefixo}`;

  if (timers.has(chave)) {
    clearTimeout(timers.get(chave));
    timers.delete(chave);
    removePendente(chave);
  }
}

export function onSistemaDesativado(groupJid) {
  for (const [chave, timer] of timers.entries()) {
    if (chave.startsWith(`${groupJid}||`)) {
      clearTimeout(timer);
      timers.delete(chave);
    }
  }
  clearPendentesDoGrupo(groupJid);
}

export function getPendentesDoGrupo(groupJid) {
  const dados = getPendentes();
  return Object.entries(dados)
    .filter(([chave]) => chave.startsWith(`${groupJid}||`))
    .map(([, entry]) => entry);
}
