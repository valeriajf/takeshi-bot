import { addLog, isX9Active, initFiles } from "../commands/admin/x9.js";

initFiles();

const extractNumber = (jid) => {
  if (!jid) return "Desconhecido";
  if (typeof jid === "object") jid = jid.pn || jid.id || jid.lid || jid.jid || "";
  return jid.split("@")[0].split(":")[0];
};

const extractJid = (participant) => {
  if (!participant) return null;
  if (typeof participant === "string") {
    try {
      const parsed = JSON.parse(participant);
      if (parsed.pn) return `${parsed.pn}@s.whatsapp.net`;
      if (parsed.lid) return `${parsed.lid}@lid`;
    } catch {
      return participant.includes("@") ? participant : `${participant}@s.whatsapp.net`;
    }
  }
  if (participant.pn) return `${participant.pn}@s.whatsapp.net`;
  if (participant.phoneNumber) return participant.phoneNumber;
  if (participant.id) return participant.id;
  if (participant.lid) return `${participant.lid}@lid`;
  if (participant.jid) return participant.jid;
  return null;
};

const extractCleanNumber = (participant) => {
  if (!participant) return "Desconhecido";
  if (typeof participant === "string") {
    try {
      const parsed = JSON.parse(participant);
      if (parsed.pn) return parsed.pn;
      if (parsed.lid) return parsed.lid;
    } catch {
      return participant.split("@")[0].split(":")[0];
    }
  }
  if (participant.pn) return participant.pn;
  if (participant.phoneNumber) return participant.phoneNumber.split("@")[0];
  if (participant.id) return participant.id.split("@")[0];
  if (participant.lid) return participant.lid;
  return "Desconhecido";
};

const getGroupName = async (socket, groupJid) => {
  try {
    const groupMetadata = await socket.groupMetadata(groupJid);
    return groupMetadata.subject || "Grupo";
  } catch {
    return "Grupo";
  }
};

const getContactName = (socket, jid) => {
  try {
    const contact = socket.store?.contacts?.[jid];
    if (contact?.name) return contact.name;
    if (contact?.notify) return contact.notify;
    return extractNumber(jid);
  } catch {
    return extractNumber(jid);
  }
};

async function notifyX9Event(socket, remoteJid, userJid, action, author) {
  if (!userJid || !isX9Active(remoteJid)) return;
  try {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const groupName = await getGroupName(socket, remoteJid);
    const userMention = `@${extractNumber(userJid)}`;
    const hasAuthor = author && author !== userJid;
    const authorMention = hasAuthor ? `@${extractNumber(author)}` : null;
    const mentions = [userJid];
    if (hasAuthor) mentions.push(author);
    let message = "";
    switch (action) {
      case "add":
        if (hasAuthor) message = `✅ *MEMBRO ADICIONADO* ✅\n\n🕵️ O admin ${authorMention} acabou de *adicionar* ${userMention} no grupo! 🕵️\n\n🪀 ${groupName}\n\n🕵️ Bem-vindo(a)! 🕵️`;
        break;
      case "promote":
        if (hasAuthor) message = `🌟 *PROMOCAO* 🌟\n\n🕵️ O admin ${authorMention} acabou de *promover* ${userMention} a admin! 🕵️\n\n🪀 ${groupName}\n\n🕵️ Parabens pela promocao! 🕵️`;
        break;
      case "demote":
        if (hasAuthor) message = `😢 *REBAIXAMENTO* 😢\n\n🕵️ O admin ${authorMention} acabou de *rebaixar* ${userMention} de admin! 🕵️\n\n🪀 ${groupName}\n\n🕵️ Perdeu os poderes... 🕵️`;
        break;
      default:
        return;
    }
    if (message) {
      await socket.sendMessage(remoteJid, { text: message, mentions: mentions.filter(Boolean) });
    }
  } catch {
    // silencioso
  }
}

const lidToPhoneNumber = (lid, groupMetadata) => {
  if (!lid || !groupMetadata) return lid;
  if (!lid.includes("@lid")) return lid;
  const p = groupMetadata.participants.find((p) => p.lid === lid || p.id === lid);
  return p?.phoneNumber || lid;
};

