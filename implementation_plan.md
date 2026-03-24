# Planejamento do Projeto de AI File Management

## 1. Visão Geral (Goal Description)
O objetivo é construir uma plataforma avançada de Agente de Gerenciamento de Arquivos alimentado por Inteligência Artificial — arquitetada em um esquema robusto focada em **segurança sistêmica**, atuando localmente. O sistema descobrirá duplicatas precisas (usando validação por Hash associada a regras e meta-dados), categorizando conteúdos e recomendando planos de ação não destrutivos que sigam um rigoroso princípio de: "Plan → Approve → Execute → Undo". Ideal para usuários que manejam alto volume de informações sem comprometer a integridade de seus drivers de armazenamento local ou externo da máquina.

## 2. Aprovação Requerida (User Review)
> [!IMPORTANT]
> **Escolha da Stack Tecnológica** 
> 
> Proponho dividirmos o seu projeto em 2 pilares:
> * **Backend & Agent Engine:** Python (FastAPI + LangChain + SQLite). Escolhemos este conjunto por possuir o ecossistema mais maduro de manipulação local junto ao SO (como a integração *watchdog* para tracking de arquivos em real-time e compatibilidade robusta com Windows), somado à ampla facilidade dos frameworks AI/Agentes e hashing.
> * **Frontend / UI Premium:** React / Vite + TailwindCSS / Framer Motion, gerando uma web interface local (Dashboard) lindíssima, para atuar como barreira final de aprovação do usuário e dar clareza aos processos e "diffs".
> * **Você aprova essa Tech Stack (Python back / React front)? Ou preferiria algo estritamente focado em desktop puro como C# e .NET via Semantic Kernel?**

> [!CAUTION]
> **Isolamento de Proteção no MVP (Allowlist)**
>
> Para evitarmos qualquer corrupção acidental em disco na execução por IA (como ressalta bem o texto de referência), implementaremos um sistema Allowlist. O sistema **só vai acessar** pastas que você adicionar expressamente nas origens (`roots`). Por favor, certifique que testaremos este MVP em um diretório não vital antes de mover à produção!

## 3. Estrutura Proposta da Aplicação (Proposed Changes)

Construiremos o plano em módulos que se comunicam através de um Event Queue interno.
Aqui estão as separações primárias:

### Componentes de Backend (Python/FastAPI)
#### `backend/services/connector.py` [NEW]
- **Connector Manager:** Irá lidar com a lista do SO de diretórios permitidos e montará as restrições raiz.
#### `backend/services/scanner.py` [NEW]
- **Indexer/Scanner:** Robô primário que faz a varredura e gerencia tabelas do SQLite base, escutando modificações por Windows USN / watchdog e mantendo sincronia do banco de dados referencial (*Manifest DB*).
#### `backend/services/duplicate_engine.py` [NEW]
- Implementação dos algoritmos em 2 estágios. Estágio 1: Agrupa tamanhos. Estágio 2: Cria Hashes de segurança para confirmar duplicação 100%.
#### `backend/services/agent_flow.py` [NEW]
- **O Agente (Recommendation & Planner):** Geração programática via LangChain de recomendações ou scripts de ações. Output em formado padronizado informando o risco (High, Medium, Low).
#### `backend/services/executor.py` [NEW]
- **The Vault (Executor Seguro):** Faz *Two-phase Commit*. O executor lê o plano aprovado, joga em quarentena (e NÃO apaga para sempre), gravando Rollbacks.

### Componentes de Frontend (React)
#### `frontend/src/` [NEW]
- Tela inicial com o Overview do armazenamento e projeção baseada nos registros.
- Interface especializada para visualizar tabelas de "Planos Recomendados" com os Before/After detalhando a movimentação sugerida pela IA.

## 4. Plano de Teste (Verification Plan)
### Testes Automatizados
- Scripts python criando centenas de arquivos (com hashes colidindo de propósito) verificando a validade do Duplicate Engine.
- Teste lógico de isolamento para impedir que o Executor delete algo do nível de sistema `C:\\Windows`.

### Verificação Manual
- Instanciaremos a stack completa. 
- Usaremos uma pasta como `C:\Users\gdeol\Documents\teste_ai` jogando arquivos mistos para que o aplicativo gere um plano em tempo real, aprovando em 1 clique pelo Dashboard UI para confirmar a efetividade do Undo/Rollback baseada em Quarentena.
