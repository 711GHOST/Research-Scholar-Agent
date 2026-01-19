"""
NLP Processor Service
Natural Language Processing for keyword and topic extraction

Automation: Automates text analysis using NLP techniques
"""

import re
import nltk
from typing import List, Dict, Any
from collections import Counter
import string

# Download required NLTK data
try:
    nltk.download('punkt', quiet=True)
    nltk.download('stopwords', quiet=True)
    nltk.download('averaged_perceptron_tagger', quiet=True)
except:
    pass

from nltk.tokenize import word_tokenize, sent_tokenize
from nltk.corpus import stopwords
from nltk.tag import pos_tag


class NLPProcessor:
    """
    Processes text using NLP techniques
    Extracts keywords, topics, and linguistic features
    """
    
    def __init__(self):
        # Initialize stopwords
        try:
            self.stop_words = set(stopwords.words('english'))
        except:
            self.stop_words = set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'])
        
        # Technical/academic stopwords to ignore
        self.stop_words.update([
            'paper', 'study', 'research', 'method', 'result', 'conclusion',
            'figure', 'table', 'section', 'chapter', 'page', 'et', 'al',
            'also', 'may', 'can', 'would', 'could', 'should'
        ])
    
    def process_text(self, text: str) -> Dict[str, Any]:
        """
        Process text and extract NLP features
        
        Args:
            text: Input text to process
            
        Returns:
            Dictionary with keywords, topics, and other features
        """
        if not text:
            return {
                'keywords': [],
                'topics': [],
                'features': {}
            }
        
        # Extract keywords
        keywords = self._extract_keywords(text)
        
        # Extract topics (simplified - using frequent noun phrases)
        topics = self._extract_topics(text)
        
        return {
            'keywords': keywords,
            'topics': topics,
            'features': {
                'word_count': len(word_tokenize(text)),
                'sentence_count': len(sent_tokenize(text)),
            }
        }
    
    def _extract_keywords(self, text: str, top_n: int = 20) -> List[Dict[str, Any]]:
        """
        Extract keywords from text
        Uses frequency-based extraction with POS tagging
        """
        # Tokenize and tag
        tokens = word_tokenize(text.lower())
        tagged = pos_tag(tokens)
        
        # Filter: keep only nouns, adjectives, and important verbs
        important_tags = ['NN', 'NNS', 'NNP', 'NNPS', 'JJ', 'JJR', 'JJS', 'VBG']
        filtered_words = [
            word for word, tag in tagged
            if tag in important_tags
            and word not in self.stop_words
            and word.isalpha()
            and len(word) > 2
        ]
        
        # Count frequencies
        word_freq = Counter(filtered_words)
        
        # Get top keywords
        top_keywords = word_freq.most_common(top_n)
        
        # Calculate importance score (normalized frequency)
        max_freq = top_keywords[0][1] if top_keywords else 1
        
        keywords = [
            {
                'word': word,
                'frequency': freq,
                'importance': round(freq / max_freq, 3)
            }
            for word, freq in top_keywords
        ]
        
        return keywords
    
    def _extract_topics(self, text: str, top_n: int = 10) -> List[Dict[str, Any]]:
        """
        Extract topics from text
        Simple approach: frequent noun phrases and key terms
        
        In production, this could use topic modeling (LDA, BERTopic)
        """
        # Tokenize sentences
        sentences = sent_tokenize(text)
        
        # Extract noun phrases (simple pattern: adjective + noun)
        topics_list = []
        
        for sentence in sentences:
            tokens = word_tokenize(sentence.lower())
            tagged = pos_tag(tokens)
            
            # Find noun phrases (JJ + NN pattern)
            for i in range(len(tagged) - 1):
                word1, tag1 = tagged[i]
                word2, tag2 = tagged[i + 1]
                
                if tag1 in ['JJ', 'JJR', 'JJS'] and tag2 in ['NN', 'NNS']:
                    phrase = f"{word1} {word2}"
                    if phrase not in self.stop_words and len(phrase) > 3:
                        topics_list.append(phrase)
        
        # Count topic frequencies
        topic_freq = Counter(topics_list)
        top_topics = topic_freq.most_common(top_n)
        
        topics = [
            {
                'topic': topic,
                'confidence': round(min(freq / 5.0, 1.0), 3)  # Normalize confidence
            }
            for topic, freq in top_topics
        ]
        
        return topics
    
    def _extract_entities(self, text: str) -> List[str]:
        """
        Extract named entities (simplified)
        In production, use spaCy NER or similar
        """
        # Simple pattern matching for common entities
        # Capitalized sequences that might be entities
        entities = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', text)
        
        # Filter out common words
        filtered = [
            e for e in entities
            if e not in self.stop_words
            and len(e.split()) <= 4
        ]
        
        return list(set(filtered))[:20]  # Return top 20 unique entities
