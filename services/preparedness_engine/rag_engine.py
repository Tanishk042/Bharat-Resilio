"""
Automated Preparedness/Guidance Engine (RAG)

Implements RAG pipeline for emergency guidance generation:
- Embeds emergency preparedness documents into vector store
- Retrieves relevant chunks based on hazard type and tier
- Generates guidance via local LLM grounded in retrieved chunks
- Caches guidance for offline availability

PRODUCTION_TODO: Use real public-domain emergency documents (FEMA, Red Cross, WHO).
Current implementation uses sample documents for demonstration.
"""

import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
import httpx
import json
from typing import List, Dict, Optional, Tuple
from datetime import datetime
import hashlib


class DocumentStore:
    """Vector store for emergency preparedness documents."""
    
    def __init__(self, collection_name: str = "emergency_guidance"):
        self.client = chromadb.Client(Settings(anonymized_t=True))
        self.collection_name = collection_name
        self.collection = self.client.get_or_create_collection(name=collection_name)
        self.embedder = SentenceTransformer('all-MiniLM-L6-v2')
    
    def add_documents(self, documents: List[Dict]):
        """
        Add documents to the vector store.
        
        Args:
            documents: List of dicts with 'text', 'metadata', 'id' fields
        """
        texts = [doc['text'] for doc in documents]
        metadatas = [doc.get('metadata', {}) for doc in documents]
        ids = [doc.get('id', self._generate_id(doc['text'])) for doc in documents]
        
        embeddings = self.embedder.encode(texts).tolist()
        
        self.collection.add(
            documents=texts,
            metadatas=metadatas,
            ids=ids,
            embeddings=embeddings
        )
        
        print(f"Added {len(documents)} documents to vector store")
    
    def query(
        self,
        query_text: str,
        hazard_type: str,
        tier: str,
        n_results: int = 5
    ) -> List[Dict]:
        """
        Query the vector store for relevant documents.
        
        Args:
            query_text: Query text
            hazard_type: Type of hazard
            tier: Danger tier
            n_results: Number of results to return
            
        Returns:
            List of relevant document chunks
        """
        # Embed query
        query_embedding = self.embedder.encode([query_text]).tolist()
        
        # Query with metadata filter
        results = self.collection.query(
            query_embeddings=query_embedding,
            n_results=n_results,
            where={
                "hazard_type": hazard_type,
                "tier": tier
            }
        )
        
        documents = []
        if results['documents'] and results['documents'][0]:
            for i, doc in enumerate(results['documents'][0]):
                documents.append({
                    'text': doc,
                    'metadata': results['metadatas'][0][i] if results['metadatas'] and results['metadatas'][0] else {},
                    'distance': results['distances'][0][i] if results['distances'] and results['distances'][0] else 0
                })
        
        return documents
    
    def _generate_id(self, text: str) -> str:
        """Generate a unique ID for a document."""
        return hashlib.md5(text.encode()).hexdigest()[:16]
    
    def get_stats(self) -> Dict:
        """Get collection statistics."""
        return {
            'count': self.collection.count(),
            'name': self.collection_name
        }


