/**
 * INSTALAÇÃO: src/utils/scheduleAutoInit.js
 * Chame autoInitSchedules(socket) no loader.js após conectar
 */
import { initAbrirSchedules } from "../commands/admin/grupo-abrir.js";
import { initFecharSchedules } from "../commands/admin/grupo-fechar.js";

export function autoInitSchedules(socket) {
  console.log("🔄 Inicializando agendamentos automáticos...");
  initAbrirSchedules(socket);
  initFecharSchedules(socket);
  console.log("✅ Agendamentos carregados!\n");
}
