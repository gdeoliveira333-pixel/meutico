# Análise do Projeto "Meu Tico"

Abaixo está o relatório detalhado contendo pontos de melhoria, com grande foco na Experiência do Usuário (UX) e na Interface (UI), bem como apontamentos de Arquitetura e Código.

## 1. Melhorias de UX / UI (Experiência e Interface do Usuário)

### 1.1. Navegação e Roteamento (Deep Linking)
- **Problema:** O arquivo `App.jsx` utiliza estado local (`tab === 'scanner'`) para alternar entre as telas, em vez de usar uma biblioteca de rotas real (embora o `react-router-dom` esteja no `package.json`).
- **Impacto:** Isso quebra os botões de voltar/avançar do navegador, impede o compartilhamento de links diretos (ex: enviar `meutico.com/scanner` para alguém) e recarrega na aba "Origens" sempre que a página sofre refresh.
- **Solução:** Implementar o Roteador do `react-router-dom` envolvendo o Header e as páginas em `Routes`.

### 1.2. Scroll Constrito em Listas
- **Problema:** Em `Scanner.jsx`, a lista de arquivos possui um `maxHeight: 360` estático fixo no código.
- **Impacto:** Em telas grandes (monitores ultrawide, por exemplo), a página fica com muito espaço vazio e a lista fica espremida num bloco de 360px. Em telas minúsculas, pode vazar o conteúdo.
- **Solução:** Usar flexbox (`flex-1`, `overflow-y-auto`) permitindo que a lista cresça para preencher o espaço restante da tela, delegando a rolagem para a altura natural do viewport.

### 1.3. Ações Interativas Faltantes
- **Problema:** As telas de "Scanner" e "Busca" mostram listas maravilhosas, mas os itens não são clicáveis de forma útil para gerenciar arquivos reais.
- **Impacto:** Como usuário de um "Gerenciador de Arquivos", após buscar "vídeo do cachorro", eu gostaria de clicar no arquivo e abrir sua pasta no Windows Native (via botão/link). Falta interatividade na exibição dos arquivos.
- **Solução:** Adicionar um botão de ação com ícone para "Abrir no Explorador de Arquivos".

### 1.4. Menu Mobile
- **Problema:** O menu mobile usa estado de mostrar/ocultar que simplesmente empurra o conteúdo para baixo. Além disso, não possui um *backdrop* (fundo escurecido) focado para fechá-lo clicando fora.
- **Impacto:** A transição do menu pode ser abrupta se houver conteúdo complexo embaixo, e não segue o padrão premium visualizado no Header transparente.
- **Solução:** Exibir o menu mobile como um painel flutuante/gaveta (*drawer* com `position: absolute / fixed`) equipado com um `backdrop` transparente que desfaça o menu ao clique fora.

### 1.5. Feedback de Carregamento Rígido
- **Problema:** Nas buscas ou varreduras (`Scanner` e `Search`), os indicadores de carregamento limitam-se a textos em botões ou remoção do componente substituindo-o por um placeholder no final.
- **Impacto:** Quando ocorre o *fetching*, as listas somem ou dão saltos (*layout shifts*).
- **Solução:** Implementar **Skeleton Loaders** (barras/linhas de simulação cintilantes) onde os resultados aparecerão, ou manter a lista anterior um pouco transparente/borrada (*overlay*) enquanto dados novos chegam.

### 1.6. Mensagens de Sucesso ou Erro (Toasts)
- **Problema:** O método atual `<Alert type="error">{error}</Alert>` cria uma barreira visual fixa dentro do painel. Operações bem-sucedidas ou falhas de cópia não mostram confirmação flutuante.
- **Impacto:** Se eu fizer uma ação profunda ou usar os atalhos com teclado, posso não notar a placa vermelha ou não obter validação tangível se deu certo ou falhou.
- **Solução:** Centralizar o gerenciamento de alertas com um sistema de Notificações tipo **Toast** (`react-hot-toast` ou similar).

### 1.7. Acessibilidade (A11y)
- **Problema:** Faltam estados de foco de teclado refinados e marcação em tags de semântica.
- **Impacto:** Usuários via teclado ou que contam com leitores de tela terão dificuldades porque as marcações de abas ativas hoje só trocam estilos inline sem setar `aria-current="page"`.

---

## 2. Melhorias de Código e Arquitetura

### 2.1. Back-end: Refatoração do `main.py`
- Há rotas de *Authentication*, *Scanner*, *Roots*, *Executor*, *Search*, *Schedules* e *Cloud* agrupadas em um único arquivo monstruoso de aproximadamente 400 linhas.
- **Sugerido:** Utilizar o módulo `APIRouter` do FastAPI. Criar uma pasta `routes/` (ou separar por módulos dentro de `/routers`) e fazer: `app.include_router(roots_router, prefix="/roots")`. Isso aumentará a manutenibilidade para colaborações assíncronas.

### 2.2. Front-end: Gerenciamento Global de Estado (ex: Tokens)
- No `App.jsx`, a verificação de logado e token (`!loggedIn`) ocorre num estado e atua localmente de forma isolada do código no `api.js` propriamente.
- Não foi visto mecanismo unificado global de "Redirecionar para o Login se a API retornar erro de Token Expirado / `401 Unauthorized`" em todas requisições.
- **Sugerido:** Usar o padrão *Axios Interceptors* (ou wrapper simples via função de *fetch*) que capture códigos `401` e dispare o logout centralmente. Adotar Zustand ou Context API para estado de login.

### 2.3. Configuração de Chave API (Hardcoded rule no Endpoint)
- A função de busca (`/search`) requer chave API em tempo real pela verificação na rota. A aplicação deveria notificar ativamente o usuário caso as _Features_ de IA que ele tente acessar exijam que um prompt de API seja inserido ou previamente salvo nas configurações do usuário no DB.

### 2.4. Modularidade Visual (Design System)
- Os estilos atuais como `background: linear-gradient(...)` e manipulação de brilho via `rgba`, `shadow` nos cartões formam _Inline Styles_ ou classes manuais nos arquivos React.
- Sabendo que o TailwindCSS está instaurado `package.json`, muitos desses valores poderiam ser convertidos para **temas do tailwind**. Isso vai enxugar drasticamente o JSX e evitar propósitos perdidos caso o tema futuramente receba uma versão Branca (Light Mode).
