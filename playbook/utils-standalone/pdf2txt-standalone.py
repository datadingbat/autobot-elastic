import pdfplumber
import re
import unicodedata
import uuid
import logging
from typing import List, Dict, Optional
from dataclasses import dataclass

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class ChunkingConfig:
    """Configuration for content chunking"""
    min_chunk_size: int = 100
    max_chunk_size: int = 1000
    min_sentences_per_chunk: int = 2
    overlap_sentences: int = 1

class PDFToTSVConverter:
    def __init__(self, chunking_config: Optional[ChunkingConfig] = None):
        """
        Initialize the PDF to TSV converter with configuration options.
        
        Args:
            chunking_config: Configuration for content chunking
        """
        self.config = chunking_config or ChunkingConfig()
        self._compile_patterns()
        
    def _compile_patterns(self):
        """Compile regex patterns for text processing"""
        # Pattern for finding sentence boundaries
        self.sentence_pattern = re.compile(
            r'(?<!Mr)(?<!Mrs)(?<!Ms)(?<!Dr)(?<!Jr)(?<!Sr)(?<!Prof)'
            r'(?<!\w\.\w)(?<=[.!?])\s+(?=[A-Z])'
        )
        
        # Pattern for multiple whitespace
        self.whitespace_pattern = re.compile(r'\s+')
        
        # Pattern for section breaks
        self.section_break_pattern = re.compile(r'\n\n+')
    
    def clean_text(self, text: str) -> str:
        """
        Clean extracted text while preserving meaningful characters.
        
        Args:
            text: Raw text extracted from PDF
            
        Returns:
            Cleaned text with preserved special characters
        """
        if not text:
            return ""
            
        # Replace various types of whitespace with a single space
        text = self.whitespace_pattern.sub(' ', text)
        
        # Remove control characters while preserving newlines
        text = ''.join(char if unicodedata.category(char)[0] != 'C' 
                      or char in '\n\t' else ' ' 
                      for char in text)
        
        # Remove zero-width spaces and other invisible characters
        text = re.sub(r'[\u200B-\u200D\uFEFF]', '', text)
        
        # Normalize unicode characters
        text = unicodedata.normalize('NFKC', text)
        
        # Remove repeated punctuation
        text = re.sub(r'([!?,.:;])\1+', r'\1', text)
        
        return text.strip()
    
    def split_into_sentences(self, text: str) -> List[str]:
        """Split text into sentences using smart sentence boundary detection."""
        sentences = self.sentence_pattern.split(text)
        return [s.strip() for s in sentences if s.strip()]
    
    def create_meaningful_chunks(self, sentences: List[str]) -> List[str]:
        """
        Create meaningful chunks from sentences, respecting size limits
        and semantic boundaries.
        
        Args:
            sentences: List of sentences to chunk
            
        Returns:
            List of chunks, where each chunk is a coherent group of sentences
        """
        chunks = []
        current_chunk = []
        current_length = 0
        
        for i, sentence in enumerate(sentences):
            sentence_length = len(sentence)
            
            # If adding this sentence would exceed max_chunk_size and we have
            # enough sentences for a chunk, create a new chunk
            if (current_length + sentence_length > self.config.max_chunk_size and 
                len(current_chunk) >= self.config.min_sentences_per_chunk):
                chunks.append(' '.join(current_chunk))
                
                # Start new chunk with overlap
                overlap_start = max(0, len(current_chunk) - self.config.overlap_sentences)
                current_chunk = current_chunk[overlap_start:]
                current_length = sum(len(s) for s in current_chunk)
            
            current_chunk.append(sentence)
            current_length += sentence_length
            
            # If we have enough sentences and hit a good breaking point,
            # consider creating a new chunk
            if (len(current_chunk) >= self.config.min_sentences_per_chunk * 2 and
                current_length >= self.config.min_chunk_size and
                i < len(sentences) - 1 and
                self._is_good_break_point(sentence, sentences[i + 1])):
                
                chunks.append(' '.join(current_chunk))
                
                # Start new chunk with overlap
                overlap_start = max(0, len(current_chunk) - self.config.overlap_sentences)
                current_chunk = current_chunk[overlap_start:]
                current_length = sum(len(s) for s in current_chunk)
        
        # Add any remaining sentences as the last chunk
        if current_chunk:
            chunks.append(' '.join(current_chunk))
        
        return chunks
    
    def _is_good_break_point(self, current_sentence: str, next_sentence: str) -> bool:
        """
        Determine if this is a good point to break the text into chunks.
        
        Args:
            current_sentence: The current sentence
            next_sentence: The next sentence
            
        Returns:
            Boolean indicating if this is a good break point
        """
        # Break if there's a significant topic shift (e.g., different paragraph)
        if current_sentence.endswith('.') and next_sentence.startswith(('However', 'Moreover', 'Furthermore')):
            return True
            
        # Break if the current sentence ends a thought and next starts a new one
        if (current_sentence.endswith('.') and 
            not any(current_sentence.lower().endswith(x) for x in [' etc.', 'e.g.', 'i.e.']) and
            next_sentence[0].isupper()):
            return True
            
        return False
    
    def process_pdf(self, pdf_path: str, output_path: str) -> None:
        """
        Process PDF file and output TSV format with meaningful chunks.
        
        Args:
            pdf_path: Path to the PDF file
            output_path: Path to save the TSV output
        """
        try:
            with pdfplumber.open(pdf_path) as pdf:
                # Extract and clean text from all pages
                all_text = ""
                for page in pdf.pages:
                    page_text = page.extract_text() or ""
                    cleaned_text = self.clean_text(page_text)
                    if cleaned_text:
                        all_text += cleaned_text + "\n\n"
                
                # Split into major sections
                sections = [s.strip() for s in self.section_break_pattern.split(all_text) if s.strip()]
                
                # Process each section into meaningful chunks
                chunks = []
                for section in sections:
                    sentences = self.split_into_sentences(section)
                    section_chunks = self.create_meaningful_chunks(sentences)
                    chunks.extend(section_chunks)
                
                # Write chunks to TSV file
                with open(output_path, 'w', encoding='utf-8') as f:
                    for chunk in chunks:
                        # Generate a unique ID (timestamp-based UUID)
                        chunk_id = str(uuid.uuid1())
                        # Write the chunk with its ID in TSV format
                        f.write(f"{chunk_id}\t{chunk}\n")
                
                logger.info(f"Successfully processed PDF and created {len(chunks)} chunks")
                logger.info(f"Output saved to: {output_path}")
                
        except Exception as e:
            logger.error(f"Error processing PDF {pdf_path}: {str(e)}")
            raise

def main():
    # Example usage
    pdf_path = "ml2.pdf"
    output_path = "output.tsv"
    
    # Initialize converter with custom configuration
    config = ChunkingConfig(
        min_chunk_size=100,
        max_chunk_size=1000,
        min_sentences_per_chunk=2,
        overlap_sentences=1
    )
    
    converter = PDFToTSVConverter(config)
    
    try:
        converter.process_pdf(pdf_path, output_path)
        logger.info("Processing complete")
        
    except Exception as e:
        logger.error(f"Processing failed: {str(e)}")

if __name__ == "__main__":
    main()
