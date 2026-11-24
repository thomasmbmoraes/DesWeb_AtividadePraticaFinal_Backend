/* API de gerenciamento de eventos academicos para o trabalho
   final da disciplina desenvolvimento web 
   backend em Node.js + Express, usando o Supabase como banco
   e hospedado no Render */

/* carregamento  das variaveis do arquivo .env (só serve quando roda local,
   no Render as variáveis vem direto do painel) */
require('dotenv').config();

// importacao das bibliotecas
const express = require('express');                        // framework do servidor
const cors = require('cors');                              // libera o acesso do frontend
const { createClient } = require('@supabase/supabase-js'); // cliente do Supabase

// criacao da aplicação do Express
const app = express();

/* utilizacao da porta que o ambiente fornece (o Render define a PORT sozinho).
   se não tiver nenhuma definida (rodando no meu PC), usei a 3000 */
const PORT = process.env.PORT || 3000;

/* configuracao do supabase (URL e chave de acesso) para conectar com o banco
   essas variáveis devem ser definidas no Render (ou no .env local) */
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// se não tiver definido a URL ou a chave, mostra um erro e para o servidor
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERRO: defina SUPABASE_URL e SUPABASE_KEY nas variáveis de ambiente.');
  process.exit(1);
}

// criacao da conexão com o supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/* configuracao do CORS (Cross-Origin Resource Sharing)
   definicao de quais sites podem fazer requisição para a minha API.
   a variável FRONTEND_URL guarda a URL do meu frontend no vercel
   (dá pra colocar mais de uma separando por vírgula) */
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')                                   // supara as URLs
  .map((url) => url.trim().replace(/\/$/, ''))  // tira os espaços e a barra do final
  .filter(Boolean);                             // remocao de itens vazios

app.use(
  cors({
    origin(origin, callback) {
      /* a requisicao é liberada se:
            - o FRONTEND_URL ainda nao foi configurado (esta aberto pra testar)
            - a requisição não tem origem (ex: acessando direto pelo navegador)
            - a origem esta na lista de permitidas */
      if (allowedOrigins.length === 0 || !origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // qualquer outro site é bloqueado
      return callback(new Error('Origem não permitida pelo CORS: ' + origin));
    },
    methods: ['GET', 'POST'], // só uso esses dois métodos na aplicação
  })
);

// permicao que a API receba dados em JSON no corpo das requisicoes
app.use(express.json());

// ROTAS

// rota inicial, só pra verificar se a API está no ar
app.get('/', (req, res) => {
  res.json({ status: 'ok', mensagem: 'API de Eventos Acadêmicos' });
});

// GET /eventos -> lista todos os eventos cadastrados
app.get('/eventos', async (req, res) => {
  // busca todos os registros da tabela eventos, ordenados pelo id
  const { data, error } = await supabase
    .from('eventos')
    .select('*')
    .order('id', { ascending: true });

  // se deu algum erro no banco, retorno status 500
  if (error) {
    console.error(error);
    return res.status(500).json({ erro: error.message });
  }

  // deu certo: retorna a lista de eventos
  res.json(data);
});

// GET /eventos/:id -> busca um evento específico pelo id
app.get('/eventos/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('eventos')
    .select('*')
    .eq('id', req.params.id) // filtro pelo id que veio na URL
    .maybeSingle();          // retorna um objeto só (ou null se não achar)

  if (error) return res.status(500).json({ erro: error.message });
  // se nao encontrou nenhum evento com esse id, retorna 404
  if (!data) return res.status(404).json({ erro: 'Evento não encontrado' });
  res.json(data);
});

// POST /eventos -> cadastra um novo evento
app.post('/eventos', async (req, res) => {
  // pega os campos que o frontend enviou no corpo da requisição
  const { titulo, descricao, data_evento, local } = req.body || {};

  // valida os campos obrigatorios (os mesmos que sao NOT NULL na tabela)
  if (!titulo || !data_evento || !local) {
    return res
      .status(400)
      .json({ erro: 'Campos obrigatórios: titulo, data_evento e local.' });
  }

  // confere se a data está no formato dd/mm/aaaa, igual aos dados da carga inicial
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(data_evento)) {
    return res.status(400).json({ erro: 'data_evento deve estar no formato dd/mm/aaaa.' });
  }

  // insere o evento no banco e já pede o retornar do registro criado (com o id)
  const { data, error } = await supabase
    .from('eventos')
    .insert([{ titulo, descricao: descricao || null, data_evento, local }])
    .select()
    .single();

  if (error) {
    console.error(error);
    return res.status(500).json({ erro: error.message });
  }

  // status 201 = criado com sucesso
  res.status(201).json(data);
});

// iniciando o servidor na porta definida (ou 3000 se não tiver nenhuma)
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});