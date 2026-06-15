/**
 * Este script é responsável
 * por carregar os eventos
 * que serão escutados pelo
 * socket do WhatsApp.
 *
 * @author Dev Gui
 */
import { TIMEOUT_IN_MILLISECONDS_BY_EVENT } from "./config.js";
import { onMessagesUpsert } from "./middlewares/onMesssagesUpsert.js";
import { onGroupParticipantsUpdate } from "./middlewares/onGroupParticipantsUpdate.js";
import { badMacHandler } from "./utils/badMacHandler.js";
import { errorLog } from "./utils/logger.js";
import {
  startMensagemDiariaScheduler,
  updateMensagemDiariaSocket,
} from "./services/mensagemDiariaScheduler.js";
import { autoInitSchedules } from "./utils/scheduleAutoInit.js";
import {
  updateApresentacaoSocket,
  recuperarPendentes,
} from "./utils/apresentacao-monitor.js";
import { initX9Monitoring } from "./middlewares/x9Monitoring.js";

// ⭐ Sistema de aluguéis
import { iniciarVerificador } from "./utils/verificadorAluguel.js";
import { iniciarAlertas } from "./utils/alertasAluguel.js";

// 📢 Sistema de publicações automáticas
import {
  startPubliScheduler,
  publiScheduler,
} from "./services/publiScheduler.js";

export function load(socket) {
  const safeEventHandler = async (callback, data, eventName) => {
    try {
      await callback(data);
    } catch (error) {
      if (badMacHandler.handleError(error, eventName)) {
        return;
      }

      errorLog(`Erro ao processar evento ${eventName}: ${error.message}`);

      if (error.stack) {
        errorLog(`Stack trace: ${error.stack}`);
      }
    }
  };

  // 🕵️ Sistema X9 de monitoramento
  initX9Monitoring(socket);

  // ⭐ Verificador de aluguéis expirados (desativa grupo ao vencer)
  iniciarVerificador(socket);

  // ⭐ Alertas de vencimento (D-3, D-2, D-1 às 08:00)
  iniciarAlertas(socket);

  // 💌 Inicia o sistema de mensagem diária automática
  setTimeout(() => {
    startMensagemDiariaScheduler(socket);
    updateMensagemDiariaSocket(socket);
  }, 6000);

  // 🗓️ Inicia os agendamentos automáticos
  setTimeout(() => {
    autoInitSchedules(socket);
  }, 7000);

  // 🎤 Sistema de apresentação
  setTimeout(() => {
    try {
      updateApresentacaoSocket(socket);
      recuperarPendentes();
    } catch (err) {
      errorLog(`[ApresentacaoMonitor] Erro ao inicializar: ${err.message}`);
    }
  }, 8000);

  // 📢 Inicia o sistema de publicações automáticas por grupo
  setTimeout(() => {
    try {
      startPubliScheduler(socket);
      publiScheduler.updateSocket(socket);
    } catch (err) {
      errorLog(`[PubliScheduler] Erro ao inicializar: ${err.message}`);
    }
  }, 9000);

  // ==================================================
  // MENSAGENS
  // ==================================================
  socket.ev.on("messages.upsert", async (data) => {
    const startProcess = Date.now();

    setTimeout(() => {
      safeEventHandler(
        () =>
          onMessagesUpsert({
            socket,
            messages: data.messages,
            startProcess,
          }),
        data,
        "messages.upsert"
      );
    }, TIMEOUT_IN_MILLISECONDS_BY_EVENT);
  });

  // ==================================================
  // ENTRADA / SAÍDA DE MEMBROS
  // ==================================================
  socket.ev.on("group-participants.update", async (data) => {
    try {
      for (const participant of data.participants || []) {
        await onGroupParticipantsUpdate({
          socket,
          remoteJid: data.id,
          data: participant,
          action: data.action,
        });
      }
    } catch (error) {
      errorLog(`[GROUP UPDATE] Erro: ${error?.message || error}`);

      if (error?.stack) {
        errorLog(error.stack);
      }
    }
  });

  process.on("uncaughtException", (error) => {
    if (badMacHandler.handleError(error, "uncaughtException")) {
      return;
    }

    errorLog(`Erro não capturado: ${error.message}`);
  });

  process.on("unhandledRejection", (reason) => {
    if (badMacHandler.handleError(reason, "unhandledRejection")) {
      return;
    }

    errorLog(`Promessa rejeitada não tratada: ${reason}`);
  });
}