const onGroupParticipantsUpdate = (socket) => {
  socket.ev.on("group-participants.update", async (event) => {
    try {
      const { id: groupId, participants, action, author } = event;
      if (!isX9Active(groupId)) return;
      const groupMetadata = await socket.groupMetadata(groupId).catch(() => null);
      if (!groupMetadata) return;
      const groupName = groupMetadata.subject || "Grupo";
      const admins = groupMetadata.participants
        .filter((p) => p.admin === "admin" || p.admin === "superadmin")
        .map((p) => p.id);
      const isAdminAction = author && (admins.includes(author) || action === "promote" || action === "demote");
      if (!author) return;
      const actorName = getContactName(socket, author);

      for (const participantRaw of participants) {
        const participantLid = extractJid(participantRaw);
        const participant = lidToPhoneNumber(participantLid, groupMetadata) || participantLid;
        if (!participant) continue;
        const targetName = getContactName(socket, participant);
        const isSelfAction = author === participant || author === participantLid;

        switch (action) {
          case "add":
            if (isAdminAction) {
              addLog("Adicionar Membro", author, actorName, groupId, groupName, targetName, "Membro adicionado");
              await notifyX9Event(socket, groupId, participant, "add", lidToPhoneNumber(author, groupMetadata) || author);
            }
            break;
          case "remove":
            if (isAdminAction && !isSelfAction) {
              addLog("Remover Membro", author, actorName, groupId, groupName, targetName, "Membro removido");
            }
            break;
          case "promote":
            if (isAdminAction) {
              addLog("Promover a Admin", author, actorName, groupId, groupName, targetName, "Promovido a admin");
              await notifyX9Event(socket, groupId, participant, "promote", lidToPhoneNumber(author, groupMetadata) || author);
            }
            break;
          case "demote":
            if (isAdminAction) {
              addLog("Rebaixar Admin", author, actorName, groupId, groupName, targetName, "Rebaixado de admin");
              await notifyX9Event(socket, groupId, participant, "demote", lidToPhoneNumber(author, groupMetadata) || author);
            }
            break;
        }
      }
    } catch (error) {
      console.error("Erro no X9 (participants):", error);
    }
  });
};

const onGroupUpdate = (socket) => {
  socket.ev.on("groups.update", async (updates) => {
    try {
      for (const update of updates) {
        const { id: groupId, subject, desc, restrict, announce, joinApprovalMode, memberAddMode, author } = update;
        if (!isX9Active(groupId)) continue;
        const groupMetadata = await socket.groupMetadata(groupId).catch(() => null);
        if (!groupMetadata) continue;
        const groupName = subject || groupMetadata.subject || "Grupo";
        if (!author) continue;
        let adminJid = lidToPhoneNumber(author, groupMetadata) || author;
        const actorName = getContactName(socket, adminJid);
        const authorMention = `@${extractNumber(adminJid)}`;

        if (subject !== undefined) {
          addLog("Alterar Nome do Grupo", adminJid, actorName, groupId, groupName, null, `Novo nome: ${subject}`);
          await socket.sendMessage(groupId, { text: `📝 *NOME ALTERADO* 📝\n\n🕵️ O admin ${authorMention} alterou o nome do grupo!\n\n🪀 Novo nome: ${subject}\n\n🕵️ Grupo renomeado! 🕵️`, mentions: [adminJid] }).catch(() => {});
        }
        if (desc !== undefined) {
          addLog("Alterar Descricao do Grupo", adminJid, actorName, groupId, groupName, null, "Descricao alterada");
          await socket.sendMessage(groupId, { text: `📄 *DESCRICAO ALTERADA* 📄\n\n🕵️ O admin ${authorMention} alterou a descricao do grupo!\n\n🪀 ${groupName}\n\n🕵️ Nova descricao definida! 🕵️`, mentions: [adminJid] }).catch(() => {});
        }
        if (restrict !== undefined) {
          const msg = restrict ? "Apenas admins" : "Todos os membros";
          addLog("Alterar Configuracoes", adminJid, actorName, groupId, groupName, null, `Editar info: ${msg}`);
          await socket.sendMessage(groupId, { text: `⚙️ *CONFIGURACAO ALTERADA* ⚙️\n\n🕵️ O admin ${authorMention} alterou as permissoes!\n\n🪀 Editar info: ${msg}\n\n🕵️ Configuracao atualizada! 🕵️`, mentions: [adminJid] }).catch(() => {});
        }
        if (announce !== undefined) {
          const msg = announce ? "Apenas admins" : "Todos os membros";
          addLog("Alterar Configuracoes", adminJid, actorName, groupId, groupName, null, `Enviar mensagens: ${msg}`);
          await socket.sendMessage(groupId, { text: `⚙️ *CONFIGURACAO ALTERADA* ⚙️\n\n🕵️ O admin ${authorMention} alterou as permissoes!\n\n🪀 Enviar mensagens: ${msg}\n\n🕵️ Configuracao atualizada! 🕵️`, mentions: [adminJid] }).catch(() => {});
        }
        if (joinApprovalMode !== undefined) {
          const approvalMsg = joinApprovalMode ? "ATIVOU" : "DESATIVOU";
          const approvalStatus = joinApprovalMode ? "Admins precisam aprovar novos membros" : "Qualquer um pode entrar pelo link";
          addLog("Alterar Configuracoes", adminJid, actorName, groupId, groupName, null, `Aprovacao de membros: ${joinApprovalMode ? "Ativada" : "Desativada"}`);
          await socket.sendMessage(groupId, { text: `⚙️ *CONFIGURACAO ALTERADA* ⚙️\n\n🕵️ O admin ${authorMention} ${approvalMsg} a aprovacao de membros!\n\n🪀 ${approvalStatus}\n\n🕵️ Configuracao atualizada! 🕵️`, mentions: [adminJid] }).catch(() => {});
        }
        if (memberAddMode !== undefined) {
          const msg = memberAddMode ? "Apenas admins" : "Todos os membros";
          addLog("Alterar Configuracoes", adminJid, actorName, groupId, groupName, null, `Adicionar membros: ${msg}`);
          await socket.sendMessage(groupId, { text: `⚙️ *CONFIGURACAO ALTERADA* ⚙️\n\n🕵️ O admin ${authorMention} alterou as permissoes!\n\n🪀 Adicionar membros: ${msg}\n\n🕵️ Configuracao atualizada! 🕵️`, mentions: [adminJid] }).catch(() => {});
        }
      }
    } catch (error) {
      console.error("Erro no X9 (update):", error);
    }
  });
};

