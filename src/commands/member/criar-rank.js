import { PREFIX } from "../../config.js";
import { InvalidParameterError } from "../../errors/index.js";

function shuffle(array) {
const arr = [...array];

for (let i = arr.length - 1; i > 0; i--) {
const j = Math.floor(Math.random() * (i + 1));

[arr[i], arr[j]] = [arr[j], arr[i]];

}

return arr;
}

function gerarPorcentagem(position) {
const faixas = [
[80, 100],
[60, 79],
[40, 59],
[20, 39],
[1, 19],
];

const [min, max] = faixas[position];

return Math.floor(Math.random() * (max - min + 1)) + min;
}

function gerarCaracteristica(position) {
const lista = [
[
"lenda viva do grupo",
"imbatível nessa categoria",
"o número 1 sem discussão",
"simplesmente o melhor de todos",
"ninguém chega perto",
],
[
"quase chegou lá, mas quase...",
"vice-campeão do grupo",
"deu trabalho pro 1º lugar",
"reserva de luxo",
"menção honrosa garantida",
],
[
"tá no pódio, mas não brilhou",
"medalha de bronze nas mãos",
"deu o seu máximo",
"nem bom nem ruim, é mediano",
"foi por pouco que ficou em 3º",
],
[
"quase no pódio, mas quase",
"o azarão do grupo",
"tentou, mas não foi dessa vez",
"precisava se esforçar mais",
"chegou pertinho do pódio",
],
[
"o lanterna oficial do grupo",
"conquistou o último lugar com maestria",
"difícil ser assim tão... assim",
"o grupo inteiro torcia pra não ganhar",
"último lugar e campeão no coração",
],
];

const opcoes = lista[position];

return opcoes[Math.floor(Math.random() * opcoes.length)];
}

function sortearEmoji(position) {
const emojis = [
["🔥", "⚡", "💯", "🚀", "👑"],
["💥", "✨", "🎯", "💪", "🏆"],
["💢", "🌟", "🎖️", "👏", "🔝"],
["🙊", "😬", "🫠", "😅", "🤏"],
["💀", "🪦", "😵", "🫥", "🗿"],
];

const opcoes = emojis[position];

return opcoes[Math.floor(Math.random() * opcoes.length)];
}

const MEDALHAS = ["🥇", "🥈", "🥉", "🏅", "💀"];

const TITULOS = [
"1º Lugar",
"2º Lugar",
"3º Lugar",
"4º Lugar",
"5º Lugar",
];

export default {
name: "criar-rank",
description: "Cria um rank temático com 5 membros aleatórios do grupo.",
commands: ["criar-rank", "rank"],
usage: "${PREFIX}criar-rank dos mais tagarelas do grupo",

/**

* @param {CommandHandleProps} props
  */
  handle: async ({
  sendReply,
  sendSuccessReact,
  sendWaitReact,
  sendErrorReply,
  fullArgs,
  remoteJid,
  isGroup,
  getGroupParticipants,
  }) => {
  if (!isGroup) {
  throw new InvalidParameterError(
  "Este comando só pode ser usado em grupos!"
  );
  }

const tema = fullArgs?.trim();

if (!tema) {
  throw new InvalidParameterError(
    `Informe o tema do rank!\n\nExemplo:\n${PREFIX}criar-rank dos mais tagarelas`
  );
}

await sendWaitReact();

const participantes =
  await getGroupParticipants(remoteJid);

if (!participantes?.length) {
  return await sendErrorReply(
    "Não foi possível obter os membros do grupo."
  );
}

const jids = participantes
  .map((p) =>
    typeof p === "string"
      ? p
      : p.id || p.jid
  )
  .filter(Boolean);

if (jids.length < 5) {
  return await sendErrorReply(
    "O grupo precisa ter pelo menos 5 membros para usar este comando!"
  );
}

const escolhidos = shuffle(jids).slice(0, 5);

let msg =
  `🏆 *RANK ${tema.toUpperCase()}*\n` +
  `━━━━━━━━━━━━━━━━━━━\n\n`;

escolhidos.forEach((jid, i) => {
  const mencao = `@${jid.split("@")[0]}`;

  msg += `${MEDALHAS[i]} *${TITULOS[i]}* — ${mencao}\n`;
  msg += `📊 ${gerarPorcentagem(i)}% ${sortearEmoji(i)}\n`;
  msg += `💬 _${gerarCaracteristica(i)}_\n\n`;
});

msg += "━━━━━━━━━━━━━━━━━━━\n";
msg += "💚 *By DeadBoT*";

await sendSuccessReact();

await sendReply(msg, escolhidos);

},
};