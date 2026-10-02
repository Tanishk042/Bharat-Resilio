# Automated Preparedness/Guidance Engine (RAG)

RAG-based emergency guidance generation with local LLM and vector store.

## Overview

Implements RAG pipeline for emergency guidance:
- Embeds emergency preparedness documents into ChromaDB vector store
- Retrieves relevant chunks based on hazard type and tier
- Generates guidance via local LLM (Ollama) grounded in retrieved chunks
- Caches guidance for offline availability

## Simulation vs. Reality

**What's simulated:**
- Sample emergency documents instead of full FEMA/Red Cross/WHO corpus
- Local LLM instead of fine-tuned model
- Simplified document metadata

**What's real:**
- RAG architecture is production-ready
- Vector store (ChromaDB) is functional
- SentenceTransformer embeddings work correctly
- Caching enables offline availability
- LLM grounding in retrieved context

**PRODUCTION_TODO:**
- Use real public-domain emergency documents (FEMA, Red Cross, WHO)
- Expand document corpus for comprehensive coverage
- Implement proper document ingestion pipeline
- Add document versioning and updates
- Consider fine-tuning for domain-specific language

## Files

- `rag_engine.py` - RAG pipeline and guidance generation
- `api.py` - FastAPI endpoint
- `README.md` - This file

## Usage

### Testing RAG Engine

```bash
cd services/preparedness_engine
python rag_engine.py
```

### API Server

```bash
cd services/preparedness_engine
python api.py
```

Or with uvicorn:
```bash
uvicorn api:app --host 0.0.0.0 --port 8000
```

### API Usage

```bash
# Health check
curl http://localhost:8000/health

# Get guidance
curl -X POST http://localhost:8000/guidance \
  -H "Content-Type: application/json" \
  -d '{
    "hazard_type": "flood",
    "tier": "Warning",
    "zone_id": "Zone A"
  }'

# Get statistics
curl http://localhost:8000/stats

# Add documents
curl -X POST http://localhost:8000/documents/add \
  -H "Content-Type: application/json" \
  -d '{
    "documents": [
      {
        "text": "Sample emergency guidance text",
        "metadata": {"hazard_type": "flood", "tier": "Warning", "source": "FEMA"}
      }
    ]
  }'

# Clear cache
curl -X POST http://localhost:8000/cache/clear
```

## RAG Pipeline

### 1. Document Ingestion
- Documents are embedded using SentenceTransformer (all-MiniLM-L6-v2)
- Stored in ChromaDB with metadata (hazard_type, tier, source)
- Enables semantic search and filtering

### 2. Retrieval
- Query is embedded using same model
- Vector search with metadata filter (hazard_type, tier)
- Returns top-k most relevant chunks

### 3. Generation
- Retrieved chunks are used as context for LLM
- System prompt instructs LLM to generate guidance based on context
- LLM generates concise, actionable guidance

### 4. Caching
- Guidance cached by (hazard_type, tier, zone_id)
- Enables offline availability
- Reduces LLM API calls

## Document Format

Documents should have:
- `text`: The document content
- `metadata`: Dict with at least:
  - `hazard_type`: Type of hazard
  - `tier`: Danger tier (Minimal, Warning, Catastrophic)
  - `source`: Document source (FEMA, Red Cross, WHO, etc.)
- `id`: Optional unique identifier

## Supported Hazard Types

- flood
- earthquake
- fire
- landslide
- storm
- tsunami

## Danger Tiers

- **Minimal**: Minor incidents, monitor situation
- **Warning**: Moderate incidents, take protective action
- **Catastrophic**: Severe incidents, immediate action required

## Dependencies

- chromadb
- sentence-transformers
- httpx
- fastapi
- uvicorn
- pydantic

## Expected Performance

Based on simulation:
- Document embedding: ~100ms per document
- Retrieval: ~50ms (vector search)
- LLM generation: ~2-5 seconds (depends on model and hardware)
- Cached retrieval: < 10ms

**Note:** Performance depends on document corpus size and LLM model.

## Offline Availability

Guidance is cached after first generation:
- Cache key: `{hazard_type}_{tier}_{zone_id}`
- Enables offline access to previously generated guidance
- Reduces dependency on LLM availability

## Production Deployment

For production deployment:
1. Ingest full emergency document corpus (FEMA, Red Cross, WHO)
2. Implement document versioning and update pipeline
3. Add monitoring for retrieval quality
4. Implement A/B testing for guidance effectiveness
5. Add feedback loop for guidance improvement
6. Consider fine-tuning LLM on emergency domain
7. Implement proper access controls for document management

## Why RAG Instead of Fine-Tuning?

RAG is preferred because:
- More auditable (can see retrieved context)
- Easier to update (add new documents)
- More correctable (fix bad documents)
- No need for large training dataset
- Grounded in actual guidelines
- Reduces hallucinations

Fine-tuning would be appropriate for:
- Domain-specific language patterns
- Consistent formatting/style
- Very large-scale deployment
