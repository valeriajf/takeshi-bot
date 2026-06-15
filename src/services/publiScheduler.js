import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, "..", "..", "database", "publi.json");

function lerDB() {
  if (!fs.existsSync(DB_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function salvarDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

let _socketAtual = null;
let _schedulerIniciado = false;

function updateSocket(socket) {
  _socketAtual = socket;
  console.log("[PubliScheduler] 🔄 Socket atualizado após reconexão.");
}

async function dispararGrupo(jid) {
  if (!_socketAtual) throw new Error("Socket não disponível");

  const db = lerDB();
  const grupo = db[jid];
  if (!grupo || !grupo.publicacoes?.length) return;

  const indice = grupo.indice || 0;
  const pub = grupo.publicacoes[indice];

  try {
    if (pub.imagemBase64) {
      const buffer = Buffer.from(pub.imagemBase64, "base64");
      await _socketAtual.sendMessage(jid, {
        image: buffer,
        caption: pub.texto || "",
        mimetype: pub.mimetype || "image/jpeg",
      });
    } else {
      await _socketAtual.sendMessage(jid, { text: pub.texto || "" });
    }

    const db2 = lerDB();
    db2[jid].indice = (indice + 1) % grupo.publicacoes.length;
    db2[jid].ultimoDisparo = Date.now();
    salvarDB(db2);

    console.log(`[PubliScheduler] ✅ ${grupo.nome || jid} | pub #${indice + 1}`);
  } catch (err) {
    console.error(`[PubliScheduler] ❌ Erro em ${jid}:`, err.message);
    throw err;
  }
}

function startPubliScheduler(socket) {
  _socketAtual = socket;

  if (_schedulerIniciado) {
    console.log("[PubliScheduler] ⚠️ Scheduler já rodando, apenas atualizando socket.");
    return;
  }
  _schedulerIniciado = true;
  console.log("[PubliScheduler] 📢 Sistema de Publicações iniciado!");

  setTimeout(() => {
    setInterval(async () => {
      const db = lerDB();
      const agora = Date.now();

      for (const [jid, grupo] of Object.entries(db)) {
        if (!grupo.ativo || !grupo.publicacoes?.length) continue;

        const intervaloMs = (grupo.intervalo || 60) * 60 * 1000;
        const ultimoDisparo = grupo.ultimoDisparo || 0;

        if (agora - ultimoDisparo >= intervaloMs) {
          console.log(`[PubliScheduler] ⏰ Disparando para ${grupo.nome || jid}`);

          let tentativa = 0;
          let sucesso = false;
          while (tentativa < 3 && !sucesso) {
            try {
              await dispararGrupo(jid);
              sucesso = true;
            } catch (err) {
              tentativa++;
              console.warn(`[PubliScheduler] ⚠️ Tentativa ${tentativa}/3: ${err.message}`);
              if (tentativa < 3) await new Promise((r) => setTimeout(r, 10000));
            }
          }

          if (!sucesso) {
            console.error(`[PubliScheduler] ❌ Falhou após 3 tentativas: ${grupo.nome || jid}`);
          }

          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    }, 60 * 1000);
  }, 30000);
}

export const publiScheduler = { updateSocket, dispararGrupo };
export { startPubliScheduler };
