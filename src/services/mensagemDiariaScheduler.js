/**
 * src/services/mensagemDiariaScheduler.js
 *
 * Serviço de agendamento de mensagem diária automática.
 * Envia mensagem todo dia às 06:00h (Brasília) para grupos ativos.
 *
 * @author DeadBoT
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.resolve(__dirname, "..", "..", "database", "mensagem-diaria.json");

function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({}));
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  } catch {
    return {};
  }
}

// ============================================================
// 📅 FERIADOS NACIONAIS E PONTOS FACULTATIVOS BRASIL 2026
// Fonte: Portaria MGI nº 11.460/2025 (gov.br)
// ============================================================
const FERIADOS_2026 = {
  "01-01": {
    nome: "🎉 Confraternização Universal — Ano-Novo",
    tipo: "feriado",
    felicitacao: "🥳 *Feliz Ano Novo!* Que 2026 seja repleto de alegrias, saúde e realizações para todos vocês! 🎆",
  },
  "16-02": {
    nome: "🎭 Segunda-feira de Carnaval",
    tipo: "ponto_facultativo",
    felicitacao: "🎊 *Bom Carnaval!* Curta com alegria e muita segurança! 🥁",
  },
  "17-02": {
    nome: "🎭 Terça-feira de Carnaval",
    tipo: "ponto_facultativo",
    felicitacao: "🎊 *Bom Carnaval!* O último dia da folia — aproveite! 🎉",
  },
  "18-02": {
    nome: "⛪ Quarta-feira de Cinzas",
    tipo: "ponto_facultativo",
    felicitacao: null,
  },
  "03-04": {
    nome: "✝️ Paixão de Cristo — Sexta-feira Santa",
    tipo: "feriado",
    felicitacao: "🙏 Um dia de reflexão e fé. Boa Semana Santa a todos! ✝️",
  },
  "20-04": {
    nome: "📅 Ponto Facultativo",
    tipo: "ponto_facultativo",
    felicitacao: null,
  },
  "21-04": {
    nome: "⚔️ Tiradentes",
    tipo: "feriado",
    felicitacao: "🇧🇷 Homenagem a Joaquim José da Silva Xavier, mártir da liberdade brasileira!",
  },
  "01-05": {
    nome: "👷 Dia Mundial do Trabalho",
    tipo: "feriado",
    felicitacao: "💪 *Feliz Dia do Trabalho!* Esta data é de vocês, trabalhadores que constroem o Brasil todos os dias! 🛠️",
  },
  "04-06": {
    nome: "🌹 Corpus Christi",
    tipo: "ponto_facultativo",
    felicitacao: "🙏 Corpus Christi — um dia de fé e gratidão para os cristãos! ✨",
  },
  "05-06": {
    nome: "📅 Ponto Facultativo",
    tipo: "ponto_facultativo",
    felicitacao: null,
  },
  "07-09": {
    nome: "🇧🇷 Independência do Brasil",
    tipo: "feriado",
    felicitacao: "🎺 *Feliz Dia da Independência!* 204 anos de um Brasil livre e soberano! 🇧🇷",
  },
  "12-10": {
    nome: "🙏 Nossa Senhora Aparecida — Padroeira do Brasil",
    tipo: "feriado",
    felicitacao: "💙 *Feliz dia de Nossa Senhora Aparecida!* Que a Padroeira do Brasil abençoe a todos! 🕊️",
  },
  "28-10": {
    nome: "🖊️ Dia do Servidor Público Federal",
    tipo: "ponto_facultativo",
    felicitacao: "👏 Homenagem a todos os servidores públicos que dedicam seu trabalho ao bem comum!",
  },
  "02-11": {
    nome: "🕯️ Dia de Finados",
    tipo: "feriado",
    felicitacao: "🕊️ Um dia de memória e saudade de quem já se foi. Que as lembranças boas aqueçam os corações.",
  },
  "15-11": {
    nome: "🏛️ Proclamação da República",
    tipo: "feriado",
    felicitacao: "🇧🇷 *Viva a República!* Celebramos hoje a forma de governo que rege o nosso Brasil! 🏛️",
  },
  "20-11": {
    nome: "✊ Dia Nacional de Zumbi e da Consciência Negra",
    tipo: "feriado",
    felicitacao: "✊🏿 *Feliz Dia da Consciência Negra!* Celebramos a resistência, a cultura e a história do povo negro que é a alma do Brasil! 🖤💛",
  },
  "24-12": {
    nome: "🎄 Véspera de Natal",
    tipo: "ponto_facultativo",
    felicitacao: "🎅 *Feliz Natal!* Que esta noite tão especial traga paz, amor e muita alegria para toda a família! 🌟",
  },
  "25-12": {
    nome: "🎄 Natal",
    tipo: "feriado",
    felicitacao: "🎅 *Feliz Natal!* Que o espírito natalino envolva a todos com amor, paz e esperança! ⭐",
  },
  "31-12": {
    nome: "🎆 Véspera de Ano-Novo",
    tipo: "ponto_facultativo",
    felicitacao: "🥂 *Feliz Réveillon!* Que a virada traga renovação, sorte e muitas conquistas em 2027! 🎇",
  },
};

// ============================================================
// 🌙 FASES DA LUA 2026
// ============================================================
const FASES_LUA = [
  { data: "2026-01-03", fase: "🌕 Cheia" },
  { data: "2026-01-10", fase: "🌗 Minguante" },
  { data: "2026-01-18", fase: "🌑 Nova" },
  { data: "2026-01-26", fase: "🌓 Crescente" },
  { data: "2026-02-01", fase: "🌕 Cheia" },
  { data: "2026-02-09", fase: "🌗 Minguante" },
  { data: "2026-02-17", fase: "🌑 Nova" },
  { data: "2026-02-24", fase: "🌓 Crescente" },
  { data: "2026-03-03", fase: "🌕 Cheia" },
  { data: "2026-03-11", fase: "🌗 Minguante" },
  { data: "2026-03-18", fase: "🌑 Nova" },
  { data: "2026-03-25", fase: "🌓 Crescente" },
  { data: "2026-04-01", fase: "🌕 Cheia" },
  { data: "2026-04-10", fase: "🌗 Minguante" },
  { data: "2026-04-17", fase: "🌑 Nova" },
  { data: "2026-04-23", fase: "🌓 Crescente" },
  { data: "2026-05-01", fase: "🌕 Cheia" },
  { data: "2026-05-09", fase: "🌗 Minguante" },
  { data: "2026-05-16", fase: "🌑 Nova" },
  { data: "2026-05-23", fase: "🌓 Crescente" },
  { data: "2026-05-31", fase: "🌕 Cheia" },
  { data: "2026-06-08", fase: "🌗 Minguante" },
  { data: "2026-06-14", fase: "🌑 Nova" },
  { data: "2026-06-21", fase: "🌓 Crescente" },
  { data: "2026-06-29", fase: "🌕 Cheia" },
  { data: "2026-07-07", fase: "🌗 Minguante" },
  { data: "2026-07-14", fase: "🌑 Nova" },
  { data: "2026-07-21", fase: "🌓 Crescente" },
  { data: "2026-07-29", fase: "🌕 Cheia" },
  { data: "2026-08-05", fase: "🌗 Minguante" },
  { data: "2026-08-12", fase: "🌑 Nova" },
  { data: "2026-08-19", fase: "🌓 Crescente" },
  { data: "2026-08-28", fase: "🌕 Cheia" },
  { data: "2026-09-04", fase: "🌗 Minguante" },
  { data: "2026-09-11", fase: "🌑 Nova" },
  { data: "2026-09-18", fase: "🌓 Crescente" },
  { data: "2026-09-26", fase: "🌕 Cheia" },
  { data: "2026-10-03", fase: "🌗 Minguante" },
  { data: "2026-10-10", fase: "🌑 Nova" },
  { data: "2026-10-18", fase: "🌓 Crescente" },
  { data: "2026-10-26", fase: "🌕 Cheia" },
  { data: "2026-11-01", fase: "🌗 Minguante" },
  { data: "2026-11-09", fase: "🌑 Nova" },
  { data: "2026-11-17", fase: "🌓 Crescente" },
  { data: "2026-11-24", fase: "🌕 Cheia" },
  { data: "2026-12-01", fase: "🌗 Minguante" },
  { data: "2026-12-08", fase: "🌑 Nova" },
  { data: "2026-12-17", fase: "🌓 Crescente" },
  { data: "2026-12-23", fase: "🌕 Cheia" },
  { data: "2026-12-30", fase: "🌗 Minguante" },
];

function getFaseLua(dataStr) {
  const hoje = new Date(dataStr);
  let faseAtual = "🌑 Nova";
  let menorDiff = Infinity;
  for (const entry of FASES_LUA) {
    const d = new Date(entry.data);
    const diff = hoje - d;
    if (diff >= 0 && diff < menorDiff) {
      menorDiff = diff;
      faseAtual = entry.fase;
    }
  }
  return faseAtual;
}

// ============================================================
// 📖 SABEDORIAS DO DIA (365)
// ============================================================
const MENSAGENS_365 = [
  "Não critique! Procure antes colaborar com todos. A crítica fere, mas o exemplo transforma. 🌱",
  "Você jamais está abandonado. Mesmo nas trevas, a pequena chama da fé ilumina o caminho. 🕯️",
  "Colheremos o que houvermos semeado. Plante sementes de otimismo e amor hoje. 🌻",
  "Não se deixe perturbar pela calúnia. Viva de tal forma que o caluniador nunca tenha razão. 💪",
  "A solução dos seus problemas está dentro de você. Ouça a voz da sua consciência. 🧘",
  "Quem semeia bondade colhe gratidão. Seja gentil, mesmo quando não é fácil. 🌸",
  "A paciência é a chave que abre todas as portas. Não desista antes da hora certa. ⏳",
  "Cada amanhecer é uma nova oportunidade de recomeçar. Aproveite-a com gratidão. 🌅",
  "A maior vitória é vencer a si mesmo. Supere seus próprios limites hoje. 🏆",
  "O silêncio às vezes é a resposta mais sábia. Nem tudo precisa ser dito. 🤫",
  "Quem ajuda o próximo, ajuda a si mesmo. A generosidade sempre volta multiplicada. 🙏",
  "A alegria que compartilhamos dobra; a dor que dividimos diminui. Compartilhe tudo! 💛",
  "Não existe caminho para a felicidade — a felicidade é o caminho. 😊",
  "A humildade é a raiz de todas as virtudes. Quem se abaixa nunca cai. 🌿",
  "Cada obstáculo superado é uma prova de que você é mais forte do que imagina. 💥",
  "A gratidão transforma o que temos em suficiente. Conte suas bênçãos hoje. ✨",
  "Faça o bem sem olhar a quem. O universo registra cada gesto de bondade. 🌟",
  "A esperança é o combustível da alma. Nunca deixe sua chama apagar. 🔥",
  "Sorrir custa nada e vale muito. Espalhe sorrisos pelo mundo hoje. 😄",
  "A fé move montanhas, mas também muda corações. Acredite sempre. ⛰️",
  "O perdão não é fraqueza — é a força dos verdadeiramente grandes. 🕊️",
  "Aprenda com o passado, viva o presente, construa o futuro. Esse é o segredo. ⏰",
  "A amizade verdadeira é um tesouro que não tem preço. Cuide dos seus amigos. 👫",
  "Pequenos atos de amor constroem grandes histórias. Comece hoje. ❤️",
  "O otimismo é uma escolha diária. Escolha ver o lado bom das coisas. 🌈",
  "Ninguém é tão rico que não precise de ajuda, nem tão pobre que não possa oferecer. 🤝",
  "A sabedoria começa quando reconhecemos o que não sabemos. Aprenda sempre. 📚",
  "Cada dia é um presente. Por isso se chama presente. Viva-o plenamente! 🎁",
  "A persistência realiza o impossível. Continue tentando. 🚀",
  "Seja a mudança que deseja ver no mundo. Comece por você mesmo. 🌍",
  "A paz começa dentro de você. Cuide do seu interior hoje. ☮️",
  "Quem planta amizade colhe felicidade. Regue suas relações com carinho. 🌺",
  "O amor é a força mais poderosa do universo. Use-o sem moderação. 💕",
  "Cada sorriso que você dá volta para você multiplicado. Sorria sempre! 😊",
  "A coragem não é ausência de medo, mas a decisão de que algo é mais importante que o medo. 🦁",
  "Viva um dia de cada vez. O suficiente para hoje já é muito. 🌤️",
  "A bondade é o idioma que surdos podem ouvir e cegos podem ver. 👁️",
  "Quem tem fé nunca caminha sozinho. Confie no processo da vida. 🙌",
  "O maior presente que podemos dar a alguém é nossa atenção genuína. Escute mais. 👂",
  "A vida é muito curta para guardar rancores. Perdoe e siga em frente. 🕊️",
  "Cada pessoa que passa em nossa vida deixa uma marca. Seja uma marca positiva. ✍️",
  "A simplicidade é o requinte máximo. Valorize as coisas simples. 🍃",
  "Onde há amor, há vida. Onde há vida, há esperança. Onde há esperança, há tudo. 💚",
  "Não compare sua jornada com a dos outros. Cada um tem seu tempo. 🛤️",
  "A música da vida é feita de silêncios e sons. Aprecie cada momento. 🎵",
  "Seja grato pelo que tem enquanto trabalha pelo que quer. Equilíbrio perfeito. ⚖️",
  "A gentileza é uma linguagem que qualquer pessoa pode falar. Fale mais. 💬",
  "O maior investimento que você pode fazer é em si mesmo. Cresça sempre. 📈",
  "Acredite no seu potencial mesmo quando mais ninguém acreditar. Você consegue! 💪",
  "A vida te dá o que você está pronto para receber. Prepare-se para o melhor. 🎯",
  "Cada erro é uma lição disfarçada. Aprenda e siga em frente. 📖",
  "A compaixão é o coração da humanidade. Pratique-a diariamente. ❤️",
  "Quem ri junto, fica junto. Cultive alegria nas suas relações. 😂",
  "A determinação é o motor que move os sonhos. Ligue o seu. 🔑",
  "Seja luz onde há escuridão. O mundo precisa de você. 💡",
  "A vida é uma dança entre controle e entrega. Aprenda os dois passos. 💃",
  "Nenhum gesto de carinho é desperdiçado. Continue sendo carinhoso. 🤗",
  "O respeito é a base de toda relação saudável. Respeite-se e respeite os outros. 🌿",
  "A força interior é sua maior riqueza. Ninguém pode tirar isso de você. 💎",
  "Cada novo dia é uma página em branco. Escreva algo bonito. 📝",
  "A confiança é construída aos poucos e pode ser perdida num segundo. Cuide dela. 🔐",
  "Quem semeia alegria colhe felicidade. Seja alegre hoje. 🌻",
  "A vida tem um sabor único para quem aprende a apreciá-la. Saboreie cada momento. 🍯",
  "O carinho é o remédio mais poderoso que existe. Cuide de quem você ama. 💊",
  "Não espere a tempestade passar — aprenda a dançar na chuva. ☔",
  "A paz de espírito vale mais que qualquer riqueza material. Busque-a. 🧘",
  "Seja autêntico. O mundo tem muitas cópias, mas precisa de originais. 🎨",
  "A gratidão abre as portas de novas bênçãos. Seja grato sempre. 🚪",
  "Quem compartilha conhecimento multiplica riqueza. Ensine o que sabe. 🎓",
  "A paciência é amarga, mas seus frutos são doces. Aguarde com esperança. 🍎",
  "O amor incondicional é o mais puro que existe. Ame sem condições. 💝",
  "Cada amanhecer traz consigo a promessa de um recomeço. Aproveite! 🌄",
  "A verdade tem o poder de libertar. Seja honesto consigo e com os outros. 🔓",
  "Quem cuida dos outros aprende a se cuidar. Seja solidário. 🤲",
  "A alegria de viver está nas pequenas coisas. Preste atenção nelas. 🔍",
  "Nenhum sonho é grande demais para quem tem fé e determinação. Sonhe alto! ⭐",
  "A mente tranquila é o maior luxo do século. Busque sua paz interior. 🧠",
  "O amor que damos sempre volta. Nunca pare de amar. 💗",
  "A vida é feita de escolhas. Escolha sempre o amor, a paz e a gratidão. 🌈",
  "Cada vitória começa com a decisão de tentar. Tente sempre. 🏁",
  "A bondade é contagiosa. Espalhe-a por onde passar. 😇",
  "Quem vive com propósito encontra força até nos dias difíceis. Qual é o seu? 🎯",
  "A beleza da vida está em sua imprevisibilidade. Surpreenda-se! 🎲",
  "O silêncio interior é onde a sabedoria mora. Encontre o seu. 🌙",
  "Seja o motivo do sorriso de alguém hoje. Isso não tem preço. 😄",
  "A disciplina é a ponte entre sonhos e realizações. Cruce-a. 🌉",
  "Quem respeita o próximo merece respeito. Seja o exemplo. 🌟",
  "A leveza do ser é conquistada quando paramos de carregar o que não é nosso. 🪶",
  "Cada pessoa é um universo inteiro. Trate todos com reverência. 🌌",
  "A fé sem obras é morta. Coloque amor em tudo que fizer. ✝️",
  "O otimismo é uma vacina contra a tristeza. Tome sua dose diária. 💉",
  "Quem planta hoje colhe amanhã. Invista no futuro com ações de hoje. 🌱",
  "A criatividade é a inteligência se divertindo. Seja criativo! 🎨",
  "O maior ato de coragem é ser exatamente quem você é. Seja autêntico. 🦋",
  "A companhia certa eleva, a errada derruba. Escolha bem suas amizades. 🤝",
  "Cada lágrima regou um aprendizado. Suas dores têm sentido. 💧",
  "A esperança é a última que morre — e às vezes é o que salva. Nunca perca a sua. 🌟",
  "O cuidado com pequenos detalhes revela grandeza de caráter. Cuide dos detalhes. 🔎",
  "Quem ama verdadeiramente não coloca condições. Ame de coração aberto. 💓",
  "A vida mais rica é a que tem mais experiências, não mais posses. Viva intensamente. 🌍",
  "Seja resiliente como o bambu: curva mas não quebra. 🎋",
  "A gratidão transforma dias comuns em graças. Seja grato hoje. 🙏",
  "Quem confia no processo não se desespera com o resultado. Confie. ⚓",
  "A paz que excede todo entendimento começa com uma mente quieta. Acalme-se. 🕊️",
  "Cada ser humano tem algo a nos ensinar. Esteja aberto para aprender. 👂",
  "O amor é a resposta — não importa qual seja a pergunta. Ame mais. 💕",
  "A vida flui melhor quando a deixamos fluir. Solte o que não pode controlar. 🌊",
  "Quem semeia palavras boas colhe relacionamentos saudáveis. Fale com cuidado. 🗣️",
  "A força está em reconhecer as próprias fraquezas. Conheça-se. 🪞",
  "Cada dia sem gratidão é um dia desperdiçado. Seja grato agora. ✨",
  "O bem que fazemos em silêncio é ouvido pelo universo. Faça o bem sempre. 🌙",
  "A vida é uma escola onde o recreio também ensina. Aproveite cada momento. 🏫",
  "Quem tem paz no coração irradia luz ao redor. Cuide da sua paz. ☀️",
  "A generosidade não empobrece — multiplica. Dê sem medo. 🎁",
  "Seja como o sol: ilumine todos, sem favorecer ninguém. ☀️",
  "A paciência com os outros começa com a paciência consigo mesmo. Seja gentil com você. 🌸",
  "Quem semeia respeito colhe dignidade. Respeite para ser respeitado. 🌿",
  "A mente que se abre para uma nova ideia jamais volta ao tamanho original. Expanda-se. 🧠",
  "Cada momento de bondade é eterno no coração de quem recebeu. Seja bondoso. 💛",
  "A confiança é construída com consistência. Seja consistente. 🔨",
  "Quem vive no presente não teme o futuro nem lamenta o passado. Viva agora. ⏰",
  "A alegria genuína contagia mais rápido que qualquer tristeza. Seja alegre! 🌞",
  "O caminho mais longo começa com um único passo. Dê o primeiro passo hoje. 👣",
  "A simplicidade é a sofisticação máxima. Simplifique sua vida. 🍃",
  "Quem cuida das palavras cuida das relações. Pense antes de falar. 💬",
  "A fé não elimina os problemas, mas dá força para enfrentá-los. Tenha fé. 🙏",
  "Cada pessoa que entra em sua vida traz uma lição. Aprenda com todos. 📚",
  "O amor próprio é a fundação de todo amor ao próximo. Ame-se primeiro. 💝",
  "A vida tem um ritmo próprio. Pare de lutar contra ele e dance junto. 💃",
  "Quem planta árvores sabe que não vai sentar à sua sombra. Pense no legado. 🌳",
  "A esperança é o sol que ilumina cada amanhecer. Acorde com esperança. 🌅",
  "Seja a versão de você que a criança que você foi teria admirado. 🧒",
  "A humildade não é se achar menos — é não se comparar. Seja humilde. 🌾",
  "Quem controla o próprio pensamento controla o próprio destino. Pense bem. 💭",
  "A vida é mais bonita quando vivida com propósito. Encontre o seu. 🎯",
  "Cada palavra de incentivo pode mudar uma vida. Incentive alguém hoje. 🌟",
  "O presente é o único tempo que realmente existe. Viva-o plenamente. ⌚",
  "A coragem de ser imperfeito é a maior libertação. Seja real. 🦋",
  "Quem perdoa liberta dois: quem errou e quem foi ferido. Perdoe. 🕊️",
  "A sabedoria popular tem uma razão de existir. Ouça os mais velhos. 👴",
  "Cada semente de bondade que você planta hoje florescerá no tempo certo. 🌺",
  "O amor é a única força que quanto mais se divide, mais aumenta. Ame muito. ❤️",
  "A vida não é sobre encontrar a si mesmo — é sobre criar a si mesmo. Construa-se. 🏗️",
  "Quem age com integridade dorme tranquilo. Seja íntegro. 😴",
  "A música, a dança e o riso são medicamentos da alma. Use-os. 🎶",
  "Cada dia é um capítulo novo. Escreva um bonito hoje. 📖",
  "O equilíbrio é a arte de saber quando avançar e quando recuar. Equilibre-se. ⚖️",
  "Quem compartilha alegria não a perde — a dobra. Compartilhe! 😄",
  "A beleza do mundo está nos detalhes que a maioria não para para ver. Veja. 👀",
  "Seja firme em seus valores, mas flexível em seus métodos. 🌊",
  "A paz não é a ausência de problemas, é a presença de Deus. Busque-O. ✝️",
  "Cada encontro é uma oportunidade de tocar uma vida. Toque com carinho. 🤗",
  "O sucesso mais duradouro é construído sobre alicerces de honestidade. Seja honesto. 🏛️",
  "Quem tem gratidão no coração nunca se sente pobre. Seja grato. 💛",
  "A vida é uma viagem, não um destino. Aproveite cada paisagem. 🗺️",
  "Cada 'não' que você recebe está te direcionando para um 'sim' maior. Persista. 💪",
  "O carinho que você semeia hoje é a sombra que vai te proteger amanhã. 🌳",
  "Quem aprende a ouvir aprende mais do que quem sempre fala. Ouça mais. 👂",
  "A autoconfiança não é achar que você é perfeito — é saber que vai superar. 🦾",
  "Cada pessoa merece ser tratada com dignidade. Trate bem a todos. 🌹",
  "O amor verdadeiro não tem medo de se expressar. Demonstre o que sente. 💌",
  "A vida oferece segundas chances. Aproveite as suas. 🔄",
  "Quem investe em relacionamentos investe no que dura para sempre. Invista. 👫",
  "A leveza de quem vive sem rancor é visível. Solte o peso. 🪶",
  "Cada minuto bem vivido é uma vitória sobre o tempo. Viva bem. ⌛",
  "O universo conspira a favor de quem age com boa intenção. Tenha boas intenções. 🌌",
  "Quem tem coragem de sonhar tem o primeiro ingrediente para realizar. Sonhe! ✨",
  "A gentileza é sempre a resposta certa. Seja gentil. 🌸",
  "Cada dia que passa sem amor é um dia perdido. Ame muito. 💕",
  "O sorriso é o idioma universal da alegria. Sorria para o mundo. 😊",
  "Quem planta confiança colhe lealdade. Seja confiável. 🤝",
  "A vida é uma obra de arte que você mesmo pinta. Use as cores que quiser. 🎨",
  "Cada palavra de amor é um presente que não ocupa espaço. Dê muitas. 💝",
  "O caminho da paz começa com a aceitação. Aceite o que não pode mudar. 🧘",
  "Quem se conhece bem raramente se perde. Conheça-se. 🔍",
  "A amizade é o ouro mais puro que existe. Cuide dos seus amigos. 💛",
  "Cada escolha que você faz te aproxima ou te afasta do que quer ser. Escolha bem. 🎯",
  "O amor de família é o porto seguro de toda tempestade. Valorize sua família. 🏠",
  "Quem trabalha com amor não sente o cansaço da mesma forma. Ame o que faz. 💼",
  "A vida é generosa com quem é grato. Pratique a gratidão. 🌻",
  "Cada obstáculo é uma oportunidade disfarçada. Veja as oportunidades. 🚀",
  "O bem que você faz hoje é o legado que vai deixar. Faça o bem. 🌟",
  "Quem cuida do espírito cuida de tudo. Alimente sua alma. 🕊️",
  "A beleza está nos olhos de quem vê com amor. Veja com amor. 👁️",
  "Cada novo amigo é um novo mundo. Abra-se para novas amizades. 🌍",
  "O respeito mútuo é a base da convivência harmoniosa. Respeite sempre. 🌿",
  "Quem tem esperança tem futuro. Nunca perca a sua esperança. 🌟",
  "A vida flui quando paramos de resistir e começamos a fluir. Fluia. 🌊",
  "Cada dia é uma nova chance de ser uma versão melhor de si mesmo. 🔄",
  "O amor é a linguagem que o coração fala sem palavras. Deixe-o falar. 💗",
  "Quem compartilha o próprio brilho não fica sem luz. Brilhe e ilumine. ☀️",
  "A vida tem momentos ruins para valorizar os bons. Agradeça por tudo. 🙏",
  "Cada sonho realizado começou como um pensamento corajoso. Pense corajosamente. 💭",
  "O carinho é o ingrediente secreto de toda relação duradoura. Seja carinhoso. 🤗",
  "Quem age com amor nunca age em vão. Aja com amor. ❤️",
  "A paz interior é o maior bem que você pode cultivar. Cultive-a. ☮️",
  "Cada palavra dita com verdade fortalece os laços. Seja verdadeiro. 🔗",
  "O universo não desperdiça nada — nem suas dores, nem suas alegrias. Confie. 🌌",
  "Quem ajuda sem esperar nada em troca recebe do lugar que menos espera. 🎁",
  "A vida é mais leve quando vivida com leveza. Alivie seus fardos. 🪶",
  "Cada gesto de compaixão é um fio de ouro no tecido da humanidade. Seja compassivo. 🥇",
  "O amor que cura começa pelo amor a si mesmo. Cuide de você. 💚",
  "Quem aprende com as próprias quedas se levanta mais forte. Levante-se! 💪",
  "A confiança em Deus é o alicerce mais sólido que existe. Confie. 🙏",
  "Cada dia vivido com intensidade vale por dois. Intensifique sua vida. 🔥",
  "O silêncio sábio às vezes diz mais que mil palavras. Saiba silenciar. 🤫",
  "Quem tem paz consigo mesmo tem paz com o mundo. Faça as pazes com você. ☮️",
  "A vida é um espelho: ela te devolve o que você projeta. Projete o bem. 🪞",
  "Cada abraço genuíno cura uma ferida invisível. Abrace mais. 🤗",
  "O amor incondicional é a forma mais elevada de amar. Pratique-o. 💝",
  "Quem vive com fé enfrenta o impossível com serenidade. Tenha fé. ✝️",
  "A alegria é contagiante — espalhe a sua. 😄",
  "Cada momento de quietude é um presente para a alma. Busque momentos de paz. 🌙",
  "O mundo muda quando uma pessoa decide mudar. Seja essa pessoa. 🌍",
  "Quem constrói pontes ao invés de muros encontra mais riqueza. Construa pontes. 🌉",
  "A vida tem um plano maior que o nosso entendimento. Confie no plano. 📋",
  "Cada pessoa que você inspira é uma chama que você acendeu. Inspire! 🕯️",
  "O amor é a única coisa que aumenta quanto mais se dá. Dê muito amor. 💕",
  "Quem age com consciência age com responsabilidade. Seja consciente. 🧠",
  "A bondade não precisa de audiência para ser real. Seja bom na sombra. 🌿",
  "Cada novo aprendizado é uma janela que se abre para o mundo. Aprenda sempre. 🪟",
  "O sorriso que você dá hoje pode iluminar o dia de alguém. Sorria! 😊",
  "Quem tem objetivos claros nunca perde o norte. Defina seus objetivos. 🧭",
  "A vida é rica em detalhes que só quem está presente consegue ver. Esteja presente. 👁️",
  "Cada desafio superado te prepara para o próximo nível. Continue! 🎮",
  "O amor de amigo é um dos mais puros que existe. Valorize seus amigos. 🤜🤛",
  "Quem tem gratidão no coração nunca está vazio. Seja sempre grato. 💛",
  "A vida é bela para quem aprendeu a olhar com olhos de amor. Olhe com amor. ❤️",
  "Cada ato de coragem inspira outros a serem corajosos. Seja corajoso. 🦁",
  "O presente de hoje é o resultado das escolhas de ontem. Escolha bem hoje. 🎯",
  "Quem cuida dos outros acaba sendo cuidado. Cuide de quem está ao seu redor. 🤲",
  "A esperança é uma luz que nunca se apaga completamente. Acenda a sua. 💡",
  "Cada segundo é uma oportunidade de fazer algo significativo. Aproveite. ⏱️",
  "O amor é a maior força de transformação do mundo. Use essa força. ❤️",
  "Quem semeia paz colhe harmonia. Semeie paz onde você for. 🌱",
  "A vida é uma celebração para quem aprendeu a celebrá-la. Celebre! 🎉",
  "Cada pessoa que você trata com bondade leva um pedaço de você. Seja boa lembrança. 💛",
  "O maior presente que você pode dar a si mesmo é a paz interior. Busque-a. 🕊️",
  "Quem age com propósito age com poder. Defina seu propósito. 🎯",
  "A fé e a ação juntas movem montanhas. Una as duas. ⛰️",
  "Cada amanhecer traz consigo a possibilidade do extraordinário. Acorde animado! 🌄",
  "O amor que você tem dentro de si é inesgotável. Compartilhe sem medo. 💝",
  "Quem vive com leveza aprecia mais os pesos que valem a pena. Seja leve. 🪶",
  "A beleza da vida está em sua capacidade de surpreender. Deixe-se surpreender. 🎁",
  "Cada palavra de gratidão fortalece quem a diz e quem a ouve. Agradeça mais. 🙏",
  "O caminho mais curto para a felicidade é a gratidão. Pratique-a. 😊",
  "Quem tem amor no coração nunca está com frio. Aqueça-se com amor. 🔥",
  "A vida nos dá exatamente o que precisamos para crescer. Confie no processo. 🌱",
  "Cada momento de cuidado consigo mesmo é um investimento no todo. Cuide-se. 💚",
  "O sorriso é a curva mais bonita do rosto humano. Use o seu sempre. 😊",
  "Quem planta alegria nunca colhe tristeza. Plante muita alegria. 🌻",
  "A paz é o maior legado que podemos deixar para as próximas gerações. Seja pacífico. ☮️",
  "Cada dia é uma obra-prima em potencial. Esculpa o seu com cuidado. 🗿",
  "O amor verdadeiro não desaparece — se transforma. Deixe-o se transformar. 💞",
  "Quem confia em Deus tem força para qualquer batalha. Confie. 🛡️",
  "A vida que vale a pena é a que faz diferença na vida dos outros. Faça diferença. 🌍",
  "Cada conquista, por menor que seja, merece ser celebrada. Celebre as suas. 🏆",
  "O amor e a gratidão são o antídoto para quase tudo. Use-os sempre. 💊",
  "Quem semeia hoje não sabe a grandeza do que vai colher. Semeie com fé. 🌾",
  "A serenidade é a forma mais alta de inteligência emocional. Seja sereno. 🧘",
  "Cada respiro é um milagre. Respire com consciência e gratidão. 🌬️",
  "O amor é o único investimento que nunca dá prejuízo. Invista muito. 📈",
  "Quem compartilha a própria história inspira quem ainda não encontrou o caminho. Compartilhe. 📖",
  "A vida é feita de momentos, não de anos. Acumule momentos incríveis. ⭐",
  "Cada dia que você escolhe ser feliz é um dia bem vivido. Escolha a felicidade. 😄",
  "O bem que você espalha no mundo sempre volta para você. Espalhe o bem. 🌟",
  "Quem tem luz interior ilumina até os lugares mais sombrios. Brilhe. 💡",
  "A vida é muito curta para viver sem paixão. Encontre a sua. 🔥",
  "Cada pessoa em sua vida é um presente — mesmo as que ensinam pelo contraste. 🎁",
  "O amor cura o que a medicina às vezes não alcança. Ame com força. ❤️",
  "Quem vive com integridade dorme em paz. Seja íntegro sempre. 😴",
  "A gratidão é a memória do coração. Guarde boas memórias. 💛",
  "Cada amanhecer é um convite para ser melhor. Aceite o convite. 🌅",
  "O maior ato de amor próprio é respeitar seus próprios limites. Respeite-se. 🌸",
  "Quem caminha com Deus nunca caminha sozinho. Caminhe com fé. 🙏",
  "A vida tem um sentido para cada um. Encontre o seu e viva-o plenamente. 🎯",
  "Cada momento de paz interior é uma vitória sobre o caos do mundo. Vença. ✌️",
  "O amor que você dá hoje é o amor que te sustentará amanhã. Ame hoje. 💕",
];

// ============================================================
// 🎯 AÇÕES CRIATIVAS
// ============================================================
const ACOES_CRIATIVAS = [
  "ir pra BC no finalzinho do ano 🏖️",
  "montar um negócio juntos e ficar rico 💰",
  "se tornar dupla sertaneja e fazer shows 🎤",
  "fazer uma viagem de moto até o nordeste 🏍️",
  "abrir uma barraca de churrasco no fim de semana 🥩",
  "criar um canal no YouTube e viralizar 📱",
  "fazer intercâmbio junto pra Europa 🌍",
  "participar do MasterChef e ganhar 👨‍🍳",
  "acampar na serra no próximo feriado ⛺",
  "fazer um piquenique no parque 🧺",
  "ir numa cachoeira de surpresa 🌊",
  "assistir o nascer do sol na praia 🌅",
  "fazer uma noite de jogos de tabuleiro 🎲",
  "experimentar um restaurante japonês diferente 🍣",
  "ir num show de música ao vivo 🎸",
  "fazer um bolo absurdo pra comemorar nada 🎂",
  "jogar sinuca e comer petisco depois 🎱",
  "dar uma volta de barco no fim de semana ⛵",
  "organizar uma gincana no grupo 🏆",
  "ir numa feira de artesanato juntos 🎨",
  "fazer uma caminhada na trilha da serra 🥾",
  "assistir um jogo de futebol no estádio ⚽",
  "fazer um piquenique à luz de velas 🌙",
  "fazer um retiro espiritual de um dia 🧘",
];

// ============================================================
// ⚙️ AUXILIARES
// ============================================================
function getDiaSemana(dia) {
  return ["🌞 Domingo","🌙 Segunda-feira","🔥 Terça-feira","💧 Quarta-feira","🌿 Quinta-feira","⭐ Sexta-feira","🪐 Sábado"][dia];
}

function getDiaDoAno(data) {
  const inicio = new Date(data.getFullYear(), 0, 0);
  return Math.floor((data - inicio) / (1000 * 60 * 60 * 24));
}

function getDiasFimAno(data) {
  const fimAno = new Date(data.getFullYear(), 11, 31);
  return Math.floor((fimAno - data) / (1000 * 60 * 60 * 24));
}

// ============================================================
// 💌 ENVIA MENSAGEM PARA UM GRUPO
// ============================================================
async function enviarMensagemParaGrupo(socket, groupJid) {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const dia = String(now.getDate()).padStart(2, "0");
  const mes = String(now.getMonth() + 1).padStart(2, "0");
  const ano = now.getFullYear();
  const dataFormatada = `${dia}/${mes}/${ano}`;
  const chaveData = `${dia}-${mes}`;

  const diaSemana = getDiaSemana(now.getDay());
  const diasFimAno = getDiasFimAno(now);
  const faseLua = getFaseLua(now.toISOString().split("T")[0]);
  const feriado = FERIADOS_2026[chaveData];
  const indice = ((getDiaDoAno(now) - 1) % 365 + 365) % 365;
  const sabedoria = MENSAGENS_365[indice];

  let mentions = [];
  let acaoText = "";
  try {
    const metadata = await socket.groupMetadata(groupJid);
    const ids = metadata.participants.map((p) => p.id);
    if (ids.length >= 2) {
      const sorteados = [...ids].sort(() => Math.random() - 0.5).slice(0, 2);
      const acao = ACOES_CRIATIVAS[Math.floor(Math.random() * ACOES_CRIATIVAS.length)];
      mentions = sorteados;
      acaoText = `\n\n🎯 *${diasFimAno} dias até* @${sorteados[0].split("@")[0]} e @${sorteados[1].split("@")[0]} *${acao}*`;
    }
  } catch (_) {}

  let msg = `💌 *Mensagem Diária*\n\n`;
  msg += `📆 *Hoje é dia*: ${dataFormatada}\n`;
  msg += `${diaSemana}\n`;
  msg += `🌚 *Lua*: ${faseLua}\n`;
  msg += `⏳ *Faltam* ${diasFimAno} *dias para o Fim do Ano*`;
  msg += acaoText;
  msg += `\n\n✨ *Sabedoria do Dia*:\n_${sabedoria}_`;
  msg += `\n\n💚 _By DeadBoT_`;

  if (feriado) {
    const isFeriado = feriado.tipo === "feriado";
    const icone = isFeriado ? "🚨" : "📋";
    const rotulo = isFeriado ? "*Hoje é Feriado Nacional!*" : "*Hoje é Ponto Facultativo!*";
    let banner = `${icone} ${rotulo}\n📌 *${feriado.nome}*`;
    if (feriado.felicitacao) banner += `\n\n${feriado.felicitacao}`;
    msg = banner + `\n\n${"─".repeat(28)}\n\n` + msg;
  }

  await socket.sendMessage(groupJid, { text: msg, mentions });
  console.log(`[MensagemDiaria] ✅ Enviado para ${groupJid}`);
}

// ============================================================
// ⏰ SCHEDULER — socket global para suportar reconexões
// ============================================================
let _socketAtual = null;
let _schedulerIniciado = false;

export function updateMensagemDiariaSocket(socket) {
  _socketAtual = socket;
  console.log("[MensagemDiaria] 🔄 Socket atualizado após reconexão.");
}

export function startMensagemDiariaScheduler(socket) {
  _socketAtual = socket;

  if (_schedulerIniciado) {
    console.log("[MensagemDiaria] ⚠️ Scheduler já rodando, apenas atualizando socket.");
    return;
  }
  _schedulerIniciado = true;
  console.log("[MensagemDiaria] 💌 Agendador de mensagem diária iniciado!");

  let alreadySentToday = false;
  let lastDay = null;

  setTimeout(() => {
    setInterval(async () => {
      const nowBRT = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
      const hour = nowBRT.getHours();
      const minute = nowBRT.getMinutes();
      const day = nowBRT.getDate();

      if (lastDay === null) lastDay = day;
      if (day !== lastDay) { alreadySentToday = false; lastDay = day; }

      if (hour === 6 && minute === 0 && !alreadySentToday) {
        alreadySentToday = true;
        console.log("[MensagemDiaria] ⏰ São 06:00 (Brasília)! Enviando mensagem diária...");

        try {
          const db = loadDB();
          const gruposAtivos = Object.entries(db)
            .filter(([, e]) => e?.ativo === true)
            .map(([jid, e]) => ({ jid, nome: e?.nome || "Grupo sem nome" }));

          if (gruposAtivos.length === 0) {
            console.log("[MensagemDiaria] Nenhum grupo ativo.");
            return;
          }

          console.log(`[MensagemDiaria] 📋 ${gruposAtivos.length} grupo(s) ativo(s)...`);

          for (const { jid, nome } of gruposAtivos) {
            console.log(`[MensagemDiaria] 📤 Enviando para: ${nome} (${jid})`);
            let tentativa = 0;
            let sucesso = false;
            while (tentativa < 3 && !sucesso) {
              try {
                await enviarMensagemParaGrupo(_socketAtual, jid);
                sucesso = true;
              } catch (err) {
                tentativa++;
                console.warn(`[MensagemDiaria] ⚠️ Tentativa ${tentativa}/3 falhou para ${nome}: ${err.message}`);
                if (tentativa < 3) await new Promise((r) => setTimeout(r, 10000));
              }
            }
            if (!sucesso) console.error(`[MensagemDiaria] ❌ Falhou após 3 tentativas: ${nome} (${jid})`);
            await new Promise((r) => setTimeout(r, 2000));
          }
        } catch (err) {
          console.error("[MensagemDiaria] ❌ Erro geral:", err.message);
        }
      }
    }, 60 * 1000);
  }, 30000);
}