const onMessageStubType = (socket) => {
  socket.ev.on("messages.upsert", async ({ messages }) => {
    for (const message of messages) {
      try {
        const { key, messageStubType, messageStubParameters, participant } = message;

        if (!messageStubType || !key.remoteJid || !key.remoteJid.endsWith("@g.us")) continue;
        const groupJid = key.remoteJid;
        if (!isX9Active(groupJid)) continue;
        const groupName = await getGroupName(socket, groupJid);
        const groupMetadata = await socket.groupMetadata(groupJid).catch(() => null);

        switch (messageStubType) {
          case 22: {
            if (!participant) break;
            let adminJid = typeof participant === "string" ? participant : extractJid(participant);
            adminJid = lidToPhoneNumber(adminJid, groupMetadata) || adminJid;
            if (!adminJid) break;
            const actorName = getContactName(socket, adminJid);
            const authorMention = `@${extractNumber(adminJid)}`;
            addLog("Alterar Foto do Grupo", adminJid, actorName, groupJid, groupName, null, "Foto do grupo foi alterada");
            await socket.sendMessage(groupJid, { text: `🖼️ *FOTO ALTERADA* 🖼️\n\n🕵️ O admin ${authorMention} alterou a foto do grupo!\n\n🪀 ${groupName}\n\n🕵️ Nova foto definida! 🕵️`, mentions: [adminJid] }).catch(() => {});
            break;
          }

          case 28: {
            if (!participant || !messageStubParameters?.[0]) break;
            let adminJid = typeof participant === "string" ? participant : extractJid(participant);
            adminJid = lidToPhoneNumber(adminJid, groupMetadata) || adminJid;
            const targetRaw = messageStubParameters[0];
            let targetJid = extractJid(targetRaw);
            targetJid = lidToPhoneNumber(targetJid, groupMetadata) || targetJid;
            const adminName = getContactName(socket, adminJid);
            const targetName = getContactName(socket, targetJid);
            const adminMention = `@${extractNumber(adminJid)}`;
            const targetMention = `@${extractNumber(targetJid)}`;
            addLog("Remover Membro", adminJid, adminName, groupJid, groupName, targetName, "Membro removido do grupo");
            await socket.sendMessage(groupJid, { text: `🚫 *MEMBRO REMOVIDO* 🚫\n\n🕵️ O admin ${adminMention} removeu ${targetMention} do grupo!\n\n🪀 ${groupName}\n\n🕵️ Membro expulso! 🕵️`, mentions: [adminJid, targetJid].filter(Boolean) }).catch(() => {});
            break;
          }

          case 171:
          case 172: {
            if (!messageStubParameters?.[0]) break;
            const acao = messageStubParameters[1];

            if (acao === "created") {
              const solicitanteRaw = messageStubParameters[0];
              
              let mentionJid = null;
              let userNumber = null;
              let userName = null;
              
              if (typeof solicitanteRaw === "object" && solicitanteRaw !== null) {
                if (solicitanteRaw.pn) {
                  mentionJid = solicitanteRaw.pn.includes("@") ? solicitanteRaw.pn : `${solicitanteRaw.pn}@s.whatsapp.net`;
                  userNumber = mentionJid.split("@")[0];
                } else if (solicitanteRaw.lid) {
                  mentionJid = `${solicitanteRaw.lid}@lid`;
                  userNumber = solicitanteRaw.lid.split("@")[0];
                }
              } else if (typeof solicitanteRaw === "string") {
                try {
                  const parsed = JSON.parse(solicitanteRaw);
                  if (parsed.pn) {
                    mentionJid = parsed.pn.includes("@") ? parsed.pn : `${parsed.pn}@s.whatsapp.net`;
                    userNumber = mentionJid.split("@")[0];
                  } else if (parsed.lid) {
                    mentionJid = `${parsed.lid}@lid`;
                    userNumber = parsed.lid.split("@")[0];
                  }
                } catch {
                  mentionJid = solicitanteRaw.includes("@") ? solicitanteRaw : `${solicitanteRaw}@s.whatsapp.net`;
                  userNumber = mentionJid.split("@")[0];
                }
              }
              
              if (!mentionJid || !userNumber) break;
              
              // Tentar pegar o nome do solicitante via lista de pedidos pendentes
              try {
                const pendingList = await socket.groupRequestParticipantsList(groupJid).catch(() => []);
                const pending = pendingList.find(
                  (p) => p.jid === mentionJid || p.jid?.includes(userNumber) || p.phoneNumber === mentionJid
                );
                if (pending?.notify) userName = pending.notify;
                else if (pending?.name) userName = pending.name;
              } catch {
                // silencioso
              }
              
              const displayName = userName || userNumber;
              const horario = new Date(message.messageTimestamp * 1000).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour12: false });
              addLog("Solicitacao de Entrada", mentionJid, displayName, groupJid, groupName, null, `Solicitacao as ${horario}`);
              await socket.sendMessage(groupJid, {
                text: `🔔 *SOLICITACAO DE ENTRADA* 🔔\n\n🕵️ @${userNumber} solicitou entrar no grupo as ${horario}!\n\n🪀 ${groupName}\n\n🕵️ Aguardando aprovacao... 🕵️`,
                mentions: [mentionJid],
              }).catch(() => {});
            } else if (acao === "rejected") {
              const targetRaw = messageStubParameters[0];
              let targetJid = extractJid(targetRaw);
              targetJid = lidToPhoneNumber(targetJid, groupMetadata) || targetJid;
              let adminJid = typeof participant === "string" ? participant : extractJid(participant);
              adminJid = lidToPhoneNumber(adminJid, groupMetadata) || adminJid;
              if (!adminJid) break;
              const adminName = getContactName(socket, adminJid);
              const adminMention = `@${extractNumber(adminJid)}`;
              const targetMention = `@${extractNumber(targetJid)}`;
              addLog("Recusar Entrada", adminJid, adminName, groupJid, groupName, extractNumber(targetJid), "Solicitacao recusada");
              await socket.sendMessage(groupJid, { text: `🚫 *SOLICITACAO RECUSADA* 🚫\n\n🕵️ O admin ${adminMention} recusou a solicitacao de ${targetMention}!\n\n🪀 ${groupName}\n\n🕵️ Entrada negada! 🕵️`, mentions: [adminJid, targetJid].filter(Boolean) }).catch(() => {});
            }
            break;
          }
        }
      } catch (error) {
        console.error("Erro no X9 (messageStubType):", error);
      }
    }
  });
};

export const initX9Monitoring = (socket) => {
  console.log("Iniciando sistema X9 de monitoramento...");
  onGroupParticipantsUpdate(socket);
  onGroupUpdate(socket);
  onMessageStubType(socket);
  console.log("Sistema X9 ativado com sucesso!");
};
