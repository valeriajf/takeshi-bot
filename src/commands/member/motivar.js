/**
 * Comando motivar - DeadBoT 😏
 * Envia frases motivacionais (ou nem tanto)
 *
 * PASTA: src/commands/member/
 *
 * @author VaL
 */

import fs from "node:fs";
import path from "node:path";
import { PREFIX } from "../../config.js";

const DB_PATH = path.resolve("database/motivar.json");

export default {
  name: "motivar",
  description: "Envia uma frase motivacional (modo DeadBoT 😏)",
  commands: ["motivar", "motivacional", "inspirar"],
  usage: `${PREFIX}motivar`,

  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    sendReply,
    sendSuccessReact,
    sendErrorReply,
    remoteJid,
  }) => {
    try {
      const frases = [
        "O segredo do sucesso? Relaxa… você provavelmente não vai descobrir 🤡",
        "A vida é uma montanha-russa… e você entrou sem cinto, boa sorte 🎢",
        "O NÃO você já tem… agora vá atrás da humilhação com confiança 💪",
        "Se tá difícil hoje, calma… amanhã pode piorar 📉",
        "Insista, persista… e quando cansar, finja que foi estratégia 😎",
        "Tem luz no fim do túnel… só torce pra não ser um trem 🚂",
        "Se a vida te der limões… aceite, porque açúcar tá caro 🍋",
        "O importante é competir… perder é só um detalhe 😌",
        "Nunca é tarde pra desistir… mas você insistiu até aqui, né 🤷",
        "O tempo muda tudo… menos suas decisões duvidosas ⏳",
        "Trabalhando duro ou só existindo com estilo? Difícil dizer 😴",
        "Tudo passa… inclusive você sendo atropelado pelos problemas 🚶",
        "Falhou hoje? Relaxa, amanhã tem mais tentativa 🎯",
        "Sorria… confunde até o azar 😁",
        "Nunca foi azar… foi só talento ao contrário 🎲",
      ];

      // Cria o banco caso não exista
      if (!fs.existsSync(DB_PATH)) {
        fs.mkdirSync(path.dirname(DB_PATH), {
          recursive: true,
        });

        fs.writeFileSync(
          DB_PATH,
          JSON.stringify({}, null, 2),
          "utf-8"
        );
      }

      const db = JSON.parse(
        fs.readFileSync(DB_PATH, "utf-8")
      );

      // Cria estrutura do grupo
      if (!db[remoteJid]) {
        db[remoteJid] = {
          indice: 0,
          ordem: [],
        };
      }

      const grupo = db[remoteJid];

      // Gera nova ordem aleatória quando acabar
      if (!grupo.ordem || grupo.ordem.length === 0) {
        grupo.ordem = [...Array(frases.length).keys()]
          .sort(() => Math.random() - 0.5);

        grupo.indice = 0;
      }

      // Seleciona frase
      const indexFrase = grupo.ordem[grupo.indice];
      const frase = frases[indexFrase];

      // Avança índice
      grupo.indice++;

      // Reinicia quando terminar todas
      if (grupo.indice >= grupo.ordem.length) {
        grupo.ordem = [];
        grupo.indice = 0;
      }

      // Salva banco
      fs.writeFileSync(
        DB_PATH,
        JSON.stringify(db, null, 2),
        "utf-8"
      );

      await sendSuccessReact();

      await sendReply(
`╭━━━〔 😏 MOTIVAÇÃO DEADBOT 〕━━━⬣

💭 ${frase}

╰━━━━━━━━━━━━━━━━━━⬣
⚡ ${PREFIX}motivar • mais uma`
      );
    } catch (error) {
      console.error(
        "[MOTIVAR] Erro ao enviar frase:",
        error
      );

      await sendErrorReply(
`╭━━━〔 ❌ ERRO 〕━━━⬣

Deu ruim até pra motivar… tenta de novo.

╰━━━━━━━━━━━━⬣`
      );
    }
  },
};