/**
 * Verificador automático de aluguéis expirados
 * Roda a cada 1 minuto — desativa grupo e notifica ao vencer
 *
 * @author Dev VaL (DeadBoT)
 * @version 3.0 - ESM
 */

import { verificarExpirados } from "./aluguel.js";
import { deactivateGroup }    from "./database.js";

let intervalo        = null;
const notificados    = new Set();

export function iniciarVerificador(socket) {
  if (intervalo) return;

  intervalo = setInterval(async () => {
    try {
      const expirados = verificarExpirados();

      for (const aluguel of expirados) {
        if (notificados.has(aluguel.groupId)) continue;

        try {
          deactivateGroup(aluguel.groupId);

          await socket.sendMessage(aluguel.groupId, {
            text:
              `⏰ *Aluguel Expirado!*\n\n` +
              `O período de aluguel deste grupo chegou ao fim.\n\n` +
              `🔑 *ID do aluguel:* \`\`\`${aluguel.id}\`\`\`\n` +
              `📅 *Expirou em:* ${aluguel.expira}\n\n` +
              `🤖 O bot foi desativado neste grupo.\n\n` +
              `Para renovar, entre em contato com o dono do bot.\n\n` +
              `💤 Entrando em modo OFF...`,
          });

          notificados.add(aluguel.groupId);
        } catch (_) {
          notificados.add(aluguel.groupId);
        }
      }
    } catch (_) {}
  }, 60000);
}

export function pararVerificador() {
  if (intervalo) {
    clearInterval(intervalo);
    intervalo = null;
  }
}