class GuidanceGenerator:
    """Generates guidance using local LLM with RAG."""
    
    def __init__(self, ollama_host: str = "http://localhost:11434", model_name: str = "llama3:8b"):
        self.ollama_host = ollama_host
        self.model_name = model_name
        self.cache: Dict[str, Dict] = {}
    
    def generate_guidance(
        self,
        hazard_type: str,
        tier: str,
        zone_id: str,
        context_docs: List[Dict]
    ) -> Dict:
        """
        Generate guidance using LLM grounded in retrieved documents.
        
        Args:
            hazard_type: Type of hazard
            tier: Danger tier
            zone_id: Zone identifier
            context_docs: Retrieved document chunks
            
        Returns:
            Generated guidance with metadata
        """
        # Check cache
        cache_key = f"{hazard_type}_{tier}_{zone_id}"
        if cache_key in self.cache:
            print(f"Cache hit for {cache_key}")
            return self.cache[cache_key]
        
        # Build prompt with retrieved context
        context_text = "\n\n".join([
            f"- {doc['text']}" for doc in context_docs
        ])
        
        system_prompt = """You are an emergency preparedness assistant. Generate clear, actionable guidance for the given hazard situation.
Base your response on the provided context from official emergency guidelines.
Keep the response concise (2-3 paragraphs) and focused on immediate actions."""
        
        user_prompt = f"""Hazard Type: {hazard_type}
Danger Tier: {tier}
Zone: {zone_id}

Context from emergency guidelines:
{context_text}

Generate emergency guidance for this situation."""
        
        # Call LLM
        try:
            guidance_text = self._call_ollama(system_prompt, user_prompt)
        except Exception as e:
            print(f"LLM call failed: {e}, using fallback")
            guidance_text = self._fallback_guidance(hazard_type, tier)
        
        result = {
            'hazard_type': hazard_type,
            'tier': tier,
            'zone_id': zone_id,
            'guidance': guidance_text,
            'context_count': len(context_docs),
            'generated_at': datetime.utcnow().isoformat(),
            'cached': False
        }
        
        # Cache the result
        self.cache[cache_key] = result
        
        return result
    
    def _call_ollama(self, system_prompt: str, user_prompt: str) -> str:
        """Call Ollama API for text generation."""
        url = f"{self.ollama_host}/api/generate"
        
        payload = {
            "model": self.model_name,
            "prompt": f"{system_prompt}\n\n{user_prompt}",
            "stream": False,
            "options": {
                "temperature": 0.7,
                "num_predict": 500
            }
        }
        
        with httpx.Client(timeout=60.0) as client:
            response = client.post(url, json=payload)
            response.raise_for_status()
            result = response.json()
            return result.get("response", "")
    
    def _fallback_guidance(self, hazard_type: str, tier: str) -> str:
        """Fallback guidance when LLM is unavailable."""
        fallback_messages = {
            'flood': {
                'Minimal': 'Monitor water levels and prepare to move to higher ground if necessary. Keep emergency supplies accessible.',
                'Warning': 'Evacuate to higher ground immediately. Do not walk or drive through flood waters. Follow local evacuation routes.',
                'Catastrophic': 'Seek immediate shelter on highest ground possible. Emergency services may be delayed - prioritize self-preservation. Signal for help if safe to do so.'
            },
            'earthquake': {
                'Minimal': 'Drop, Cover, and Hold On. Stay away from windows and heavy objects. Check for damage after shaking stops.',
                'Warning': 'Drop, Cover, and Hold On immediately. After shaking, evacuate if building is damaged. Be prepared for aftershocks.',
                'Catastrophic': 'Drop, Cover, and Hold On. If trapped, protect your head and neck. Conserve resources and signal for help only when safe.'
            },
            'fire': {
                'Minimal': 'Evacuate if smoke is present. Close doors behind you to slow fire spread. Meet at designated assembly point.',
                'Warning': 'Evacuate immediately using stairs, not elevators. Stay low to avoid smoke. Alert others if safe to do so.',
                'Catastrophic': 'Evacuate immediately. If escape is impossible, seal doors with wet cloth and signal from window. Stay low to avoid smoke.'
            }
        }
        
        return fallback_messages.get(hazard_type, {}).get(
            tier,
            f'Follow standard emergency procedures for {hazard_type}. Prioritize safety and follow official instructions.'
        )
    
    def clear_cache(self):
        """Clear the guidance cache."""
        self.cache.clear()
    
    def get_cache_stats(self) -> Dict:
        """Get cache statistics."""
        return {
            'size': len(self.cache),
            'keys': list(self.cache.keys())
        }


