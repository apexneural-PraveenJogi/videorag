"""LangGraph StateGraph for the query pipeline: retrieve -> prompt -> generate.

(Ingestion runs once per video as a background task; see nodes/ingest_node.py.)
"""
from __future__ import annotations

from functools import lru_cache

from langgraph.graph import END, StateGraph

from app.pipeline.nodes.generate_node import generate_node
from app.pipeline.nodes.prompt_node import prompt_node
from app.pipeline.nodes.retrieve_node import retrieve_node
from app.pipeline.state import RAGState


@lru_cache
def get_query_graph():
    graph = StateGraph(RAGState)
    graph.add_node("retrieve", retrieve_node)
    graph.add_node("prompt", prompt_node)
    graph.add_node("generate", generate_node)

    graph.set_entry_point("retrieve")
    graph.add_edge("retrieve", "prompt")
    graph.add_edge("prompt", "generate")
    graph.add_edge("generate", END)
    return graph.compile()
