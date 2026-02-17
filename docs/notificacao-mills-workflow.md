# Workflow: Notificação Mills

**ID:** htdvLvUG4y671QJm
**Status:** Ativo
**Criado em:** 21/09/2025
**Última atualização:** 15/02/2026

---

## Objetivo

Este workflow automatiza o monitoramento de cargas disponíveis no site da Mills (Tegma Transporte) e envia notificações via WhatsApp sempre que novas cargas são encontradas. O sistema evita notificações duplicadas armazenando as cargas já processadas.

---

## Gatilho (Trigger)

**Tipo:** Agendamento (Schedule Trigger)
**Cron Expression:** `*/15 7-18 * * *`

O workflow é executado automaticamente a cada **15 minutos**, entre **7h e 18h** (horário comercial), todos os dias.

---

## Fluxo de Execução

### 1. Obter Cookie de Sessão (Get Cookie)
- **Ação:** Requisição HTTP GET para `https://gestaotegmatransporte.ventunolog.com.br/Login`
- **Objetivo:** Capturar o cookie de sessão inicial necessário para autenticação
- **Retry:** Até 5 tentativas com intervalo de 5 segundos

### 2. Login no Sistema (Login)
- **Ação:** Requisição HTTP POST para o endpoint de login
- **Credenciais:**
  - Usuário: `2621`
  - Senha: `12345`
- **Objetivo:** Autenticar no sistema usando o cookie obtido

### 3. Acessar Página de Cargas (Página)
- **Ação:** Requisição HTTP GET para `https://gestaotegmatransporte.ventunolog.com.br/Monitoramento/CargasDisponiveis`
- **Parâmetros:** `tpoeqp=0` (tipo de equipamento)
- **Objetivo:** Obter o HTML da página com a lista de cargas disponíveis

### 4. Extrair Dados das Cargas (Extrair cargas)
- **Tipo:** Node de código (JavaScript com Cheerio)
- **Ação:** Parse do HTML para extrair dados da tabela `#tblGridViagem`
- **Campos extraídos:**
  | Campo | Descrição |
  |-------|-----------|
  | `viagem` | ID da viagem |
  | `tipoTransporte` | Tipo de transporte |
  | `origem` | Local de origem |
  | `destino` | Local de destino |
  | `produto` | Produto a ser transportado |
  | `equipamento` | Tipo de veículo/equipamento |
  | `prevColeta` | Previsão de coleta |
  | `qtdeEntregas` | Quantidade de entregas |
  | `vrFrete` | Valor do frete |
  | `termino` | Término da disponibilidade |

### 5. Verificar se Há Cargas (Há cargas?)
- **Condição:** Verifica se `cargasExtraidas.length > 0`
- **Resultado:** Prossegue apenas se existirem cargas disponíveis

### 6. Remover Duplicatas (Remove Duplicates)
- **Tipo:** Deduplicação baseada em execuções anteriores
- **Chave:** ID da viagem (`viagem`)
- **Objetivo:** Garantir que a mesma carga não seja notificada mais de uma vez

### 7. Ações Paralelas (quando há cargas novas)

Após remover duplicatas, o workflow executa 4 ações em paralelo:

#### 7.1 Inserir no Banco de Dados (Insert row)
- **Destino:** DataTable `notify-mills` (ID: vyUfeaO9ruHECY5e)
- **Ação:** Persiste os dados da carga em uma tabela para histórico
- **Campos salvos:** Todos os campos extraídos da carga

#### 7.2 Enviar WhatsApp para Jean (Enviar Jean)
- **Destinatário:** 5512982301778 (Jean)
- **API:** Evolution API (instância: guincho2)
- **Mensagem:**
  ```
  Da uma olhada no site da Mills:
  De: {origem}
  Para: {destino}
  Produto: {produto}
  Veículo: {equipamento}
  Previsão de Coleta: {prevColeta}
  https://gestaotegmatransporte.ventunolog.com.br/Login
  ```

#### 7.3 Enviar WhatsApp para Jefferson (Enviar para Jefferson)
- **Destinatário:** 5512996347190 (Jefferson)
- **Mensagem:** Mesmo formato acima

#### 7.4 Enviar WhatsApp para Sebastião (Enviar Sebastião)
- **Destinatário:** 5512996558925 (Sebastião)
- **Status:** Desativado (disabled)
- **Mensagem:** Mesmo formato acima

---

## Tratamento de Erros

- **Workflow de erro:** `VeoXBlRWchpWGOrr` (executado em caso de falha)
- **Retry em nodes críticos:** Cada node HTTP e de notificação possui:
  - Máximo de 5 tentativas
  - Intervalo de 5 segundos entre tentativas
  - Continuação em caso de erro (onError: continueRegularOutput)

---

## URLs e Endpoints

| Descrição | URL |
|-----------|-----|
| Login | `https://gestaotegmatransporte.ventunolog.com.br/Login` |
| Cargas Disponíveis | `https://gestaotegmatransporte.ventunolog.com.br/Monitoramento/CargasDisponiveis` |

---

## Configurações

- **Salvar progresso da execução:** Sim
- **Ordem de execução:** v1
- **Modo binário:** Separado
- **Disponível em MCP:** Sim
- **Política de chamador:** Workflows do mesmo dono

---

## Resumo do Funcionamento

1. A cada 15 minutos (das 7h às 18h), o workflow acessa o site da Tegma/Mills
2. Realiza login automático com credenciais fixas
3. Extrai os dados da tabela de cargas disponíveis
4. Verifica se há cargas novas (não processadas anteriormente)
5. Envia notificações via WhatsApp para Jean e Jefferson
6. Salva um registro da carga no banco de dados para histórico
7. Evita notificações duplicadas usando deduplicação baseada no ID da viagem