class PreparednessEngine:
    """Main engine combining RAG and guidance generation."""
    
    def __init__(
        self,
        ollama_host: str = "http://localhost:11434",
        model_name: str = "llama3:8b"
    ):
        self.document_store = DocumentStore()
        self.guidance_generator = GuidanceGenerator(ollama_host, model_name)
    
    def initialize_sample_documents(self):
        """Initialize with sample emergency documents."""
        sample_docs = [
            {
                'id': 'flood_minimal_1',
                'text': 'For minor flooding, monitor water levels closely. Prepare a go-bag with essential supplies including water, food, medications, and important documents. Identify evacuation routes in advance.',
                'metadata': {'hazard_type': 'flood', 'tier': 'Minimal', 'source': 'FEMA'}
            },
            {
                'id': 'flood_warning_1',
                'text': 'For flood warnings, evacuate immediately to higher ground. Never walk or drive through flood waters - just 6 inches of moving water can knock you down. Turn around, don\'t drown.',
                'metadata': {'hazard_type': 'flood', 'tier': 'Warning', 'source': 'FEMA'}
            },
            {
                'id': 'flood_warning_2',
                'text': 'If you are in a vehicle and water rises around it, abandon it immediately and move to higher ground. Vehicles can be swept away in just 2 feet of water.',
                'metadata': {'hazard_type': 'flood', 'tier': 'Warning', 'source': 'Red Cross'}
            },
            {
                'id': 'flood_catastrophic_1',
                'text': 'For catastrophic flooding, seek shelter on the highest ground available. Emergency services may be unable to reach you - prioritize self-preservation. Conserve resources and signal for help only when safe.',
                'metadata': {'hazard_type': 'flood', 'tier': 'Catastrophic', 'source': 'WHO'}
            },
            {
                'id': 'earthquake_minimal_1',
                'text': 'During minor earthquakes, Drop, Cover, and Hold On. Stay away from windows and heavy objects that could fall. After shaking stops, check for damage and injuries.',
                'metadata': {'hazard_type': 'earthquake', 'tier': 'Minimal', 'source': 'FEMA'}
            },
            {
                'id': 'earthquake_warning_1',
                'text': 'During earthquake warnings, Drop, Cover, and Hold On immediately. If you are indoors, stay there. If outdoors, move to an open area away from buildings. After shaking, evacuate if building is damaged.',
                'metadata': {'hazard_type': 'earthquake', 'tier': 'Warning', 'source': 'Red Cross'}
            },
            {
                'id': 'earthquake_catastrophic_1',
                'text': 'During catastrophic earthquakes, protect yourself from falling objects. If trapped, protect your head and neck with your arms. Conserve air and do not shout unless you hear rescuers. Tap on pipes or walls to signal.',
                'metadata': {'hazard_type': 'earthquake', 'tier': 'Catastrophic', 'source': 'WHO'}
            },
            {
                'id': 'fire_minimal_1',
                'text': 'For minor fires, evacuate if smoke is present. Close doors behind you to slow fire spread. Use stairs, not elevators. Meet at your designated assembly point outside.',
                'metadata': {'hazard_type': 'fire', 'tier': 'Minimal', 'source': 'FEMA'}
            },
            {
                'id': 'fire_warning_1',
                'text': 'For fire warnings, evacuate immediately. Stay low to avoid smoke. Test doors with back of hand before opening. If clothes catch fire, stop, drop, and roll.',
                'metadata': {'hazard_type': 'fire', 'tier': 'Warning', 'source': 'Red Cross'}
            },
            {
                'id': 'fire_catastrophic_1',
                'text': 'For catastrophic fires, evacuate immediately. If escape is impossible, seal doors with wet cloth and stay low. Signal from window if possible. Do not break windows - it feeds the fire.',
                'metadata': {'hazard_type': 'fire', 'tier': 'Catastrophic', 'source': 'WHO'}
            }
        ]
        
        self.document_store.add_documents(sample_docs)
    
    def get_guidance(
        self,
        hazard_type: str,
        tier: str,
        zone_id: str = "default"
    ) -> Dict:
        """
        Get guidance for a specific hazard situation.
        
        Args:
            hazard_type: Type of hazard
            tier: Danger tier (Minimal, Warning, Catastrophic)
            zone_id: Zone identifier
            
        Returns:
            Generated guidance with metadata
        """
        # Query for relevant documents
        query_text = f"Emergency guidance for {hazard_type} at {tier} level"
        context_docs = self.document_store.query(query_text, hazard_type, tier, n_results=3)
        
        # Generate guidance
        guidance = self.guidance_generator.generate_guidance(
            hazard_type, tier, zone_id, context_docs
        )
        
        return guidance
    
    def get_stats(self) -> Dict:
        """Get engine statistics."""
        return {
            'document_store': self.document_store.get_stats(),
            'cache': self.guidance_generator.get_cache_stats()
        }


if __name__ == "__main__":
    # Test preparedness engine
    print("Testing Preparedness Engine\n")
    
    engine = PreparednessEngine()
    
    # Initialize sample documents
    print("1. Initializing sample documents...")
    engine.initialize_sample_documents()
    
    # Test guidance generation
    print("\n2. Generating guidance for flood warning...")
    guidance = engine.get_guidance("flood", "Warning", "Zone A")
    print(f"Guidance: {guidance['guidance']}")
    print(f"Context count: {guidance['context_count']}")
    
    print("\n3. Generating guidance for earthquake catastrophic...")
    guidance = engine.get_guidance("earthquake", "Catastrophic", "Zone B")
    print(f"Guidance: {guidance['guidance']}")
    
    print("\n4. Testing cache (same request)...")
    guidance = engine.get_guidance("flood", "Warning", "Zone A")
    print(f"Cached: {guidance['cached']}")
    
    print("\n5. Statistics:")
    stats = engine.get_stats()
    print(f"Document count: {stats['document_store']['count']}")
    print(f"Cache size: {stats['cache']['size']}")
    
    print("\nAll tests completed!")
