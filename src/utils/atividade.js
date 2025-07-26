const fs = require("fs");
const path = require("path");

const DATA_PATH = path.join(__dirname, "atividade.json");

if (!fs.existsSync(DATA_PATH)) {
  fs.writeFileSync(DATA_PATH, JSON.stringify({}));
}

function carregarDados() {
  return JSON.parse(fs.readFileSync(DATA_PATH));
}

function salvarDados(dados) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(dados, null, 2));
}

function getMesAtual() {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`; // Ex: 2025-07
}

function registrarMensagem(grupoId, userId, nome) {
  const dados = carregarDados();

  const mesAtual = getMesAtual();

  if (!dados[grupoId]) {
    dados[grupoId] = {
      ultimoReset: mesAtual,
      membros: {},
    };
  }

  // Se mudou o mês, reseta o ranking
  if (dados[grupoId].ultimoReset !== mesAtual) {
    dados[grupoId] = {
      ultimoReset: mesAtual,
      membros: {},
    };
  }

  if (!dados[grupoId].membros[userId]) {
    dados[grupoId].membros[userId] = { nome, mensagens: 0 };
  }

  dados[grupoId].membros[userId].mensagens += 1;
  salvarDados(dados);
}

function getRanking(grupoId, limit = 10) {
  const dados = carregarDados();
  const grupo = dados[grupoId];

  if (!grupo || !grupo.membros) return [];

  return Object.entries(grupo.membros)
    .map(([id, info]) => ({ id, ...info }))
    .sort((a, b) => b.mensagens - a.mensagens)
    .slice(0, limit);
}

module.exports = {
  registrarMensagem,
  getRanking,
};