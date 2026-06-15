import { PREFIX } from "../../config.js";
import { onlyNumbers } from "../../utils/index.js";

export default {
name: "chance",
description: "Chance de acontecer alguma coisa em percentual",
commands: ["chance", "chances"],
usage: "${PREFIX}chance de eu ficar rico",

/**

* @param {CommandHandleProps} props
  */
  handle: async ({
  sendReply,
  sendReact,
  fullArgs,
  getGroupParticipants,
  }) => {
  if (!fullArgs || fullArgs.trim() === "") {
  await sendReply(
  "❌ Você precisa informar o que quer calcular!\n\n📌 Exemplo:\n*${PREFIX}chance de eu ficar rico*"
  );
  return;
  }

const number = Math.floor(Math.random() * 101);

const mentionMatches = [...fullArgs.matchAll(/@(\d+)/g)];
const mentions = [];

if (mentionMatches.length) {
  try {
    const participants = await getGroupParticipants();

    for (const match of mentionMatches) {
      const num = match[1];

      const found = participants.find(
        (p) => onlyNumbers(p.id) === num
      );

      if (found) {
        mentions.push(found.id);
      }
    }
  } catch (err) {
    console.warn(
      "[CHANCE] Não foi possível resolver menções:",
      err.message
    );
  }
}

await sendReact("🎲");

const etapas = [
  "📡 Conectando ao multiverso...",
  "🧠 Consultando inteligência artificial duvidosa...",
  "📊 Calculando probabilidades...",
  "🔮 Analisando linhas do tempo...",
  "⚙️ Rodando simulações..."
];

const etapa =
  etapas[Math.floor(Math.random() * etapas.length)];

let comentarios = [];

if (number <= 20) {
  comentarios = [
    "💀 Isso tem menos chance que Wi-Fi funcionar no elevador.",
    "💀 Nem o Doutor Estranho viu esse futuro.",
    "💀 Estatisticamente quase impossível.",
    "💀 Melhor preparar o plano B.",
    "💀 Mais fácil um pinguim abrir empresa."
  ];
} else if (number <= 60) {
  comentarios = [
    "⚠️ Pode acontecer… mas não apostaria dinheiro nisso.",
    "⚠️ O universo ainda está indeciso.",
    "⚠️ Nem impossível, nem garantido.",
    "⚠️ Estatisticamente discutível.",
    "⚠️ Pode dar certo… ou virar história triste."
  ];
} else {
  comentarios = [
    "🔥 Agora estamos falando!",
    "🔥 O universo parece cooperar.",
    "🔥 Estatisticamente promissor.",
    "🔥 Se não acontecer, processa o destino.",
    "🔥 As chances estão do seu lado!"
  ];
}

const comentario =
  comentarios[Math.floor(Math.random() * comentarios.length)];

const resposta =

`🎲 SISTEMA DE PROBABILIDADE

❓ Pergunta analisada:
${fullArgs}

${etapa}

📊 Resultado da simulação

🎯 Probabilidade:
${number}%

💬 Veredito do DeadBoT:
${comentario}`;

await sendReply(
  resposta,
  mentions.length ? mentions : undefined
);

},
};