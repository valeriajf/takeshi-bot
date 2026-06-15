/**
 * Sistema de alertas de vencimento de aluguéis
 * Envia 1 alerta por dia: D-3, D-2 e D-1 antes do vencimento
 * Horário fixo: 08:00 (Brasília)
 *
 * @author Dev VaL (DeadBoT)
 * @version 3.0 - ESM
 */

import { listarAlugueis } from "./aluguel.js";

// Chave: "groupId_diasRestantes" → evita reenvio no mesmo dia
const enviados = new Map();

let intervalo = null;

const MSGS = {
  3: (a) =>
    `⚠️ *AVISO DE VENCIMENTO*\n\n` +
    `🪀 *Grupo:* ${a.nomeGrupo}\n` +
    `🔑 *ID do aluguel:* \`\`\`${a.id}\`\`\`\n\n` +
    `📅 Seu aluguel vence em *3 dias*!\n` +
    `🗓️ *Vencimento:* ${a.expira}\n\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `🔄 Entre em contato com o dono do bot para renovar e garantir a continuidade do serviço.`,

  2: (a) =>
    `⚠️ *AVISO DE VENCIMENTO*\n\n` +
    `🪀 *Grupo:* ${a.nomeGrupo}\n` +
    `🔑 *ID do aluguel:* \`\`\`${a.id}\`\`\`\n\n` +
    `📅 Seu aluguel vence em *2 dias*!\n` +
    `🗓️ *Vencimento:* ${a.expira}\n\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `🔄 Renove agora para evitar a desativação automática do bot.`,

  1: (a) =>
    `🚨 *ÚLTIMO AVISO DE VENCIMENTO*\n\n` +
    `🪀 *Grupo:* ${a.nomeGrupo}\n` +
    `🔑 *ID do aluguel:* \`\`\`${a.id}\`\`\`\n\n` +
    `📅 Seu aluguel vence *AMANHÃ*!\n` +
    `🗓️ *Vencimento:* ${a.expira}\n\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `🚨 O bot será desativado automaticamente no vencimento.\n` +
    `Entre em contato com o dono do bot *URGENTE* para renovar!`,
};

async function processar(socket) {
  try {
    const agora     = new Date();
    const hora      = agora.getHours();
    const minuto    = agora.getMinutes();

    // Só processa às 08:00 (primeiros 5 minutos)
    if (hora !== 8 || minuto > 5) return;

    const alugueis = listarAlugueis();
    const hoje     = agora.toISOString().split("T")[0];

    for (const groupId in alugueis) {
      const a    = alugueis[groupId];
      const diff = a.expiraTimestamp - Date.now();

      // Calcula dias restantes (arredondado para cima)
      const diasRestantes = Math.ceil(diff / 86400000);

      // Só envia para D-3, D-2 e D-1
      if (![1, 2, 3].includes(diasRestantes)) continue;

      const chave = `${groupId}_${hoje}_D${diasRestantes}`;
      if (enviados.has(chave)) continue;

      const msgFn = MSGS[diasRestantes];
      if (!msgFn) continue;

      try {
        await socket.sendMessage(groupId, { text: msgFn(a) });
        enviados.set(chave, Date.now());
      } catch (_) {}

      // Aguarda 2s entre alertas
      await new Promise((r) => setTimeout(r, 2000));
    }

    // Limpa entradas com mais de 7 dias
    const seteDias = 7 * 86400000;
    for (const [k, ts] of enviados) {
      if (Date.now() - ts > seteDias) enviados.delete(k);
    }
  } catch (_) {}
}

export function iniciarAlertas(socket) {
  if (intervalo) return;
  intervalo = setInterval(() => processar(socket), 60000);
  processar(socket);
}

export function pararAlertas() {
  if (intervalo) {
    clearInterval(intervalo);
    intervalo = null;
  }
}
