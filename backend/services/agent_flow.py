"""
Agent Flow — camada de IA sobre o Recommendation Engine.
Usa LangChain + Claude para gerar análises contextualizadas em linguagem natural.

Se ANTHROPIC_API_KEY não estiver configurada, retorna apenas as recomendações
do engine heurístico sem enriquecimento de IA.
"""
import os
from pathlib import Path
from sqlalchemy.orm import Session

# Carrega .env manualmente para garantir que o reload do uvicorn pegue a chave
_env_path = Path(__file__).parent.parent / ".env"
if _env_path.exists():
    for line in _env_path.read_text().splitlines():
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

from services.recommendation_engine import generate_recommendations

def _get_api_key() -> str:
    """Lê a chave do .env a cada chamada, permitindo atualização sem reiniciar."""
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith("ANTHROPIC_API_KEY="):
                return line.split("=", 1)[1].strip()
    return os.environ.get("ANTHROPIC_API_KEY", "")



SYSTEM_PROMPT = """Você é o Meu Tico, um assistente especialista em organização de arquivos.
Analise as recomendações geradas pelo sistema e produza um relatório claro e direto em português brasileiro.

Para cada recomendação:
- Explique em 1-2 frases o que está acontecendo
- Diga qual a ação sugerida e por que é segura
- Indique o nível de risco: 🟢 BAIXO, 🟡 MÉDIO, 🔴 ALTO

Termine com um resumo executivo de 2-3 linhas sobre o estado geral do armazenamento.
Seja objetivo e técnico, mas acessível."""


def _build_context(recommendations: dict) -> str:
    """Serializa as recomendações para o prompt do agente."""
    lines = [
        f"Total de recomendações: {recommendations['total_recommendations']}",
        f"Espaço que pode ser liberado: {recommendations['total_savings_mb']} MB",
        "",
        "RECOMENDAÇÕES:",
    ]
    for i, rec in enumerate(recommendations["recommendations"], 1):
        lines.append(
            f"{i}. [{rec['risk']}] {rec['title']}\n"
            f"   {rec['description']}\n"
            f"   Arquivos envolvidos: {len(rec['file_ids'])} | "
            f"Economia: {rec['potential_savings_mb']} MB"
        )
    return "\n".join(lines)


def run_agent(db: Session) -> dict:
    """
    Gera recomendações heurísticas e, se houver API key, enriquece com IA.
    """
    api_key = _get_api_key()
    recs = generate_recommendations(db)

    if not recs["recommendations"]:
        return {
            **recs,
            "ai_analysis": "Nenhuma recomendação encontrada. Seu armazenamento está em ordem!",
            "ai_available": bool(api_key),
        }

    if not api_key:
        return {
            **recs,
            "ai_analysis": None,
            "ai_available": False,
            "ai_message": "Configure ANTHROPIC_API_KEY para ativar análise em linguagem natural.",
        }

    try:
        from langchain_anthropic import ChatAnthropic
        from langchain_core.messages import SystemMessage, HumanMessage

        llm = ChatAnthropic(
            model="claude-haiku-4-5-20251001",
            anthropic_api_key=api_key,
            max_tokens=1024,
        )

        context = _build_context(recs)
        messages = [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=f"Analise estas recomendações:\n\n{context}"),
        ]

        response = llm.invoke(messages)
        ai_analysis = response.content

    except Exception as e:
        ai_analysis = f"Erro ao consultar IA: {str(e)}"

    return {
        **recs,
        "ai_analysis": ai_analysis,
        "ai_available": True,
    }
